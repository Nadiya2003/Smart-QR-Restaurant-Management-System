import pool from '../config/db.js';

// Use the machine's LAN IP from env for building absolute URLs
// This avoids returning 'localhost' to clients on other devices
const BACKEND_BASE_URL = process.env.BACKEND_PUBLIC_URL || 
    (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(':3000', ':5000') : null);

export const getAllStewards = async (req, res) => {
    try {
        // First, check which columns exist in the stewards table to build a safe query
        const [colRows] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stewards'
        `);
        const stewardCols = colRows.map(r => r.COLUMN_NAME);
        const hasRating = stewardCols.includes('rating');

        const ratingSelect = hasRating ? 'COALESCE(s.rating, 0.0)' : '0.0';

        const query = `
            SELECT 
                u.id as id, 
                u.full_name as name, 
                u.profile_image as avatar,
                COALESCE(s.is_available, 0) as is_available,
                ${ratingSelect} as rating,
                COALESCE(att.attendance_count, 0) as attendance_count,
                att.check_in_time,
                COALESCE(ord.active_orders, 0) as activeOrders
            FROM staff_users u
            JOIN staff_roles sr ON u.role_id = sr.id
            LEFT JOIN stewards s ON u.id = s.staff_id
            LEFT JOIN (
                SELECT staff_id, COUNT(*) as attendance_count, MAX(check_in_time) as check_in_time
                FROM staff_attendance 
                WHERE date = CURDATE() AND check_out_time IS NULL
                GROUP BY staff_id
            ) att ON u.id = att.staff_id
            LEFT JOIN (
                SELECT s2.staff_id, COUNT(*) as active_orders
                FROM orders o 
                JOIN stewards s2 ON o.steward_id = s2.id
                JOIN order_statuses os ON o.status_id = os.id
                WHERE os.name NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED')
                GROUP BY s2.staff_id
            ) ord ON u.id = ord.staff_id
            WHERE LOWER(sr.role_name) = 'steward' 
            AND u.is_active = 1
        `;

        const [rows] = await pool.query(query);

        // Use env-configured public URL, or fall back to the request host
        // req.get('host') returns '192.168.1.2:5000' when dev server proxies — bad for LAN clients
        const reqHost = req.get('host') || '192.168.1.2:5000';
        const protocol = req.protocol === 'https' ? 'https' : 'http';
        const baseUrl = BACKEND_BASE_URL || `${protocol}://${reqHost}`;

        const stewards = rows.map(row => {
            // Dual check: attendance today (no check-out) OR is_available flag = 1
            const hasAttendance = parseInt(row.attendance_count || 0) > 0;
            const onDuty = hasAttendance || row.is_available === 1;

            // Image URL resolution — always produce an absolute URL
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
                checkInTime: row.check_in_time,
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
