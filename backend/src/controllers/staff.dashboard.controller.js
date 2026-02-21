import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        const { id: staffId, role, subRole } = req.staff;

        let stats = {};

        if (subRole === 'manager' || role === 'ADMIN') {
            const [totalOrders] = await pool.query(
                'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()'
            );
            const [totalRevenue] = await pool.query(
                `SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 JOIN payment_statuses ps ON o.payment_status_id = ps.id
                 WHERE DATE(o.created_at) = CURDATE() AND ps.name = 'PAID'`
            );
            const [activeStaff] = await pool.query(
                'SELECT COUNT(*) as count FROM staff_users WHERE is_active = 1'
            );
            const [pendingOrders] = await pool.query(
                `SELECT COUNT(*) as count FROM orders o
                 JOIN order_statuses os ON o.status_id = os.id
                 WHERE os.name IN ('PENDING', 'PREPARING')`
            );

            stats = {
                totalOrders: totalOrders[0].count,
                totalRevenue: parseFloat(totalRevenue[0].revenue),
                activeStaff: activeStaff[0].count,
                pendingOrders: pendingOrders[0].count
            };
        } else if (subRole === 'cashier') {
            const [todayOrders] = await pool.query(
                'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()'
            );
            const [todayRevenue] = await pool.query(
                `SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 JOIN payment_statuses ps ON o.payment_status_id = ps.id
                 WHERE ps.name = 'PAID' AND DATE(o.created_at) = CURDATE()`
            );

            stats = {
                todayOrders: todayOrders[0].count,
                todayRevenue: parseFloat(todayRevenue[0].revenue)
            };
        } else if (subRole === 'steward') {
            const [stewardRecord] = await pool.query("SELECT id FROM stewards WHERE staff_id = ?", [staffId]);
            const stewardId = stewardRecord.length > 0 ? stewardRecord[0].id : null;

            const [todayOrders] = await pool.query(
                'SELECT COUNT(*) as count FROM orders WHERE steward_id = ? AND DATE(created_at) = CURDATE()',
                [stewardId]
            );

            stats = {
                todayOrders: todayOrders[0].count
            };
        }

        res.json({ stats });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};

export const getAllStaff = async (req, res) => {
    try {
        const [staff] = await pool.query(
            `SELECT su.id, su.full_name, su.email, su.phone, sr.role_name as role, su.is_active, su.created_at
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             ORDER BY su.created_at DESC`
        );

        res.json({ staff });
    } catch (error) {
        console.error('Get all staff error:', error);
        res.status(500).json({ message: 'Failed to fetch staff' });
    }
};
