import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import transporter from '../config/mailer.js';

// Default permissions for Customers
const DEFAULT_CUSTOMER_PERMISSIONS = [
    'menu.view',
    'orders.place',
    'payments.make',
    'orders.view',
    'orders.view_status',
    'stewards.rate',
    'account.manage'
];

// Role name to table name mapping
const ROLE_TABLE_MAP = {
    'manager': 'managers',
    'cashier': 'cashiers',
    'steward': 'stewards',
    'kitchen_staff': 'kitchen_staff',
    'bar_staff': 'bar_staff',
    'delivery_rider': 'delivery_riders',
    'inventory_manager': 'inventory_managers',
    'supplier': 'supplier_staff',
};

export const register = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { name, full_name, email, password, phone, profile_image } = req.body;
        const finalName = name || full_name;

        if (!finalName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const [exCust] = await pool.query('SELECT id FROM online_customers WHERE email = ?', [email]);
        const [exStaff] = await pool.query('SELECT id FROM staff_users WHERE email = ?', [email]);

        if (exCust.length > 0 || exStaff.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Handle profile image: upload > text input > default
        let finalProfileImage = '/assets/default-customer-avatar.png';
        if (req.file) {
            finalProfileImage = `/uploads/profile-images/${req.file.filename}`;
        } else if (profile_image) {
            finalProfileImage = profile_image;
        }

        const [result] = await connection.query(
            'INSERT INTO online_customers (name, email, phone, password, profile_image, loyalty_points, is_active) VALUES (?, ?, ?, ?, ?, 0, 1)',
            [finalName, email, phone || null, hashedPassword, finalProfileImage]
        );
        const newId = result.insertId;

        let permissions = [];
        try {
            const permissionValues = DEFAULT_CUSTOMER_PERMISSIONS.map(key => [newId, key, true]);
            await connection.query(
                'INSERT INTO customer_permissions (customer_id, permission_key, allowed) VALUES ?',
                [permissionValues]
            );
            permissions = DEFAULT_CUSTOMER_PERMISSIONS;
        } catch (permErr) {
            console.warn('Failed to assign permissions:', permErr.message);
        }

        await connection.commit();

        // Auto-login: generate JWT immediately after registration
        const token = jwt.sign(
            { userId: newId, role: 'CUSTOMER' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: newId,
                name: finalName,
                email: email,
                phone: phone || '',
                role: 'CUSTOMER',
                profile_image: finalProfileImage,
                loyalty_points: 0,
                permissions
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};


export const login = async (req, res) => {
    try {
        const { username, email, password, portal } = req.body;
        const loginEmail = email || username;

        // 1. ADMIN HARDCODED AUTH
        if ((username === 'Nadeesha' || email === 'Nadeesha') && password === 'Nmk@6604') {
            const token = jwt.sign({ userId: 0, role: 'ADMIN' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
            return res.json({ message: 'Admin Login Successful', token, user: { name: 'Nadeesha', role: 'ADMIN' } });
        }

        if (!loginEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        let user = null;
        let role = null;
        let passwordField = 'password';

        // Check Staff (JOIN staff_roles for 3NF)
        if (portal === 'STAFF' || portal === 'ADMIN' || !portal) {
            const [staff] = await pool.query(
                `SELECT su.*, sr.role_name
                 FROM staff_users su
                 JOIN staff_roles sr ON su.role_id = sr.id
                 WHERE su.email = ?`,
                [loginEmail]
            );

            if (staff.length > 0) {
                user = staff[0];
                role = user.role_name.toUpperCase();
                passwordField = 'password';
            }
        }

        // Check Customer
        if (!user && (portal === 'CUSTOMER' || !portal)) {
            const [cust] = await pool.query('SELECT * FROM online_customers WHERE email = ?', [loginEmail]);
            if (cust.length > 0) {
                user = cust[0];
                role = 'CUSTOMER';
                passwordField = 'password';
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user[passwordField]);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

        // Check status (is_active for both now)
        if (user.is_active === 0) {
            return res.status(403).json({ 
                message: 'Waiting for Admin Permission. Please contact the administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        const token = jwt.sign({ userId: user.id, role: role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

        // Permissions
        let permissions = [];
        try {
            if (role === 'CUSTOMER') {
                const [perms] = await pool.query('SELECT permission_key FROM customer_permissions WHERE customer_id = ? AND allowed = 1', [user.id]);
                permissions = perms.map(p => p.permission_key);
            } else {
                try {
                    permissions = JSON.parse(user.permissions || '[]');
                } catch (e) {
                    permissions = [];
                }
            }
        } catch (e) { }

        res.json({
            message: 'Login successful',
            token,
            user: {
                ...user,
                name: user.name || user.full_name,
                role,
                status: user.status,
                is_active: user.is_active,
                permissions
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role === 'ADMIN' && userId === 0) return res.json({ user: { id: 0, name: 'Nadeesha', role: 'ADMIN' } });

        let user = null;
        if (role === 'CUSTOMER') {
            const [rows] = await pool.query('SELECT id, name, email, phone, profile_image, loyalty_points, created_at FROM online_customers WHERE id = ?', [userId]);
            if (rows.length > 0) user = rows[0];
        } else {
            const [rows] = await pool.query(`
                SELECT su.id, su.full_name as name, su.email, sr.role_name as role, su.is_active, su.created_at
                FROM staff_users su
                JOIN staff_roles sr ON su.role_id = sr.id
                WHERE su.id = ?`,
                [userId]
            );
            if (rows.length > 0) {
                user = rows[0];
                user.role = rows[0].role.toUpperCase();
            }
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { name, email, phone } = req.body;

        if (role === 'ADMIN' && userId === 0) {
            return res.status(403).json({ message: 'Admin profile cannot be updated via this endpoint' });
        }

        let table = role === 'CUSTOMER' ? 'online_customers' : 'staff_users';
        let nameField = role === 'CUSTOMER' ? 'name' : 'full_name';

        // Check if email already exists for another user
        const [existing] = await pool.query(`SELECT id FROM ${table} WHERE email = ? AND id != ?`, [email, userId]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email is already in use by another account' });
        }

        await pool.query(
            `UPDATE ${table} SET ${nameField} = ?, email = ?, phone = ? WHERE id = ?`,
            [name, email, phone || null, userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (role === 'ADMIN' && userId === 0) {
            return res.status(403).json({ message: 'Admin password cannot be changed via this endpoint' });
        }

        let table = role === 'CUSTOMER' ? 'online_customers' : 'staff_users';

        // Get current password
        const [rows] = await pool.query(`SELECT password FROM ${table} WHERE id = ?`, [userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        // Hash and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashedPassword, userId]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        // Check if user exists in customers or staff_users
        let targetTable = null;
        const [cust] = await pool.query('SELECT id FROM online_customers WHERE email = ?', [email]);
        if (cust.length > 0) {
            targetTable = 'online_customers';
        } else {
            const [staff] = await pool.query('SELECT id FROM staff_users WHERE email = ?', [email]);
            if (staff.length > 0) targetTable = 'staff_users';
        }

        if (!targetTable) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

        // Save OTP to database
        await pool.query(
            `UPDATE ${targetTable} SET reset_otp = ?, reset_otp_expiry = ? WHERE email = ?`,
            [otp, expiry, email]
        );

        // For development/testing: Print to console
        console.log(`\n=========================================`);
        console.log(`🔑 PASSWORD RESET OTP FOR: ${email}`);
        console.log(`👉 CODE: ${otp}`);
        console.log(`=========================================\n`);

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Melissa Restaurant" <noreply@restaurant.com>',
            to: email,
            subject: 'Security: Your Password Reset OTP',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="background-color: #000; padding: 30px; text-align: center;">
                        <h1 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">MELISSA RESTAURANT</h1>
                    </div>
                    <div style="padding: 40px; background-color: #fff; color: #333; line-height: 1.6;">
                        <h2 style="color: #333; margin-top: 0; text-align: center;">Reset Your Password</h2>
                        <p>Hello,</p>
                        <p>We received a request to reset the password for your account. Please use the verification code below to proceed:</p>
                        
                        <div style="background-color: #fcf8e3; border: 1px dashed #D4AF37; padding: 25px; text-align: center; margin: 30px 0; border-radius: 12px;">
                            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #000;">${otp}</span>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; text-align: center;">
                            This code is valid for <strong>15 minutes</strong>. <br>
                            If you did not request this change, please ignore this email or contact support.
                        </p>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
                        <p style="margin: 0;">Melissa's Food Court & Security Team</p>
                        <p style="margin: 5px 0;">This is an automated message, please do not reply.</p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ message: 'OTP sent to your email successfully.' });
        } catch (mailError) {
            console.error('Email Dispatch Error:', mailError.message);
            // If email fails but we've logged it to console, we can still tell the user it's processed (in dev)
            // or provide a more specific error.
            if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your-email')) {
                return res.json({ 
                    message: 'OTP generated (Email delivery skipped/failed). Use the code from server console.',
                    dev_hint: 'Check terminal for the OTP code.'
                });
            }
            throw mailError; // Re-throw to be caught by the outer catch if in production
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to process request. Please check server logs.' });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        // Check customers
        let [userRows] = await pool.query(
            'SELECT id, reset_otp, reset_otp_expiry FROM online_customers WHERE email = ?',
            [email]
        );

        // If not found, check staff
        if (userRows.length === 0) {
            [userRows] = await pool.query(
                'SELECT id, reset_otp, reset_otp_expiry FROM staff_users WHERE email = ?',
                [email]
            );
        }

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userRows[0];

        if (user.reset_otp !== otp) {
            return res.status(401).json({ message: 'Invalid OTP' });
        }

        if (new Date(user.reset_otp_expiry) < new Date()) {
            return res.status(401).json({ message: 'OTP has expired' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Failed to verify OTP' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Identify table and user
        let targetTable = null;
        // BUG FIX: Correct initial value is 'password', not 'password_hash' - both tables use 'password' column
        let passwordField = 'password';

        let [rows] = await pool.query('SELECT id, reset_otp, reset_otp_expiry FROM online_customers WHERE email = ?', [email]);
        if (rows.length > 0) {
            targetTable = 'online_customers';
            passwordField = 'password';
        } else {
            [rows] = await pool.query('SELECT id, reset_otp, reset_otp_expiry FROM staff_users WHERE email = ?', [email]);
            if (rows.length > 0) {
                targetTable = 'staff_users';
                passwordField = 'password';
            }
        }

        if (!targetTable || rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = rows[0];

        // Verify OTP again for security
        if (user.reset_otp !== otp || new Date(user.reset_otp_expiry) < new Date()) {
            return res.status(401).json({ message: 'Invalid or expired OTP' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear OTP
        await pool.query(
            `UPDATE ${targetTable} SET ${passwordField} = ?, reset_otp = NULL, reset_otp_expiry = NULL WHERE email = ?`,
            [hashedPassword, email]
        );

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
};
