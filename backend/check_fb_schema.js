
import pool from './src/config/db.js';

async function check() {
    try {
        console.log('--- SHOW TABLES ---');
        const [tables] = await pool.query('SHOW TABLES');
        console.log(tables);

        console.log('\n--- DESCRIBE feedback ---');
        try {
            const [cols] = await pool.query('DESCRIBE feedback');
            console.log(cols);
        } catch (e) {
            console.log('feedback table not found or error');
        }

        console.log('\n--- DESCRIBE restaurant_feedbacks ---');
        try {
            const [cols] = await pool.query('DESCRIBE restaurant_feedbacks');
            console.log(cols);
        } catch (e) {
            console.log('restaurant_feedbacks table not found or error');
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
