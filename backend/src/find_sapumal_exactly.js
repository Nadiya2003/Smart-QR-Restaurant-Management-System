import mysql from 'mysql2/promise';
async function findSapumal() {
    const c = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });
    const [u] = await c.query('SELECT * FROM online_customers');
    console.log('Results:', JSON.stringify(u.filter(user => user.name.includes('Sapumal') || user.email.includes('sapumal')), null, 2));
    c.end();
}
findSapumal();
