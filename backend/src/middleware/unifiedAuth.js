import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Handle Hardcoded Admin
        if (decoded.userId === 0 && (decoded.role === 'ADMIN' || decoded.role === 'admin')) {
            req.user = {
                userId: 0,
                name: 'Admin',
                email: 'admin@restaurant.com',
                role: 'ADMIN'
            };
            return next();
        }

        let user;
        const role = decoded.role ? decoded.role.toUpperCase() : 'CUSTOMER';

        if (role === 'CUSTOMER') {
            const [rows] = await pool.query(
                'SELECT id, name, email FROM online_customers WHERE id = ?',
                [decoded.userId]
            );
            if (rows.length === 0) {
                return res.status(401).json({ message: 'Invalid token' });
            }
            user = { ...rows[0], role: 'CUSTOMER' };
        } else {
            // Staff
            const [rows] = await pool.query(
                `SELECT su.id, su.full_name as name, su.email, sr.role_name as role 
                 FROM staff_users su 
                 JOIN staff_roles sr ON su.role_id = sr.id 
                 WHERE su.id = ?`,
                [decoded.userId]
            );
            
            if (rows.length === 0) {
                return res.status(401).json({ message: 'Invalid token' });
            }
            user = { ...rows[0], role: (rows[0].role || role).toUpperCase() };
        }

        req.user = {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

export const customerOnly = requireRole('customer');
export const staffOnly = requireRole('staff');
export const anyAuthenticated = requireRole('customer', 'staff');
