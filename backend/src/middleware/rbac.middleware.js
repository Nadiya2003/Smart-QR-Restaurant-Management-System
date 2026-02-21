/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides comprehensive authorization checks for staff and admin users
 */

import pool from '../config/db.js';

/**
 * Middleware to ensure staff account is active
 * Use this for any staff-protected routes that require an active account
 */
export const requireActiveStaff = async (req, res, next) => {
    try {
        // Check if staff/user object exists (should be set by auth middleware)
        const userId = req.staff?.id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Verify staff status from database
        const [staff] = await pool.query(
            `SELECT su.id, su.is_active, sr.role_name as role
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             WHERE su.id = ?`,
            [userId]
        );

        if (staff.length === 0) {
            return res.status(401).json({
                message: 'Staff account not found',
                code: 'STAFF_NOT_FOUND'
            });
        }

        // Check if account is active
        if (!staff[0].is_active) {
            return res.status(403).json({
                message: 'Your account is not active yet. Please wait for admin approval.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Add staff info to request if not already there
        if (!req.staff) {
            req.staff = {
                id: staff[0].id,
                role: staff[0].role,
                isActive: staff[0].is_active
            };
        }

        next();
    } catch (error) {
        console.error('Active staff check error:', error);
        return res.status(500).json({
            message: 'Error verifying staff status',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Middleware to ensure user has admin role
 */
export const requireAdmin = (req, res, next) => {
    const userRole = req.staff?.role || req.user?.role;

    if (userRole !== 'ADMIN') {
        return res.status(403).json({
            message: 'Access denied. Admin privileges required.',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
};

/**
 * Middleware to check for specific staff sub-roles
 * @param {...string} allowedRoles - List of allowed sub-roles
 */
export const requireStaffRole = (...allowedRoles) => {
    return (req, res, next) => {
        const subRole = req.staff?.subRole || req.staff?.sub_role;
        const mainRole = req.staff?.role || req.user?.role;

        // Admin always has access
        if (mainRole === 'ADMIN') {
            return next();
        }

        // Check if staff has required sub-role
        if (!allowedRoles.includes(subRole)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${allowedRoles.join(', ')}`,
                code: 'INSUFFICIENT_ROLE'
            });
        }

        next();
    };
};

/**
 * Combined middleware: Ensures staff is authenticated, active, and has admin role
 */
export const requireActiveAdmin = [requireActiveStaff, requireAdmin];

/**
 * Log access attempts for auditing
 * Use this for sensitive operations
 */
export const logAccess = (actionType) => {
    return async (req, res, next) => {
        try {
            const userId = req.staff?.id || req.user?.userId;
            const route = req.originalUrl;
            const method = req.method;

            console.log(`[AUDIT] ${actionType} - User: ${userId}, Route: ${method} ${route}, IP: ${req.ip}`);

            // Optionally, store in database for permanent audit trail
            // You can uncomment this if you want to log all access attempts
            /*
            await pool.query(
                'INSERT INTO audit_logs (action_type, target_user_id, performed_by, details, ip_address) VALUES (?, ?, ?, ?, ?)',
                [actionType || 'ACCESS', userId, userId, `${method} ${route}`, req.ip]
            );
            */

            next();
        } catch (error) {
            console.error('Access logging error:', error);
            // Don't block the request if logging fails
            next();
        }
    };
};

/**
 * Prevent staff from modifying their own account status (admin only)
 */
export const preventSelfModification = (req, res, next) => {
    const performingUserId = req.staff?.id || req.user?.userId;
    const targetUserId = parseInt(req.params.id);

    if (performingUserId === targetUserId) {
        return res.status(403).json({
            message: 'You cannot modify your own account status',
            code: 'SELF_MODIFICATION_DENIED'
        });
    }

    next();
};

export default {
    requireActiveStaff,
    requireAdmin,
    requireStaffRole,
    requireActiveAdmin,
    logAccess,
    preventSelfModification
};
