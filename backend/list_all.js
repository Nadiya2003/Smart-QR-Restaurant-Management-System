import pool from './src/config/db.js';

async function listAll() {
    try {
        const fs = await import('fs');
        const [rows] = await pool.query('DESCRIBE order_analytics');
        const list = rows.map(r => r.Field + ' (' + r.Type + ')').join('\n');
        fs.writeFileSync('analytics_cols.txt', list, 'utf8');
        console.log('Written analytics_cols.txt');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

listAll();
