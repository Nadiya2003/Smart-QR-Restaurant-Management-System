import pool from './src/config/db.js';

async function checkEnums() {
    try {
        const [rows] = await pool.query(`
            SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'smart_qr_restaurant' 
            AND COLUMN_TYPE LIKE 'enum%'
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkEnums();
