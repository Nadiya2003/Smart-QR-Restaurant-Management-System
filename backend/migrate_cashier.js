import pool from './src/config/db.js';

async function migrate() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration...');

        // 1. Update orders table
        console.log('Updating orders table...');
        const [orderCols] = await connection.query("SHOW COLUMNS FROM orders");
        const orderFields = orderCols.map(c => c.Field);
        
        if (!orderFields.includes('cashier_id')) {
            await connection.query("ALTER TABLE orders ADD COLUMN cashier_id INT NULL");
        }
        if (!orderFields.includes('customer_name')) {
            await connection.query("ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) NULL");
        }
        if (!orderFields.includes('phone')) {
            await connection.query("ALTER TABLE orders ADD COLUMN phone VARCHAR(20) NULL");
        }
        if (!orderFields.includes('address')) {
            await connection.query("ALTER TABLE orders ADD COLUMN address TEXT NULL");
        }

        // 2. Create staff_attendance if not exists or update it
        console.log('Updating staff_attendance table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS staff_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                staff_id INT NOT NULL,
                name VARCHAR(255),
                role VARCHAR(100),
                check_in_time DATETIME,
                check_out_time DATETIME,
                date DATE,
                status VARCHAR(50) DEFAULT 'Active'
            )
        `);
        // If it already existed, rename old columns if they exist
        const [attCols] = await connection.query("SHOW COLUMNS FROM staff_attendance");
        const attFields = attCols.map(c => c.Field);
        if (attFields.includes('login_time') && !attFields.includes('check_in_time')) {
            await connection.query("ALTER TABLE staff_attendance CHANGE login_time check_in_time DATETIME");
        }
        if (attFields.includes('logout_time') && !attFields.includes('check_out_time')) {
            await connection.query("ALTER TABLE staff_attendance CHANGE logout_time check_out_time DATETIME");
        }
        if (!attFields.includes('name')) {
            await connection.query("ALTER TABLE staff_attendance ADD COLUMN name VARCHAR(255)");
        }
        if (!attFields.includes('role')) {
            await connection.query("ALTER TABLE staff_attendance ADD COLUMN role VARCHAR(100)");
        }

        // 3. Create table_reservations
        console.log('Creating table_reservations table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS table_reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                table_id INT NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                guests INT,
                date DATE NOT NULL,
                time TIME NOT NULL,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'Reserved'
            )
        `);

        // 4. Create bookings
        console.log('Creating bookings table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                guests INT,
                table_id INT,
                date DATE NOT NULL,
                time TIME NOT NULL,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'Confirmed'
            )
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
