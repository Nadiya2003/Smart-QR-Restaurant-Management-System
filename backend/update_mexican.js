import pool from './src/config/db.js';

const updateMexican = async () => {
    try {
        const [mexican] = await pool.query("SELECT id FROM dining_areas WHERE area_name LIKE '%Mexican%'");
        if (mexican.length) {
            const areaId = mexican[0].id;
            // Clear existing tables for Mexican to avoid numbering confusion
            await pool.query('DELETE FROM restaurant_tables WHERE area_id = ?', [areaId]);
            
            // Add 15 tables
            for (let i = 1; i <= 15; i++) {
                await pool.query(
                    'INSERT INTO restaurant_tables (area_id, table_number, capacity, status) VALUES (?, ?, ?, ?)', 
                    [areaId, 200 + i, 4, 'available']
                );
            }
            console.log('Successfully updated Mexican Area to 15 tables.');
        } else {
            console.log('Mexican Area not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err.message);
        process.exit(1);
    }
};

updateMexican();
