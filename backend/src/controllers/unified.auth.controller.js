import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import transporter from '../config/mailer.js';

// Default permissions for Customers
const DEFAULT_CUSTOMER_PERMISSIONS = [
    'menu.view',
    'orders.place',
    'payments.make',
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
        const { name, full_name, email, password, role = 'CUSTOMER', phone, jobRole } = req.body;
        const finalName = name || full_name;

        if (!finalName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const normalizedRole = role.toUpperCase();
        // jobRole might be passed as 'role' from some frontends
        let staffRoleName = (jobRole || role).toLowerCase();
        
        // If the role passed is a specific staff role, normalizedRole should be STAFF
        const isStaffRole = ROLE_TABLE_MAP.hasOwnProperty(staffRoleName);
        const effectiveUserType = (normalizedRole === 'ADMIN' || normalizedRole === 'STAFF' || isStaffRole) ? 'STAFF' : 'CUSTOMER';
        
        if (normalizedRole === 'ADMIN') staffRoleName = 'admin';

        const [exCust] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
        const [exStaff] = await pool.query('SELECT id FROM staff_users WHERE email = ?', [email]);

        if (exCust.length > 0 || exStaff.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);

        if (effectiveUserType === 'STAFF') {
            // Find correct role_id from staff_roles table
            const [roleRows] = await connection.query('SELECT id FROM staff_roles WHERE role_name = ?', [staffRoleName]);
            const roleId = roleRows.length > 0 ? roleRows[0].id : (normalizedRole === 'ADMIN' ? 1 : 4); // Default to steward (4) if not found

            const [result] = await connection.query(
                'INSERT INTO staff_users (full_name, email, phone, password, role_id, is_active, permissions) VALUES (?, ?, ?, ?, ?, 0, ?)',
                [finalName, email, phone || null, hashedPassword, roleId, JSON.stringify([])]
            );
            const newId = result.insertId;

            // Insert into role-specific table if it's not the master admin
            const roleTable = ROLE_TABLE_MAP[staffRoleName];
            if (roleTable) {
                await connection.query(`INSERT INTO ${roleTable} (staff_id) VALUES (?)`, [newId]);
            }

            await connection.commit();

            return res.status(201).json({
                message: `Registration as ${staffRoleName} successful. Wait for admin activation.`,
                userId: newId,
                role: normalizedRole === 'ADMIN' ? 'ADMIN' : 'STAFF',
                jobRole: staffRoleName
            });
        } else {
            const [result] = await connection.query(
                'INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
                [finalName, email, phone || null, hashedPassword]
            );
            const newId = result.insertId;

            try {
                const permissionValues = DEFAULT_CUSTOMER_PERMISSIONS.map(key => [newId, key, true]);
                await connection.query(
                    'INSERT INTO customer_permissions (customer_id, permission_key, allowed) VALUES ?',
                    [permissionValues]
                );
            } catch (permErr) {
                console.warn('Failed to assign permissions:', permErr.message);
            }

            await connection.commit();

            return res.status(201).json({
                message: 'Registration successful',
                userId: newId,
                role: 'CUSTOMER'
            });
        }
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
        let passwordField = 'password_hash';

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
            const [cust] = await pool.query('SELECT * FROM customers WHERE email = ?', [loginEmail]);
            if (cust.length > 0) {
                user = cust[0];
                role = 'CUSTOMER';
                passwordField = 'password_hash';
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user[passwordField]);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

        // Check status (is_active for both now)
        if (user.is_active === 0) {
            return res.status(403).json({ message: 'Account is not active.' });
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
            const [rows] = await pool.query('SELECT id, name, email, phone, loyalty_points, created_at FROM customers WHERE id = ?', [userId]);
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

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        // Check if user exists in customers or staff_users
        let targetTable = null;
        const [cust] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
        if (cust.length > 0) {
            targetTable = 'customers';
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

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@restaurant.com',
            to: email,
            subject: 'Your Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #D4AF37; text-align: center;">Melissa's Food Court</h2>
                    <p>Hello,</p>
                    <p>You requested to reset your password. Please use the following One Time Password (OTP) to proceed:</p>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP will expire in 15 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Melissa's Food Court. All rights reserved.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'OTP sent to your email successfully.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        // Check customers
        let [userRows] = await pool.query(
            'SELECT id, reset_otp, reset_otp_expiry FROM customers WHERE email = ?',
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
        let passwordField = 'password_hash';

        let [rows] = await pool.query('SELECT id, reset_otp, reset_otp_expiry FROM customers WHERE email = ?', [email]);
        if (rows.length > 0) {
            targetTable = 'customers';
            passwordField = 'password_hash';
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
