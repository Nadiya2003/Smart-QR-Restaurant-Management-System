import pool from '../config/db.js';

export const getAllStewards = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id, 
                u.full_name as name, 
                u.profile_image as avatar,
                COALESCE((
                    SELECT AVG(f.rating)
                    FROM feedback f
                    JOIN orders o ON f.order_id = o.id
                    WHERE o.steward_id = s.id
                ), 5.0) as rating,
                (SELECT 1 FROM staff_attendance sa 
                 WHERE sa.staff_id = u.id 
                 AND sa.date = CURDATE() 
                 AND sa.check_out_time IS NULL LIMIT 1) as is_on_duty,
                s.is_available as force_available,
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

        const stewards = rows.map(row => {
            const host = req.get('host') || 'localhost:5000';
            const protocol = req.protocol === 'https' ? 'https' : 'http';
            const baseUrl = `${protocol}://${host}`;
            
            // Logic: A steward is available if they are on duty (from attendance)
            // or if they are forced available (from stewards table)
            // But if force_available is 0, they ARE offline
            const onDuty = row.is_on_duty === 1 || row.force_available === 1;

            // Image path cleanup
            let avatarUrl = `${baseUrl}/stewards/steward-1.png`; // Default real image
            if (row.avatar && !row.avatar.includes('default-staff-avatar.png')) {
                if (row.avatar.startsWith('http')) {
                    avatarUrl = row.avatar;
                } else if (row.avatar.startsWith('/stewards/')) {
                    avatarUrl = `${baseUrl}${row.avatar}`;
                } else if (row.avatar.startsWith('/uploads/')) {
                    avatarUrl = `${baseUrl}${row.avatar}`;
                } else {
                    avatarUrl = `${baseUrl}/stewards/${row.avatar.split('/').pop()}`;
                }
            } else {
                // Return a specific steward-looking placeholder from our public/stewards dir
                avatarUrl = `${baseUrl}/stewards/steward-${(row.id % 6) + 1}.png`;
            }
            
            return {
                id: row.id,
                name: row.name,
                avatar: avatarUrl,
                rating: Number(Number(row.rating).toFixed(1)),
                activeOrders: parseInt(row.activeOrders || 0),
                isAvailable: onDuty,
                status: onDuty ? ((row.activeOrders || 0) < 5 ? 'active' : 'busy') : 'offline'
            };
        });

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
