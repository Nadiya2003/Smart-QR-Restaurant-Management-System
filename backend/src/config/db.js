import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_qr_restaurant',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    // Fix: Return DATE columns as plain "YYYY-MM-DD" strings instead of JavaScript Date objects.
    // Without this, MySQL2 returns UTC midnight Date objects which display as the previous day
    // in UTC+5:30 (Sri Lanka timezone).
    dateStrings: true
});

// Test connection
(async () => {
    try {
        const connection = await pool.getConnection();
        const [[{ dbName }]] = await connection.query('SELECT DATABASE() as dbName');
        console.log(`Database connected successfully to: ${dbName}`);
        
        /* 
           Requirement 11/12: Server Restart Cleanup (Fresh Start)
           CAUTION: This reset orders every time NODEMON restarts. Disabling for reliability. 
        
        console.log('[Startup] Resetting system state for fresh start...');
        
        // 1. Mark all active orders as COMPLETED
        const [statusRows] = await connection.query("SELECT id FROM order_statuses WHERE name = 'COMPLETED'");
        const completedId = statusRows[0]?.id || 5;
        
        await connection.query(`
            UPDATE orders 
            SET status_id = ? 
            WHERE status_id NOT IN (
                SELECT id FROM order_statuses 
                WHERE name IN ('COMPLETED', 'CANCELLED')
            )
        `, [completedId]);

        // 2. Reset ALL tables to 'available'
        await connection.query("UPDATE restaurant_tables SET status = 'available'");
        console.log('[Startup] All tables reset to available.');
        */
        
        // Seed Required Categories
        const requiredCategories = [
            { name: 'Sri Lankan', description: 'Traditional Sri Lankan cuisine', image: '/uploads/categories/srilankan.png' },
            { name: 'Indian', description: 'Authentic Indian flavors', image: '/uploads/categories/indian.png' },
            { name: 'Italian', description: 'Classic Italian pasta and pizza', image: '/uploads/categories/italian.png' },
            { name: 'Beverages', description: 'Refreshing drinks and juices', image: '/uploads/categories/beverages.png' },
            { name: 'Desserts', description: 'Sweet treats and cakes', image: '/uploads/categories/desserts.png' }
        ];

        for (const cat of requiredCategories) {
            const [existing] = await connection.query('SELECT id FROM categories WHERE name = ?', [cat.name]);
            if (existing.length === 0) {
                await connection.query('INSERT INTO categories (name, description, image) VALUES (?, ?, ?)', [cat.name, cat.description, cat.image]);
                console.log(`[Seed] Category added: ${cat.name}`);
            }
        }
        connection.release();
    } catch (err) {
        console.error('Database connection failed or startup cleanup failed:', err.message);
    }
})();

export default pool;
