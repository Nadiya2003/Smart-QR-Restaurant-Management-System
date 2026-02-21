import pool from '../config/db.js';

export const getAllStewards = async (req, res) => {
    try {
        // Fetch stewards by joining staff_users, stewards, and staff_roles tables
        // We filter by role_name = 'steward' and staff_users.is_active = 1
        const query = `
            SELECT 
                s.id, 
                u.full_name as name, 
                s.image as avatar,
                (
                    SELECT COALESCE(AVG(f.rating), 5.0)
                    FROM feedback f
                    JOIN orders o ON f.order_id = o.id
                    WHERE o.steward_id = s.id
                ) as rating,
                (
                    SELECT COUNT(*) 
                    FROM orders o 
                    WHERE o.steward_id = s.id 
                    AND o.status_id NOT IN (5, 6) -- 5: COMPLETED, 6: CANCELLED
                ) as activeOrders
            FROM stewards s
            JOIN staff_users u ON s.staff_id = u.id
            JOIN staff_roles sr ON u.role_id = sr.id
            WHERE sr.role_name = 'steward' AND u.is_active = 1 AND s.is_available = 1
        `;

        const [rows] = await pool.query(query);

        const stewards = rows.map(row => ({
            id: row.id,
            name: row.name,
            avatar: row.avatar ? `http://localhost:5000/stewards/${row.avatar}` : '/stewards/default.png',
            rating: Number(Number(row.rating).toFixed(1)),
            activeOrders: row.activeOrders,
            status: row.activeOrders < 5 ? 'active' : 'busy'
        }));

        res.json({ stewards });
    } catch (error) {
        console.error('Get stewards error:', error);
        res.status(500).json({ message: 'Failed to fetch stewards', error: error.message });
    }
};

export const getStewardById = async (req, res) => {
    // Implement if needed for details page
    res.status(501).json({ message: 'Not implemented yet' });
};
