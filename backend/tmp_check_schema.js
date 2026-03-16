import pool from './src/config/db.js';
import fs from 'fs';
async function run() {
    const [orders] = await pool.query('DESCRIBE orders');
    const [tables] = await pool.query('DESCRIBE restaurant_tables');
    const output = {
        orders: orders.map(r => ({ field: r.Field, type: r.Type })),
        tables: tables.map(r => ({ field: r.Field, type: r.Type }))
    };
    fs.writeFileSync('schema_dump.json', JSON.stringify(output, null, 2));
    process.exit(0);
}
run();
