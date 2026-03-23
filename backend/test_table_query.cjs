const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'e:/Education/MIT/Third Year/Semester 01/SDP Project/App-based-Smart-QR-Restaurant-Management-System/backend/.env' });

async function testQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Testing Table Query...');
        const [tables] = await connection.query(`
            SELECT t.*, a.area_name,
                   (SELECT rs.reservation_time 
                    FROM reservations rs 
                    WHERE rs.table_id = t.id 
                    AND rs.status NOT IN ('CANCELLED')
                    AND DATE(rs.reservation_date) = CURDATE()
                    ORDER BY rs.reservation_time ASC LIMIT 1) as reservation_time,
                   (SELECT rs.customer_name 
                    FROM reservations rs 
                    WHERE rs.table_id = t.id 
                    AND rs.status NOT IN ('CANCELLED')
                    AND DATE(rs.reservation_date) = CURDATE()
                    ORDER BY rs.reservation_time ASC LIMIT 1) as reservation_customer,
                   (SELECT os.name 
                    FROM orders o 
                    JOIN order_statuses os ON o.status_id = os.id
                    WHERE o.table_id = t.id 
                    AND os.name NOT IN ('COMPLETED', 'CANCELLED')
                    ORDER BY o.created_at DESC LIMIT 1) as active_order_status,
                   (SELECT su.full_name 
                    FROM orders o 
                    JOIN stewards s ON o.steward_id = s.id 
                    JOIN staff_users su ON s.staff_id = su.id
                    WHERE o.table_id = t.id 
                    AND o.status_id NOT IN (SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED'))
                    ORDER BY o.created_at DESC LIMIT 1) as steward_name
            FROM restaurant_tables t
            JOIN dining_areas a ON t.area_id = a.id
            ORDER BY (CASE WHEN a.area_name = 'Italian Area' THEN 0 ELSE 1 END), a.area_name, t.table_number
        `);
        console.log('Success! Count:', tables.length);
        if (tables.length > 0) console.log('First Table:', JSON.stringify(tables[0], null, 2));
    } catch (error) {
        console.error('Query Failed:', error.message);
    } finally {
        await connection.end();
    }
}

testQuery();
