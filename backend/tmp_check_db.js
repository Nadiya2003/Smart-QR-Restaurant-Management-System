import pool from './src/config/db.js';
import fs from 'fs';
async function run() {
    try {
        const [stewardsDesc] = await pool.query('DESCRIBE stewards');
        fs.writeFileSync('results.json', JSON.stringify({ stewardsDesc }, null, 2));
    } catch (err) {
        fs.writeFileSync('results.json', JSON.stringify({ error: err.message }, null, 2));
    }
    process.exit(0);
}
run();
