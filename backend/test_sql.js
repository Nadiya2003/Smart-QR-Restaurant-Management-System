const mysql = require('mysql2/promise');
mysql.createConnection({host:'localhost', user:'root', password:'Nmk@6604', database:'smart_qr_restaurant'}).then(c => {
    return c.query("SELECT o.id, o.total_price, o.created_at, coalesce(ot.name, 'DINE_IN') as type_name, os.name as status_name, 'orders' as source_table, o.phone, o.customer_name, o.needed_time, (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)) FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id) as items FROM orders o LEFT JOIN order_types ot ON o.order_type_id = ot.id LEFT JOIN order_statuses os ON o.status_id = os.id UNION ALL SELECT to_ord.id, to_ord.total_price, to_ord.created_at, 'TAKEAWAY' as type_name, to_ord.order_status as status_name, 'takeaway_orders' as source_table, to_ord.phone, to_ord.customer_name, to_ord.needed_time, to_ord.items as items FROM takeaway_orders to_ord UNION ALL SELECT do.id, do.total_price, do.created_at, 'DELIVERY' as type_name, do.order_status as status_name, 'delivery_orders' as source_table, do.phone, do.customer_name, do.needed_time, do.items as items FROM delivery_orders do ORDER BY created_at DESC").then(r => {
        console.log('Success!', r[0].length);
        process.exit();
    });
}).catch(e => {
    console.log('SQL ERROR:', e.message);
    process.exit();
});
