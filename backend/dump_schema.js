import pool from './src/config/db.js';
import fs from 'fs';

const dumpSchema = async () => {
    try {
        const [tables] = await pool.query("SHOW TABLES");
        const tableNames = tables.map(r => Object.values(r)[0]);
        const schema = {};
        for (const table of tableNames) {
            const [columns] = await pool.query(`DESCRIBE \`${table}\``);
            schema[table] = columns;
        }
        fs.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
        console.log('Schema dumped to schema_dump.json');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
dumpSchema();
