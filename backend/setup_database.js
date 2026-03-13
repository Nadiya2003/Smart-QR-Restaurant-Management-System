import pool from './src/config/db.js';

async function setup() {
    try {
        console.log('--- Cleaning up existing tables ---');
        await pool.query('DROP TABLE IF EXISTS reservations');
        await pool.query('DROP TABLE IF EXISTS delivery_orders');
        await pool.query('DROP TABLE IF EXISTS takeaway_orders');
        await pool.query('DROP TABLE IF EXISTS online_customers');
        await pool.query('DROP TABLE IF EXISTS contact_messages');

        console.log('--- Setting up online_customers table ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS online_customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                phone VARCHAR(20),
                password VARCHAR(255) NOT NULL,
                profile_image VARCHAR(255) DEFAULT '/assets/default-customer-avatar.png',
                loyalty_points INT DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                reset_otp VARCHAR(10),
                reset_otp_expiry TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('--- Setting up customer_permissions table ---');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                permission_key VARCHAR(100) NOT NULL,
                allowed TINYINT(1) DEFAULT 1,
                FOREIGN KEY (customer_id) REFERENCES online_customers(id) ON DELETE CASCADE
            )
        `);

        console.log('--- Setting up reservations table ---');
        await pool.query('DROP TABLE IF EXISTS reservations');
        await pool.query(`
            CREATE TABLE reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                reservation_date DATE NOT NULL,
                reservation_time TIME NOT NULL,
                guests INT NOT NULL,
                special_request TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES online_customers(id) ON DELETE CASCADE
            )
        `);

        // 3. Create Delivery Orders table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS delivery_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                items JSON NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                payment_method VARCHAR(50) DEFAULT 'ONLINE',
                payment_status VARCHAR(50) DEFAULT 'pending',
                transaction_id VARCHAR(100),
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES online_customers(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ delivery_orders table ready.');

        // 4. Create Takeaway Orders table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS takeaway_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                customer_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                pickup_time VARCHAR(100) NOT NULL,
                items JSON NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                payment_method VARCHAR(50) DEFAULT 'ONLINE',
                payment_status VARCHAR(50) DEFAULT 'pending',
                transaction_id VARCHAR(100),
                order_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES online_customers(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ takeaway_orders table ready.');

        // 5. Create Contact Messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL,
                subject VARCHAR(200),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ contact_messages table ready.');

        console.log('✨ All requested tables are set up correctly.');
    } catch (error) {
        console.error('❌ Database setup failed:', error);
    } finally {
        process.exit();
    }
}

setup();
