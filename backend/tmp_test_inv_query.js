import pool from './src/config/db.js';

async function testQuery() {
    try {
        const [rows] = await pool.query(
            'SELECT i.id, i.item_name, i.category, i.quantity, i.unit, i.status, i.min_level, s.name as supplier_name FROM inventory i LEFT JOIN suppliers s ON i.supplier_id = s.id ORDER BY i.category, i.item_name LIMIT 10'
        );
        rows.forEach(r => console.log(`${r.category} | ${r.item_name} | ${r.quantity} ${r.unit} | ${r.status}`));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

testQuery();
