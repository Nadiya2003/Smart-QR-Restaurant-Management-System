import pool from './config/db.js';
import fs from 'fs';
const checkRoles = async () => {
    try {
        const [rows] = await pool.query('SELECT role_name FROM staff_roles');
        fs.writeFileSync('../roles_output.json', JSON.stringify(rows.map(r => r.role_name)));
    } catch (e) {
        fs.writeFileSync('../roles_output.json', JSON.stringify({error: e.message}));
    }
    process.exit(0);
};
checkRoles();
