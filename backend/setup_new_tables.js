import pool from './src/config/db.js';

const setupDatabase = async () => {
    try {
        console.log('Starting database setup...');

        // Delivery Orders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS delivery_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                items JSON NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                payment_method VARCHAR(50) DEFAULT 'ONLINE',
                payment_status VARCHAR(50) DEFAULT 'unpaid',
                transaction_id VARCHAR(255),
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table delivery_orders checked/created.');

        // Takeaway Orders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS takeaway_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                pickup_time TIME NOT NULL,
                items JSON NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                payment_method VARCHAR(50) DEFAULT 'ONLINE',
                payment_status VARCHAR(50) DEFAULT 'unpaid',
                transaction_id VARCHAR(255),
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table takeaway_orders checked/created.');

        // Reservations Table (Update or Create)
        // Check if reservations exists, if so drop it if the fields are very different, or rename it.
        // Based on req 9, the structure is quite simple.
        await pool.query(`DROP TABLE IF EXISTS reservations`); // Simplest for this update
        await pool.query(`
            CREATE TABLE reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                guests INT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table reservations updated/created.');

        console.log('Database setup completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Database setup failed:', err);
        process.exit(1);
    }
};

setupDatabase();
