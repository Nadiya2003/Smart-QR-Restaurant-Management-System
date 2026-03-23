const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- menu_items columns ---');
        const [miSchema] = await pool.query('DESCRIBE menu_items');
        console.log(miSchema);
        
        console.log('--- categories list ---');
        const [categories] = await pool.query('SELECT * FROM categories');
        console.log(categories);

        console.log('--- menu_items with category check ---');
        const [counts] = await pool.query(`
            SELECT count(*) as total, 
            sum(case when category_id is null then 1 else 0 end) as null_cat_id,
            sum(case when c.id is null then 1 else 0 end) as orphan_cat_id
            FROM menu_items mi
            LEFT JOIN categories c on mi.category_id = c.id
        `);
        console.log(counts);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
