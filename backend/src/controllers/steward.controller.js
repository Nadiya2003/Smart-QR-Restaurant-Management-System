import pool from '../config/db.js';

export const getAllStewards = async (req, res) => {
    try {
        // stewards table columns: id, staff_id, is_available, created_at, loyalty_points
        // No rating_avg column exists. Rating is computed from feedback/ratings tables.
        const query = `
            SELECT 
                u.id as id, 
                u.full_name as name, 
                u.profile_image as avatar,
                COALESCE(s.is_available, 0) as is_available,
                COALESCE(s.rating, 0.0) as rating,
                (SELECT COUNT(*) FROM staff_attendance sa 
                 WHERE sa.staff_id = u.id 
                 AND sa.date = CURDATE() 
                 AND sa.check_out_time IS NULL) as attendance_count,
                (
                    SELECT COUNT(*) 
                    FROM orders o 
                    JOIN order_statuses os ON o.status_id = os.id
                    LEFT JOIN stewards s2 ON o.steward_id = s2.id
                    WHERE s2.staff_id = u.id 
                    AND os.name NOT IN ('COMPLETED', 'CANCELLED')
                ) as activeOrders
            FROM staff_users u
            JOIN staff_roles sr ON u.role_id = sr.id
            LEFT JOIN stewards s ON u.id = s.staff_id
            WHERE LOWER(sr.role_name) = 'steward' 
            AND u.is_active = 1
        `;

        const [rows] = await pool.query(query);

        const stewards = rows.map(row => {
            const host = req.get('host') || 'localhost:5000';
            const protocol = req.protocol === 'https' ? 'https' : 'http';
            const baseUrl = `${protocol}://${host}`;
            
            // Dual check: attendance today (no check-out) OR is_available flag = 1
            const hasAttendance = parseInt(row.attendance_count || 0) > 0;
            const onDuty = hasAttendance || row.is_available === 1;

            // Image URL resolution
            let avatarUrl = `${baseUrl}/stewards/steward-${(row.id % 6) + 1}.png`;
            if (row.avatar && !row.avatar.includes('default')) {
                if (row.avatar.startsWith('http')) {
                    avatarUrl = row.avatar;
                } else if (row.avatar.startsWith('/stewards/') || row.avatar.startsWith('/uploads/')) {
                    avatarUrl = `${baseUrl}${row.avatar}`;
                } else {
                    avatarUrl = `${baseUrl}/stewards/${row.avatar.split('/').pop()}`;
                }
            }
            
            const activeOrderCount = parseInt(row.activeOrders || 0);
            const ratingVal = Number(Number(row.rating || 0).toFixed(1));

            return {
                id: row.id,
                name: row.name,
                avatar: avatarUrl,
                rating: ratingVal,
                activeOrders: activeOrderCount,
                isAvailable: onDuty,
                status: onDuty ? (activeOrderCount < 5 ? 'active' : 'busy') : 'offline'
            };
        });

        res.json({ stewards });
    } catch (error) {
        console.error('Get stewards error:', error);
        res.status(500).json({ message: 'Failed to fetch stewards', error: error.message });
    }
};

export const getStewardById = async (req, res) => {
    res.status(501).json({ message: 'Not implemented yet' });
};
