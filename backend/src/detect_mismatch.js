import mysql from 'mysql2/promise';
async function detectMismatch() {
    const c = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });
    
    console.log('--- Checking for Phone Mismatches ---');
    const [rows] = await c.query(`
        SELECT r.id, r.customer_id as res_cust_id, r.customer_name, r.mobile_number, 
               oc.id as real_cust_id, oc.email
        FROM reservations r
        JOIN online_customers oc ON (r.mobile_number = oc.phone)
        WHERE r.customer_id != oc.id
    `);
    console.log('Identified Mismatches:', JSON.stringify(rows, null, 2));

    c.end();
}
detectMismatch();
