import pool from './src/config/db.js';

async function checkColumns() {
    try {
        const [rows] = await pool.query('DESCRIBE orders');
        console.log('Columns in orders table:');
        rows.forEach(row => console.log(`- ${row.Field} (${row.Type})`));
        process.exit(0);
    } catch (error) {
        console.error('Error checking columns:', error);
        process.exit(1);
    }
}

checkColumns();
