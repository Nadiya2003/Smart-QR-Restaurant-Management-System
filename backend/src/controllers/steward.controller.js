import pool from '../config/db.js';

export const getAllStewards = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id, 
                u.full_name as name, 
                s.image as avatar,
                COALESCE((
                    SELECT AVG(f.rating)
                    FROM feedback f
                    JOIN orders o ON f.order_id = o.id
                    WHERE o.steward_id = s.id
                ), 5.0) as rating,
                s.is_available,
                (
                    SELECT COUNT(*) 
                    FROM orders o 
                    JOIN order_statuses os ON o.status_id = os.id
                    WHERE o.steward_id = s.id 
                    AND os.name NOT IN ('COMPLETED', 'CANCELLED')
                ) as activeOrders
            FROM stewards s
            JOIN staff_users u ON s.staff_id = u.id
            JOIN staff_roles sr ON u.role_id = sr.id
            WHERE LOWER(sr.role_name) = 'steward' 
            AND u.is_active = 1
        `;

        const [rows] = await pool.query(query);

        const stewards = rows.map(row => ({
            id: row.id,
            name: row.name,
            avatar: row.avatar ? `${row.avatar.startsWith('http') ? '' : 'http://192.168.1.4:5000/stewards/'}${row.avatar}` : '/stewards/default.png',
            rating: Number(Number(row.rating).toFixed(1)),
            activeOrders: parseInt(row.activeOrders || 0),
            isAvailable: row.is_available === 1,
            status: row.is_available === 1 ? ((row.activeOrders || 0) < 5 ? 'active' : 'busy') : 'offline'
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
