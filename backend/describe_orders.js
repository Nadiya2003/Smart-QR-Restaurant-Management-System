import pool from './src/config/db.js';

async function describe() {
    try {
        const [rows] = await pool.query('DESCRIBE orders');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

describe();
