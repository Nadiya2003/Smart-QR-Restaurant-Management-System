import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT name FROM categories');
        console.log('--- Categories ---');
        rows.forEach(r => console.log(`- ${r.name}`));
        
        const [orders] = await pool.query('SELECT id, status_id FROM orders LIMIT 5');
        console.log('--- Active Statuses ---');
        const [active] = await pool.query('SELECT os.name, count(*) as cnt FROM orders o JOIN order_statuses os ON o.status_id = os.id GROUP BY os.name');
        active.forEach(a => console.log(`${a.name}: ${a.cnt}`));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
