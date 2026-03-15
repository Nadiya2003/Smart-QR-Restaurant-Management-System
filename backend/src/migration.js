import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function updateSchema() {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM order_analytics LIKE 'order_status'");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE order_analytics ADD COLUMN order_status VARCHAR(50) DEFAULT 'pending' AFTER order_source");
            console.log('✅ Column order_status added in order_analytics');
        } else {
            console.log('ℹ️ Column order_status already exists');
        }

        const [reportsColumns] = await pool.query("SHOW COLUMNS FROM reports LIKE 'data_json'");
        if (reportsColumns.length === 0) {
            await pool.query("ALTER TABLE reports ADD COLUMN data_json JSON AFTER summary_data");
            console.log('✅ Column data_json added in reports');
        }

        const [genByColumns] = await pool.query("SHOW COLUMNS FROM reports LIKE 'generated_by'");
        if (genByColumns.length === 0) {
            await pool.query("ALTER TABLE reports ADD COLUMN generated_by INT AFTER data_json");
            console.log('✅ Column generated_by added in reports');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating database:', err.message);
        process.exit(1);
    }
}

updateSchema();
