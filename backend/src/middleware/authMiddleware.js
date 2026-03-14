import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

export const isStaff = (req, res, next) => {
    const staffRoles = ['ADMIN', 'admin', 'MANAGER', 'manager', 'CASHIER', 'cashier', 'STEWARD', 'steward'];
    if (req.user && staffRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized: Staff access only' });
    }
};
