import pool from './src/config/db.js';

async function migrate() {
    try {
        const tables = ['staff_users', 'online_customers'];
        for (const table of tables) {
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            const hasVerified = rows.some(r => r.Field === 'is_verified');
            if (!hasVerified) {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN is_verified TINYINT(1) DEFAULT 0`);
                console.log(`Column is_verified added to ${table}`);
            } else {
                console.log(`Column is_verified already exists in ${table}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrate();
