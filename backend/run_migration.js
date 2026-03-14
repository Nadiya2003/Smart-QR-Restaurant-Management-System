import fs from 'fs';
import path from 'path';
import pool from './src/config/db.js';

const runMigration = async () => {
    try {
        const sqlPath = path.join(process.cwd(), '..', 'database', 'table_reservation_update.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        const connection = await pool.getConnection();
        await connection.query(sql);
        console.log('Migration executed successfully!');
        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
};

runMigration();
