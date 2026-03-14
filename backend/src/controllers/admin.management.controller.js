
import pool from '../config/db.js';

// --- Permissions Management ---
export const getAllPermissions = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM permissions ORDER BY name');
        res.json({ permissions: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching permissions', error: err.message });
    }
};

export const getRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const [rows] = await pool.query(`
            SELECT p.* FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        `, [roleId]);
        res.json({ permissions: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching role permissions', error: err.message });
    }
};

export const updateRolePermissions = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body; // Array of permission IDs

        await connection.beginTransaction();
        await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

        if (permissionIds && permissionIds.length > 0) {
            const values = permissionIds.map(pid => [roleId, pid]);
            await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ message: 'Role permissions updated successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Error updating permissions', error: err.message });
    } finally {
        connection.release();
    }
};

// --- Attendance ---
export const getAttendance = async (req, res) => {
    try {
        const { date, staffId } = req.query;
        let query = `
            SELECT a.*, su.full_name as staff_name, sr.role_name as role
            FROM staff_attendance a
            JOIN staff_users su ON a.staff_id = su.id
            JOIN staff_roles sr ON su.role_id = sr.id
            WHERE 1=1
        `;
        const params = [];
        if (date) {
            query += " AND a.date = ?";
            params.push(date);
        }
        if (staffId) {
            query += " AND a.staff_id = ?";
            params.push(staffId);
        }
        query += " ORDER BY a.date DESC, a.login_time DESC";

        const [rows] = await pool.query(query, params);
        res.json({ attendance: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching attendance', error: err.message });
    }
};

// --- Inventory ---
export const getInventory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory i 
            LEFT JOIN suppliers s ON i.supplier_id = s.id 
            ORDER BY i.item_name
        `);
        res.json({ inventory: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching inventory', error: err.message });
    }
};

export const addInventoryItem = async (req, res) => {
    try {
        const { item_name, quantity, unit, supplier_id } = req.body;
        await pool.query(
            'INSERT INTO inventory (item_name, quantity, unit, supplier_id) VALUES (?, ?, ?, ?)',
            [item_name, quantity, unit, supplier_id]
        );
        res.status(201).json({ message: 'Inventory item added' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding inventory item', error: err.message });
    }
};

export const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, quantity, unit, supplier_id } = req.body;
        await pool.query(
            'UPDATE inventory SET item_name = ?, quantity = ?, unit = ?, supplier_id = ? WHERE id = ?',
            [item_name, quantity, unit, supplier_id, id]
        );
        res.json({ message: 'Inventory item updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating inventory item', error: err.message });
    }
};

export const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
        res.json({ message: 'Inventory item deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting inventory item', error: err.message });
    }
};

export const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        await pool.query('UPDATE inventory SET quantity = ? WHERE id = ?', [quantity, id]);
        res.json({ message: 'Stock updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating stock', error: err.message });
    }
};

// --- Suppliers ---
export const getSuppliers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY created_at DESC');
        res.json({ suppliers: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suppliers', error: err.message });
    }
};

export const addSupplier = async (req, res) => {
    try {
        const { name, contact_number, email, address, products_supplied } = req.body;
        await pool.query(
            'INSERT INTO suppliers (name, contact_number, email, address, products_supplied) VALUES (?, ?, ?, ?, ?)',
            [name, contact_number, email, address, products_supplied]
        );
        res.status(201).json({ message: 'Supplier added' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding supplier', error: err.message });
    }
};

export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact_number, email, address, products_supplied, status } = req.body;
        await pool.query(
            'UPDATE suppliers SET name = ?, contact_number = ?, email = ?, address = ?, products_supplied = ?, status = ? WHERE id = ?',
            [name, contact_number, email, address, products_supplied, status, id]
        );
        res.json({ message: 'Supplier updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating supplier', error: err.message });
    }
};

export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
        res.json({ message: 'Supplier deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting supplier', error: err.message });
    }
};

export const updateSupplierStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Pending, Approved, Rejected
        await pool.query('UPDATE suppliers SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Supplier status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating supplier status', error: err.message });
    }
};

// --- Reports ---
export const getReports = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports ORDER BY generated_at DESC');
        res.json({ reports: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reports', error: err.message });
    }
};

export const generateSampleReports = async (req, res) => {
    try {
        // Clear old reports
        await pool.query('DELETE FROM reports WHERE generated_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)');

        const reports = [];
        const types = ['DAILY', 'HOURLY', 'WEEKLY', 'MONTHLY'];
        
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const type = types[i % types.length];
            
            const summary = {
                totalOrders: Math.floor(Math.random() * 50) + 10,
                totalRevenue: Math.floor(Math.random() * 50000) + 5000,
                mostOrderedItems: ['Chicken Rice', 'Kottu', 'Juice'],
                breakdown: {
                    'Dine-in': Math.floor(Math.random() * 20),
                    'Takeaway': Math.floor(Math.random() * 20),
                    'Delivery': Math.floor(Math.random() * 10)
                }
            };

            const [result] = await pool.query(
                'INSERT INTO reports (report_type, title, summary_data, generated_at) VALUES (?, ?, ?, ?)',
                [type, `${type} Report - ${date.toLocaleDateString()}`, JSON.stringify(summary), date]
            );
            reports.push({ id: result.insertId, type, date });
        }

        res.json({ message: 'Sample reports generated', reports });
    } catch (err) {
        console.error('Generate reports error:', err);
        res.status(500).json({ message: 'Error generating reports', error: err.message });
    }
};

export const sendNotification = async (req, res) => {
    try {
        const { title, message, target_audience } = req.body; // Staff, Customers, All
        const [result] = await pool.query(
            'INSERT INTO notifications (title, message, target_audience) VALUES (?, ?, ?)',
            [title, message, target_audience]
        );
        res.status(201).json({ message: 'Notification sent', id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Error sending notification', error: err.message });
    }
};


// --- Notifications ---
export const getNotifications = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
        res.json({ notifications: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notifications', error: err.message });
    }
};

// --- Staff Activity (Simplified) ---
export const getStaffActivity = async (req, res) => {
    try {
        // This is a dynamic view of currently logged in staff with active attendance records
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(`
            SELECT su.id, su.full_name, sr.role_name as role, a.login_time,
                   (SELECT COUNT(*) 
                    FROM feedback f 
                    JOIN orders o ON f.order_id = o.id 
                    WHERE o.steward_id = su.id AND f.rating >= 4) as performance_points
            FROM staff_users su
            JOIN staff_roles sr ON su.role_id = sr.id
            JOIN staff_attendance a ON su.id = a.staff_id
            WHERE a.date = ? AND a.logout_time IS NULL
        `, [today]);

        res.json({ activity: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching staff activity', error: err.message });
    }
};
