import db from './src/config/db.js';

async function checkSchema() {
    try {
        const tables = ['orders', 'order_items', 'staff_attendance', 'reservations', 'bookings', 'restaurant_tables'];
        for (const table of tables) {
            console.log(`\n--- ${table} ---`);
            try {
                const [rows] = await db.query(`DESCRIBE \`${table}\``);
                console.table(rows);
            } catch (err) {
                console.log(`${table} might not exist: ${err.message}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
