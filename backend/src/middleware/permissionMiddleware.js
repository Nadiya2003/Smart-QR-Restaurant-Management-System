import pool from '../config/db.js';

/**
 * Middleware to check specific permissions
 * Usage: checkPermission('orders.view')
 */
export const checkPermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            // 1. Admin always has access
            if (req.user && req.user.role === 'ADMIN') {
                return next();
            }

            const { userId, role } = req.user;

            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            let hasPermission = false;

            if (role !== 'CUSTOMER' && role !== 'ADMIN') {
                // Check staff_users.permissions JSON column
                const [rows] = await pool.query(
                    'SELECT permissions FROM staff_users WHERE id = ?',
                    [userId]
                );

                if (rows.length > 0) {
                    let permissions = [];
                    try {
                        permissions = JSON.parse(rows[0].permissions || '[]');
                    } catch (e) {
                        permissions = rows[0].permissions ? [rows[0].permissions] : [];
                    }

                    if (permissions.includes(permissionKey)) {
                        hasPermission = true;
                    }
                }
            } else if (role === 'CUSTOMER') {
                // Check customer_permissions
                const [rows] = await pool.query(
                    'SELECT allowed FROM customer_permissions WHERE customer_id = ? AND permission_key = ?',
                    [userId, permissionKey]
                );
                if (rows.length > 0 && rows[0].allowed) {
                    hasPermission = true;
                }
            }

            if (hasPermission) {
                next();
            } else {
                res.status(403).json({ message: `Access denied. Missing permission: ${permissionKey}` });
            }
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Server error checking permissions' });
        }
    };
};
