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

        const [users] = await pool.query(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = {
            userId: users[0].id,
            name: users[0].name,
            email: users[0].email,
            role: users[0].role,
            staffRole: decoded.staffRole
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
