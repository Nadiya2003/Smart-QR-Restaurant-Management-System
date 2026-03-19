import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fixTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'smart_qr_restaurant'
    });

    try {
        const [tables] = await connection.query('SHOW TABLES');
        const list = tables.map(r => Object.values(r)[0]);
        console.log('Tables:', list);

        if (!list.includes('staff_notifications')) {
            console.log('Creating staff_notifications...');
            await connection.query(`
                CREATE TABLE staff_notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    staff_id INT DEFAULT NULL,
                    role_id INT DEFAULT NULL,
                    title VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    notification_type VARCHAR(50) DEFAULT 'INFO',
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE,
                    FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE CASCADE
                )
            `);
        }

        console.log('Tables check completed.');
    } catch (err) {
        console.error('Error fixing tables:', err);
    } finally {
        await connection.end();
    }
}

fixTables();
