import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log('--- Starting Database Migration: Status Enhancement ---');

        // 1. Update delivery_orders
        try {
            await pool.query('ALTER TABLE delivery_orders ADD COLUMN status_notes TEXT AFTER order_status');
            console.log('✅ Added status_notes to delivery_orders');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAMES') console.log('ℹ️ status_notes already exists in delivery_orders');
            else throw e;
        }

        try {
            await pool.query('ALTER TABLE delivery_orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('✅ Added updated_at to delivery_orders');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAMES') console.log('ℹ️ updated_at already exists in delivery_orders');
            else throw e;
        }

        // 2. Update takeaway_orders
        try {
            await pool.query('ALTER TABLE takeaway_orders ADD COLUMN status_notes TEXT AFTER order_status');
            console.log('✅ Added status_notes to takeaway_orders');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAMES') console.log('ℹ️ status_notes already exists in takeaway_orders');
            else throw e;
        }

        try {
            await pool.query('ALTER TABLE takeaway_orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('✅ Added updated_at to takeaway_orders');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAMES') console.log('ℹ️ updated_at already exists in takeaway_orders');
            else throw e;
        }

        // 3. Update reservations
        try {
            await pool.query('ALTER TABLE reservations ADD COLUMN status_notes TEXT AFTER status');
            console.log('✅ Added status_notes to reservations');
        } catch (e) {
             if (e.code === 'ER_DUP_COLUMN_NAMES') console.log('ℹ️ status_notes already exists in reservations');
            else throw e;
        }

         try {
            await pool.query('ALTER TABLE reservations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('✅ Added updated_at to reservations');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAMES') console.log('ℹ️ updated_at already exists in reservations');
            else throw e;
        }

        console.log('--- Migration Finished Successfully ---');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
