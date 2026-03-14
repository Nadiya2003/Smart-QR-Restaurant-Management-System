import pool from './src/config/db.js';

const testAvailability = async () => {
    try {
        const area_id = 3; // Assuming 3 is Mexican
        const date = '2026-03-15';
        const time = '19:00:00';

        console.log(`Testing availability for Area: ${area_id}, Date: ${date}, Time: ${time}`);

        // 1. Get all tables in this area
        const [tables] = await pool.query(
            'SELECT * FROM restaurant_tables WHERE area_id = ?',
            [area_id]
        );
        console.log(`Found ${tables.length} tables.`);

        // 2. Get reservations for this date and time
        const [reservations] = await pool.query(
            `SELECT table_id FROM reservations 
             WHERE reservation_date = ? AND reservation_time = ? 
             AND reservation_status NOT IN ('CANCELLED')`,
            [date, time]
        );
        console.log(`Found ${reservations.length} reservations.`);

        console.log('Test successful if no error above.');
        process.exit(0);
    } catch (err) {
        console.error('Test failed with error:', err.message);
        console.error(err);
        process.exit(1);
    }
};

testAvailability();
