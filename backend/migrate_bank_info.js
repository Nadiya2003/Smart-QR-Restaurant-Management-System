import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Check if bank_name exists
        const [columns] = await pool.query('DESCRIBE staff_users');
        const hasBankName = columns.some(c => c.Field === 'bank_name');
        
        if (!hasBankName) {
            await pool.query(`
                ALTER TABLE staff_users 
                ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL,
                ADD COLUMN account_number VARCHAR(50) DEFAULT NULL,
                ADD COLUMN account_name VARCHAR(100) DEFAULT NULL
            `);
            console.log('Columns added successfully');
        } else {
            console.log('Columns already exist');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
