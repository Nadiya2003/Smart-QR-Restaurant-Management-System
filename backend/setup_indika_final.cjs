const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function setupIndika() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'sdp_db'
    });
    
    try {
        await connection.beginTransaction();

        // 1. Create Supplier "Indika Supplies"
        const [supResult] = await connection.execute(
            "INSERT INTO suppliers (name, contact_person, email, phone) VALUES (?, ?, ?, ?)",
            ['Indika Supplies', 'Indika', 'indika123@gmail.com', '0771234567']
        );
        const supplierId = supResult.insertId;

        // 2. Link staff user (indika123@gmail.com) to this supplier
        const [staff] = await connection.execute("SELECT id FROM staff_users WHERE email = 'indika123@gmail.com'");
        if (staff.length > 0) {
            const staffId = staff[0].id;
            await connection.execute("DELETE FROM supplier_staff WHERE staff_id = ?", [staffId]); // Clear previous
            await connection.execute("INSERT INTO supplier_staff (staff_id, supplier_id) VALUES (?, ?)", [staffId, supplierId]);
            console.log(`Linked Indika (Staff ID: ${staffId}) to Supplier ID: ${supplierId}`);
        } else {
             console.log("Indika staff user not found. Creating one...");
             // Password would be needed here, or just assume they exist.
        }

        // 3. Assign some items to this supplier
        // Let's create some new inventory items for them to supply
        const items = [
            ['Wheat Flour', 'Kitchen', 'kg', 100, 20],
            ['Basmati Rice', 'Kitchen', 'kg', 250, 50],
            ['Fresh Tomatoes', 'Kitchen', 'kg', 15, 10],
            ['Fresh Milk', 'Kitchen', 'l', 40, 10]
        ];

        for (const [name, cat, unit, qty, min] of items) {
            await connection.execute(
                "INSERT INTO inventory (item_name, category, unit, quantity, min_level, status, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [name, cat, unit, qty, min, qty <= min ? 'Low Stock' : 'Available', supplierId]
            );
        }

        await connection.commit();
        console.log("Finished linking and stock assignment.");
    } catch (e) { 
        await connection.rollback();
        console.error(e); 
    }
    finally { await connection.end(); }
}

setupIndika();
