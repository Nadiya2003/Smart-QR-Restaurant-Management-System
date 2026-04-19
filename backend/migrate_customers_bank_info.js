import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log('Starting migration for online_customers...');
        
        // Check if bank_name exists
        const [columns] = await pool.query('DESCRIBE online_customers');
        const hasBankName = columns.some(c => c.Field === 'bank_name');
        
        if (!hasBankName) {
            await pool.query(`
                ALTER TABLE online_customers 
                ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL,
                ADD COLUMN account_number VARCHAR(50) DEFAULT NULL,
                ADD COLUMN dob DATE DEFAULT NULL
            `);
            console.log('Columns added successfully to online_customers');
        } else {
            console.log('Columns already exist in online_customers');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
