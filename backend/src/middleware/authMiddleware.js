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
    // Standardize roles in DB: admin, manager, cashier, steward, kitchen_staff, bar_staff, delivery_rider, inventory_manager, supplier
    const staffRoles = [
        'ADMIN', 'MANAGER', 'CASHIER', 'STEWARD', 
        'KITCHEN_STAFF', 'BAR_STAFF', 'DELIVERY_RIDER', 
        'INVENTORY_MANAGER', 'SUPPLIER'
    ];
    
    const userRole = (req.user?.role || '').toUpperCase();
    
    if (req.user && staffRoles.includes(userRole)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized: Staff access only' });
    }
};

/**
 * decodes token if exists, but does not enforce authentication
 */
export const resolveUser = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = decoded;
        } catch (error) {
            console.warn('Optional token verification failed:', error.message);
        }
    }
    next();
};
