import pool from './src/config/db.js';

async function checkTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('Tables:', tables);
        
        if (tables.includes('online_customers') && tables.includes('customers')) {
            console.log('Both online_customers and customers exist.');
        } else if (tables.includes('online_customers')) {
            console.log('Only online_customers exists.');
        } else if (tables.includes('customers')) {
            console.log('Only customers exists.');
        }
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkTables();
