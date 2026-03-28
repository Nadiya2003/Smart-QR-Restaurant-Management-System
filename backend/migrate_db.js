import mysql from 'mysql2/promise';

(async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant'
    });

    try {
        await conn.query('ALTER TABLE stewards ADD COLUMN rating DECIMAL(3,2) DEFAULT 5.00');
        console.log('Added rating to stewards');
    } catch(e) { console.log(e.message); }

    try {
        await conn.query('ALTER TABLE feedback ADD COLUMN steward_id INT DEFAULT NULL');
        console.log('Added steward_id to feedback');
    } catch(e) { console.log(e.message); }

    try {
        await conn.query('ALTER TABLE feedback ADD COLUMN is_complaint TINYINT(1) DEFAULT 0');
        console.log('Added is_complaint to feedback');
    } catch(e) { console.log(e.message); }

    try {
        await conn.query('ALTER TABLE restaurant_feedbacks ADD COLUMN steward_id INT DEFAULT NULL');
        console.log('Added steward_id to restaurant_feedbacks');
    } catch(e) { console.log(e.message); }

    process.exit(0);
})();
