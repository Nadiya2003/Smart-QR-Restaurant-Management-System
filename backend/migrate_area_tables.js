import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

async function migrate() {
    try {
        // Check if area_id column exists in restaurant_tables
        const [cols] = await pool.query("SHOW COLUMNS FROM restaurant_tables LIKE 'area_id'");
        if (cols.length === 0) {
            // Get dining_areas to set defaults
            const [areas] = await pool.query("SELECT id FROM dining_areas ORDER BY id ASC LIMIT 1");
            const defaultAreaId = areas[0]?.id || null;
            
            console.log("Adding area_id to restaurant_tables...");
            await pool.query("ALTER TABLE restaurant_tables ADD COLUMN area_id INT NULL, ADD FOREIGN KEY (area_id) REFERENCES dining_areas(id) ON DELETE SET NULL");
            
            // Set all existing tables to the first dining area
            if (defaultAreaId) {
                await pool.query("UPDATE restaurant_tables SET area_id = ? WHERE area_id IS NULL", [defaultAreaId]);
                console.log("Set default area_id=" + defaultAreaId + " for all existing tables");
            }
            console.log("Migration done: area_id added to restaurant_tables");
        } else {
            console.log("area_id already exists in restaurant_tables - checking values...");
            const [tableCount] = await pool.query("SELECT COUNT(*) as cnt FROM restaurant_tables WHERE area_id IS NULL");
            console.log("Tables without area_id:", tableCount[0].cnt);
            
            if (tableCount[0].cnt > 0) {
                const [areas] = await pool.query("SELECT id FROM dining_areas ORDER BY id ASC LIMIT 1");
                if (areas[0]) {
                    await pool.query("UPDATE restaurant_tables SET area_id = ? WHERE area_id IS NULL", [areas[0].id]);
                    console.log("Updated null area_ids to", areas[0].id);
                }
            }
        }
        
        // Also check total_price in orders table
        const [tpCols] = await pool.query("SHOW COLUMNS FROM orders LIKE 'total_price'");
        if (tpCols.length === 0) {
            console.log("Adding total_price to orders...");
            await pool.query("ALTER TABLE orders ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0");
            // Update existing totals from analytics
            await pool.query(`
                UPDATE orders o 
                SET o.total_price = (
                    SELECT COALESCE(SUM(oa.total_price), 0) 
                    FROM order_analytics oa 
                    WHERE oa.order_id = o.id
                )
                WHERE o.total_price = 0 OR o.total_price IS NULL
            `);
            console.log("total_price added and backfilled in orders");
        } else {
            console.log("total_price already exists in orders");
        }
        
        // Check dining_areas
        const [areas] = await pool.query("SELECT * FROM dining_areas");
        console.log("Dining areas:", JSON.stringify(areas));
        
        // Check tables with areas
        const [tables] = await pool.query("SELECT id, table_number, area_id, status FROM restaurant_tables LIMIT 5");
        console.log("Sample tables:", JSON.stringify(tables));
    } catch (e) {
        console.error("Migration failed:", e.message);
    } finally {
        process.exit();
    }
}
migrate();
