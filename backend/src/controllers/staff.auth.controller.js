import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

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

/**
 * Register a new staff member.
 * 1. Inserts into staff_users (master table)
 * 2. Looks up role_id from staff_roles
 * 3. Inserts into the role-specific table (managers, cashiers, etc.)
 */
export const registerStaff = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { full_name, email, phone, password, role } = req.body;

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
                message: `Invalid role: "${role}". Valid roles: manager, cashier, steward, kitchen_staff, bar_staff, delivery_rider`
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

        const [staffResult] = await connection.query(
            `INSERT INTO staff_users (full_name, email, phone, password, role_id, is_active, permissions)
             VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [full_name, email, phone || null, hashedPassword, roleId, defaultPermissions]
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
             WHERE su.email = ?`,
            [loginId]
        );

        if (staffRows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = staffRows[0];

        // Check if account is active
        if (user.is_active === 0) {
            return res.status(403).json({
                message: 'Wait for admin to activate your account.',
                code: 'ACCOUNT_INACTIVE'
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

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.full_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role_name.toUpperCase(),
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
            `SELECT su.id, su.full_name, su.email, su.phone, su.is_active, su.created_at,
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
