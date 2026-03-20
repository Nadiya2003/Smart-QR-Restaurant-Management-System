import mysql from 'mysql2/promise';
async function checkSchema() {
    const c = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });
    const [r] = await c.query('DESCRIBE online_customers');
    console.log(JSON.stringify(r.find(f => f.Field === 'id'), null, 2));
    c.end();
}
checkSchema();
