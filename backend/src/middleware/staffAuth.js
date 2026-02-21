import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const authenticateStaff = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        const [staff] = await pool.query(
            `SELECT su.*, sr.role_name
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             WHERE su.id = ?`,
            [decoded.userId || decoded.staffId]
        );

        if (staff.length === 0) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Check if staff account is active
        if (!staff[0].is_active) {
            return res.status(403).json({
                message: 'Your account is not active yet. Please wait for admin approval.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        req.staff = {
            id: staff[0].id,
            role: staff[0].role_name.toUpperCase(),
            subRole: staff[0].role_name,   // role_name from staff_roles acts as sub_role
            roleId: staff[0].role_id,
            fullName: staff[0].full_name,
            email: staff[0].email
        };

        next();
    } catch (error) {
        console.error('Staff auth error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.staff) return res.status(401).json({ message: 'Unauthorized' });

        // ADMIN always allowed
        if (req.staff.role === 'ADMIN') return next();

        if (!allowedRoles.includes(req.staff.subRole)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

export const managerOnly = requireRole('manager');
export const cashierOnly = requireRole('cashier');
export const stewardOnly = requireRole('steward');
export const deliveryRiderOnly = requireRole('rider', 'delivery_rider');
export const inventoryManagerOnly = requireRole('inventory_manager');
export const supplierOnly = requireRole('supplier');
export const kitchenStaffOnly = requireRole('kitchen_staff');
export const barStaffOnly = requireRole('bar_staff');

export const managerOrCashier = requireRole('manager', 'cashier');
export const kitchenOrBar = requireRole('kitchen_staff', 'bar_staff');
