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
    multipleStatements: true
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
        
        connection.release();
    } catch (err) {
        console.error('Database connection failed or startup cleanup failed:', err.message);
    }
})();

export default pool;
