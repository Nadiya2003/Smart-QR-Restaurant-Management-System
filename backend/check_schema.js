import pool from './src/config/db.js';

async function checkSchema() {
    try {
        const [stewards] = await pool.query('DESCRIBE stewards');
        console.log('--- stewards ---');
        console.log(stewards);

        const [attendance] = await pool.query('DESCRIBE staff_attendance');
        console.log('--- staff_attendance ---');
        console.log(attendance);

        const [reservations] = await pool.query('DESCRIBE reservations');
        console.log('--- reservations ---');
        console.log(reservations);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
