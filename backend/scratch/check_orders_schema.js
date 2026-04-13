import pool from '../src/config/db.js';

const checkSchema = async () => {
    try {
        const [ordersColumns] = await pool.query('DESCRIBE orders');
        console.log('Orders Columns:', JSON.stringify(ordersColumns, null, 2));
        
        const [types] = await pool.query('SELECT * FROM order_types');
        console.log('Order Types:', JSON.stringify(types, null, 2));

        const [statuses] = await pool.query('SELECT * FROM order_statuses');
        console.log('Order Statuses:', JSON.stringify(statuses, null, 2));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSchema();
