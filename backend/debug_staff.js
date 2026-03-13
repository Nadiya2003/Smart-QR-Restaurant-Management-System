import pool from './src/config/db.js';
import fs from 'fs';

// Test what getAllStaff returns
const testStaffEndpoint = async () => {
    console.log('🔍 Testing Staff Endpoint Response...\n');

    try {
        // Simulate the getAllStaff query
        const [managerRoles] = await pool.query("SELECT id FROM staff_roles WHERE role_name = 'manager'");
        const managerRoleId = managerRoles.length > 0 ? managerRoles[0].id : null;

        const [staff] = await pool.query(
            `SELECT u.id, u.full_name as name, u.email, u.is_active, u.created_at,
                    r.role_name as role
             FROM staff_users u
             JOIN staff_roles r ON u.role_id = r.id
             WHERE u.role_id != ? OR ? IS NULL
             ORDER BY u.created_at DESC`,
            [managerRoleId, managerRoleId]
        );

        // Write to file
        const output = {
            managerRoleId,
            staffCount: staff.length,
            staff: staff
        };

        fs.writeFileSync('staff_debug_output.json', JSON.stringify(output, null, 2));
        console.log('✅ Output written to staff_debug_output.json');
        console.log(`Found ${staff.length} staff members`);

        // Also check total
        const [allStaff] = await pool.query('SELECT COUNT(*) as count FROM staff_users');
        console.log(`Total staff in database: ${allStaff[0].count}`);

        // Check if query is excluding anyone
        if (staff.length === 0 && allStaff[0].count > 0) {
            console.log('\n⚠️  WARNING: Staff exist but query returns 0!');
            console.log('Manager Role ID:', managerRoleId);

            // Show all staff with their roles
            const [allWithRoles] = await pool.query(`
                SELECT u.id, u.full_name, r.role_name, u.role_id
                FROM staff_users u
                JOIN staff_roles r ON u.role_id = r.id
            `);
            console.log('All staff:', allWithRoles);
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

testStaffEndpoint();
