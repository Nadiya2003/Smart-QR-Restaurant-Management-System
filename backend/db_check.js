import pool from './src/config/db.js';

async function checkDb() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables:', tables);
        
        const [invSchema] = await pool.query('DESCRIBE inventory');
        console.log('Inventory Schema:', invSchema);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDb();
