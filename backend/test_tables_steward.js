import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

async function check() {
    try {
        const [tables] = await pool.query(`
            SELECT rt.*, da.area_name as area_name,
                   o.id as current_order_id, o.status_id, os.name as order_status,
                   su.full_name as steward_name,
                   (SELECT COUNT(*) FROM reservations r 
                    WHERE r.table_id = rt.id AND r.status = 'confirmed' 
                    AND r.reservation_date = CURDATE()) as today_reservations
            FROM restaurant_tables rt
            LEFT JOIN dining_areas da ON rt.area_id = da.id
            LEFT JOIN orders o ON rt.id = o.table_id AND o.status_id NOT IN (
                SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED')
            )
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN staff_users su ON o.steward_id = su.id
            ORDER BY rt.table_number ASC
        `);
        console.log("Tables fetched successfully, count:", tables.length);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
