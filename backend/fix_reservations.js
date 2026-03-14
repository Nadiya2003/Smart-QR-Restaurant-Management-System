import pool from './src/config/db.js';

const fixReservationsTable = async () => {
    try {
        console.log('Fixing reservations table structure...');
        
        // Check if table_id exists, if not add it
        const [cols] = await pool.query('SHOW COLUMNS FROM reservations');
        const colNames = cols.map(c => c.Field);
        
        if (!colNames.includes('table_id')) {
            await pool.query('ALTER TABLE reservations ADD COLUMN table_id INT AFTER customer_id');
            await pool.query('ALTER TABLE reservations ADD CONSTRAINT fk_res_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL');
            console.log('Added table_id column.');
        }

        if (!colNames.includes('customer_name')) {
            await pool.query('ALTER TABLE reservations ADD COLUMN customer_name VARCHAR(100) AFTER guests');
            console.log('Added customer_name column.');
        }

        if (!colNames.includes('mobile_number')) {
            await pool.query('ALTER TABLE reservations ADD COLUMN mobile_number VARCHAR(20) AFTER customer_name');
            console.log('Added mobile_number column.');
        }

        // Rename columns if they don't match the controller
        if (colNames.includes('guests') && !colNames.includes('guest_count')) {
            await pool.query('ALTER TABLE reservations CHANGE COLUMN guests guest_count INT');
            console.log('Renamed guests to guest_count.');
        }

        if (colNames.includes('special_request') && !colNames.includes('special_requests')) {
            await pool.query('ALTER TABLE reservations CHANGE COLUMN special_request special_requests TEXT');
            console.log('Renamed special_request to special_requests.');
        }

        if (colNames.includes('status') && !colNames.includes('reservation_status')) {
            // Check if reservation_status already exists (it might have been added by an earlier partial migration)
            if (!colNames.includes('reservation_status')) {
                await pool.query("ALTER TABLE reservations CHANGE COLUMN status reservation_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING'");
                console.log('Renamed status to reservation_status.');
            }
        }

        console.log('Reservations table structure fixed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err.message);
        process.exit(1);
    }
};

fixReservationsTable();
