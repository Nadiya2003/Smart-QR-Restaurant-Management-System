import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import transporter from '../config/mailer.js';
import { getPermissionsForRole } from '../utils/staffPermissions.js';

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

export const verifyStaffEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

        const [users] = await pool.query(
            'SELECT id FROM staff_users WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()',
            [email, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        await pool.query(
            'UPDATE staff_users SET is_verified = 1, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = ?',
            [users[0].id]
        );

        res.json({ message: 'Staff email verified successfully. Please wait for admin approval.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const sendVerificationEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Staff Account Email - Smart QR Restaurant',
        html: `
            <h1>Hello!</h1>
            <p>Your staff verification code is: <strong>${otp}</strong></p>
            <p>Please enter this code in the app to verify your identity.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Staff verification email failed:', error);
        return false;
    }
};

/**
 * Register a new staff member.
 * 1. Inserts into staff_users (master table)
 * 2. Looks up role_id from staff_roles
 * 3. Inserts into the role-specific table (managers, cashiers, etc.)
 */
export const registerStaff = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { full_name, email, phone, password, role, profile_image, bank_name, account_number, account_name } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ message: 'Full name, email, password, and role are required' });
        }

        const roleLower = role.toLowerCase();

        // Validate role exists in staff_roles
        const [roleRows] = await connection.query(
            'SELECT id FROM staff_roles WHERE role_name = ?',
            [roleLower]
        );

        if (roleRows.length === 0) {
            return res.status(400).json({
                message: `Invalid role: "${role}". Valid roles: manager, cashier, steward, kitchen_staff, bar_staff, delivery_rider, inventory_manager, supplier`
            });
        }

        const roleId = roleRows[0].id;

        // Check if email already exists
        const [existingStaff] = await connection.query(
            'SELECT id FROM staff_users WHERE email = ?',
            [email]
        );
        if (existingStaff.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        await connection.beginTransaction();

        // 1. Hash password and insert into staff_users
        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultPermissions = JSON.stringify([]);

        // Handle profile image
        let finalProfileImage = '/assets/default-staff-avatar.png';
        if (req.file) {
            finalProfileImage = `/uploads/profile-images/${req.file.filename}`;
        } else if (profile_image) {
            finalProfileImage = profile_image;
        }

        const [staffResult] = await connection.query(
            `INSERT INTO staff_users (full_name, email, phone, profile_image, password, role_id, status, permissions, bank_name, account_number, account_name, is_verified)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 1)`,
            [full_name, email, phone || null, finalProfileImage, hashedPassword, roleId, defaultPermissions, bank_name || null, account_number || null, account_name || null]
        );

        const staffId = staffResult.insertId;

        // 2. Insert into role-specific table
        const roleTable = ROLE_TABLE_MAP[roleLower];
        if (roleTable) {
            await connection.query(
                `INSERT INTO ${roleTable} (staff_id) VALUES (?)`,
                [staffId]
            );
        }
        await connection.commit();

        res.status(201).json({
            message: 'Registration successful. Wait for admin to activate your account.',
            user: {
                id: staffId,
                full_name,
                email,
                role: roleLower,
                is_active: 0
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Staff registration error:', error);
        res.status(500).json({ message: 'Registration failed: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Login staff member.
 * Hardcoded admin check first, then DB lookup.
 */
export const loginStaff = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginId = email || username;

        // 1. ADMIN HARDCODED AUTH
        if ((username === 'Nadeesha' || email === 'Nadeesha' || loginId === 'Nadeesha') && password === 'Nmk@6604') {
            const token = jwt.sign({ userId: 0, role: 'ADMIN' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
            return res.json({
                message: 'Admin Login Successful',
                token,
                user: { id: 0, name: 'Nadeesha', role: 'ADMIN', permissions: [] }
            });
        }

        // 2. DB lookup - join with staff_roles to get role name
        const [staffRows] = await pool.query(
            `SELECT su.*, sr.role_name
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             WHERE su.email = ? OR su.full_name = ?`,
            [loginId, loginId]
        );

        if (staffRows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = staffRows[0];
        const userRole = user.role_name.toLowerCase();

        // 3. Device Restriction check (Staff can only access from mobile)
        const { deviceType } = req.body; // 'mobile' or 'desktop'
        
        if (userRole !== 'admin' && deviceType === 'desktop') {
            return res.status(403).json({
                message: 'Staff accounts can only access the system from mobile devices. Please login using a mobile phone.',
                code: 'MOBILE_ONLY'
            });
        }

        // Check if account is active
        if (user.status !== 'active') {
            const statusMsg = user.status === 'pending' 
                ? 'Wait for admin to activate your account.' 
                : 'Your account has been disabled. Please contact admin.';
            
            return res.status(403).json({
                message: statusMsg,
                code: `ACCOUNT_${user.status.toUpperCase()}`
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Parse permissions
        let permissions = [];
        try {
            permissions = JSON.parse(user.permissions || '[]');
        } catch (e) {
            permissions = user.permissions ? [user.permissions] : [];
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role_name.toUpperCase() },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Record Attendance (Login)
        try {
            // Use DB-native CURDATE() to ensure it matches later checks
            const [atRows] = await pool.query(
                "SELECT id FROM staff_attendance WHERE staff_id = ? AND date = CURDATE()",
                [user.id]
            );
            if (atRows.length === 0) {
                await pool.query(
                    "INSERT INTO staff_attendance (staff_id, name, role, date, check_in_time, status) VALUES (?, ?, ?, CURDATE(), NOW(), 'PRESENT')",
                    [user.id, user.full_name, user.role_name]
                );
            }
        } catch (attErr) {
            console.error("Attendance login record error:", attErr.message);
        }


        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.full_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role_name.toUpperCase(),
                status: user.status,
                is_active: user.is_active,
                profile_image: user.profile_image,
                bank_name: user.bank_name,
                account_number: user.account_number,
                account_name: user.account_name,
                permissions
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

/**
 * Get staff profile with role-specific data
 */
export const getStaffProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Admin hardcoded
        if (userId === 0) {
            return res.json({ staff: { id: 0, full_name: 'Nadeesha', role: 'ADMIN' } });
        }

        const [staff] = await pool.query(
            `SELECT su.id, su.full_name, su.email, su.phone, su.profile_image, su.is_active, su.created_at,
                    su.bank_name, su.account_number, su.account_name,
                    sr.role_name as role
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             WHERE su.id = ?`,
            [userId]
        );

        if (staff.length === 0) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        res.json({ staff: staff[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

/**
 * Get all staff roles from the staff_roles table
 */
export const getAllRoles = async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT id, role_name, description FROM staff_roles ORDER BY id');
        res.json({ roles });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
};

/**
 * Get team/colleagues - fetches all staff with role info
 */
export const getColleagues = async (req, res) => {
    try {
        const [staff] = await pool.query(
            `SELECT su.id, su.full_name, su.email, su.phone, su.is_active, su.created_at,
                    sr.role_name as role
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             ORDER BY su.full_name ASC`
        );
        res.json({ staff });
    } catch (error) {
        console.error('Get colleagues error:', error);
        res.status(500).json({ message: 'Failed to fetch team' });
    }
};

export const forgotPassword = async (req, res) => {
    res.status(501).json({ message: 'Please use unified forgot password' });
};

export const verifyOTP = async (req, res) => {
    res.status(501).json({ message: 'Please use unified verify OTP' });
};

export const resetPassword = async (req, res) => {
    res.status(501).json({ message: 'Please use unified reset password' });
};
export const logoutStaff = async (req, res) => {
    try {
        const userId = req.user.userId;

        await pool.query(
            "UPDATE staff_attendance SET check_out_time = NOW() WHERE staff_id = ? AND date = CURDATE() AND check_out_time IS NULL",
            [userId]
        );

        // Also set steward as off-duty if they are a steward
        await pool.query("UPDATE stewards SET is_available = 0 WHERE staff_id = ?", [userId]);

        res.json({ message: 'Logout successful and attendance updated' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout processing failed' });
    }
};

/**
 * Update staff profile details (name, email, phone, image)
 */
export const updateStaffProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { full_name, email, phone, bank_name, account_number, account_name } = req.body;

        if (userId === 0) {
            return res.status(403).json({ message: 'Hardcoded admin account cannot be updated in database. Please register a proper admin account.' });
        }

        let updateFields = [];
        let queryParams = [];

        if (full_name) {
            updateFields.push('full_name = ?');
            queryParams.push(full_name);
        }
        if (email) {
            // Check email uniqueness if changing
            const [existing] = await pool.query('SELECT id FROM staff_users WHERE email = ? AND id != ?', [email, userId]);
            if (existing.length > 0) {
                return res.status(400).json({ message: 'Email already in use by another account' });
            }
            updateFields.push('email = ?');
            queryParams.push(email);
        }
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            queryParams.push(phone || null);
        }
        if (req.file) {
            const profileImage = `/uploads/profile-images/${req.file.filename}`;
            updateFields.push('profile_image = ?');
            queryParams.push(profileImage);
        }
        if (bank_name !== undefined) {
            updateFields.push('bank_name = ?');
            queryParams.push(bank_name || null);
        }
        if (account_number !== undefined) {
            updateFields.push('account_number = ?');
            queryParams.push(account_number || null);
        }
        if (account_name !== undefined) {
            updateFields.push('account_name = ?');
            queryParams.push(account_name || null);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update' });
        }

        queryParams.push(userId);
        
        await pool.query(
            `UPDATE staff_users SET ${updateFields.join(', ')} WHERE id = ?`,
            queryParams
        );

        // Fetch updated profile
        const [updated] = await pool.query(
            `SELECT su.id, su.full_name, su.email, su.phone, su.profile_image, 
                    su.bank_name, su.account_number, su.account_name,
                    sr.role_name as role
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             WHERE su.id = ?`,
            [userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: updated[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile: ' + error.message });
    }
};
