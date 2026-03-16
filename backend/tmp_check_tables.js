import pool from './src/config/db.js';
async function check() {
    try {
        const tables = ['orders', 'stewards', 'staff_users'];
        for (const table of tables) {
            console.log(`\n--- ${table} ---`);
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.table(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key })));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
