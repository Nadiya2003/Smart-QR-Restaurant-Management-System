import mysql from 'mysql2/promise';
async function detectOrderMismatch() {
    const c = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });
    
    for (const table of ['orders', 'delivery_orders', 'takeaway_orders']) {
        console.log(`--- Checking ${table} Mismatches ---`);
        const [rows] = await c.query(`
            SELECT r.id, r.customer_id as res_cust_id, oc.id as real_cust_id, oc.email
            FROM ${table} r
            JOIN online_customers oc ON (r.phone = oc.phone)
            WHERE r.customer_id != oc.id
        `);
        console.log(`Found in ${table}:`, rows.length);
    }

    c.end();
}
detectOrderMismatch();
