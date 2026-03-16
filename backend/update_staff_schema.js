import pool from './src/config/db.js';

async function updateStaffSchema() {
    try {
        console.log('--- Updating Staff Schema ---');

        // 1. Add status column to staff_users if it doesn't exist
        const [columns] = await pool.query("SHOW COLUMNS FROM staff_users LIKE 'status'");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE staff_users ADD COLUMN status ENUM('pending', 'active', 'disabled') DEFAULT 'pending' AFTER is_active");
            console.log('✅ Added status column to staff_users');

            // Migrate is_active to status
            await pool.query("UPDATE staff_users SET status = 'active' WHERE is_active = 1");
            await pool.query("UPDATE staff_users SET status = 'pending' WHERE is_active = 0");
            console.log('✅ Migrated is_active values to status');
        } else {
            console.log('ℹ️ status column already exists');
        }

        // 2. Ensure all required roles exist
        const requiredRoles = [
            'admin',
            'manager',
            'steward',
            'kitchen_staff',
            'cashier',
            'delivery_rider',
            'inventory_manager',
            'supplier',
            'bar_staff'
        ];

        for (const role of requiredRoles) {
            const [rows] = await pool.query('SELECT id FROM staff_roles WHERE role_name = ?', [role]);
            if (rows.length === 0) {
                await pool.query('INSERT INTO staff_roles (role_name) VALUES (?)', [role]);
                console.log(`✅ Added role: ${role}`);
            }
        }

        console.log('--- Schema update complete ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating staff schema:', err.message);
        process.exit(1);
    }
}

updateStaffSchema();
