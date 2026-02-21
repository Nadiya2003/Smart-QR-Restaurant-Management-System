import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Optional: Verify token exists in active sessions if strict session management is required
        // const [sessions] = await db.query('SELECT * FROM customer_sessions WHERE token = ? AND customer_id = ?', [token, req.user.id]);
        // if (sessions.length === 0) return res.status(403).json({ message: 'Invalid session.' });

        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token.' });
    }
};
