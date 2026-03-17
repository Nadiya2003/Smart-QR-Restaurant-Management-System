import pool from './src/config/db.js';

async function checkInventory() {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory');
        console.log(`Total rows in inventory: ${rows.length}`);
        
        const summary = rows.map(r => `${r.id}: ${r.item_name} (${r.category}) - ${r.quantity} ${r.unit}`).join('\n');
        console.log(summary);
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkInventory();
