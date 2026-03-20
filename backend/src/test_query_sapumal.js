import mysql from 'mysql2/promise';
async function testQuery() {
    const c = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });
    const userId = 9;
    
    const [users] = await c.query("SELECT * FROM online_customers WHERE id = ?", [userId]);
    const profile = users[0];
    console.log('Profile:', profile.name, profile.phone);

    const [reservations] = await c.query(
        `SELECT r.id, r.guest_count as guests, r.reservation_date, r.reservation_time, 
                r.reservation_status as status, r.created_at, t.table_number
         FROM reservations r
         LEFT JOIN restaurant_tables t ON r.table_id = t.id
         WHERE r.customer_id = ? OR r.mobile_number = ?
         ORDER BY r.reservation_date DESC, r.reservation_time DESC`,
        [userId, profile.phone]
    );
    console.log('Reservations count:', reservations.length);
    console.log('Sample Res:', reservations[0]);

    c.end();
}
testQuery();
