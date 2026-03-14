import pool from './src/config/db.js';

const verify = async () => {
    try {
        const [areas] = await pool.query('SELECT * FROM dining_areas');
        console.log('Areas:', areas.length);
        
        const [tables] = await pool.query('SELECT area_id, COUNT(*) as count FROM restaurant_tables GROUP BY area_id');
        console.log('Table Counts by Area:', tables);
        
        const [resCols] = await pool.query('SHOW COLUMNS FROM reservations');
        console.log('Reservation Columns:', resCols.map(c => c.Field).join(', '));
        
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err.message);
        process.exit(1);
    }
};

verify();
