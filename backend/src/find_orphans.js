import mysql from 'mysql2/promise';
async function findOrphans() {
    const c = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });
    
    console.log('--- Checking for Reservations with no customer_id but matching email ---');
    const [rows] = await c.query(`
        SELECT r.id, r.customer_name, r.mobile_number, oc.id as oc_id, oc.email
        FROM reservations r
        JOIN online_customers oc ON (r.mobile_number = oc.phone OR r.customer_name = oc.name)
        WHERE r.customer_id IS NULL OR r.customer_id = 0
    `);
    console.log('Found:', JSON.stringify(rows, null, 2));

    console.log('--- General Reservations Sample ---');
    const [resv] = await c.query('SELECT id, customer_id, customer_name, mobile_number FROM reservations LIMIT 10');
    console.log(JSON.stringify(resv, null, 2));

    console.log('--- Online Customers Sample ---');
    const [cust] = await c.query('SELECT id, name, email, phone FROM online_customers LIMIT 5');
    console.log(JSON.stringify(cust, null, 2));

    c.end();
}
findOrphans();
