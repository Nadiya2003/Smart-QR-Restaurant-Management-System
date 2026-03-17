
import pool from '../config/db.js';
import { getPermissionsForRole } from '../utils/staffPermissions.js';

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
        query += " ORDER BY a.date DESC, a.check_in_time DESC";

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
        const { item_name, quantity, unit, supplier_id, category = 'General', min_level = 5 } = req.body;
        
        let status = 'Available';
        if (Number(quantity) === 0) status = 'Out of Stock';
        else if (Number(quantity) <= Number(min_level)) status = 'Low Stock';

        await pool.query(
            'INSERT INTO inventory (item_name, quantity, unit, supplier_id, category, min_level, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [item_name, quantity, unit, supplier_id || null, category, min_level, status]
        );
        res.status(201).json({ message: 'Inventory item added' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding inventory item', error: err.message });
    }
};

export const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, quantity, unit, supplier_id, category = 'General', min_level = 5 } = req.body;
        
        let status = 'Available';
        if (Number(quantity) === 0) status = 'Out of Stock';
        else if (Number(quantity) <= Number(min_level)) status = 'Low Stock';

        await pool.query(
            'UPDATE inventory SET item_name = ?, quantity = ?, unit = ?, supplier_id = ?, category = ?, min_level = ?, status = ? WHERE id = ?',
            [item_name, quantity, unit, supplier_id || null, category, min_level, status, id]
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
            SELECT su.id, su.full_name, sr.role_name as role, a.check_in_time,
                   (SELECT COUNT(*) 
                    FROM feedback f 
                    JOIN orders o ON f.order_id = o.id 
                    WHERE o.steward_id = su.id AND f.rating >= 4) as performance_points
            FROM staff_users su
            JOIN staff_roles sr ON su.role_id = sr.id
            JOIN staff_attendance a ON su.id = a.staff_id
            WHERE a.date = ? AND a.check_out_time IS NULL
        `, [today]);

        res.json({ activity: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching staff activity', error: err.message });
    }
};

// --- Staff Management ---
export const getStaffMembers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = `
            SELECT su.id, su.full_name, su.email, su.phone, su.status, su.created_at, sr.role_name as role, su.role_id,
                   EXISTS(SELECT 1 FROM staff_attendance sa WHERE sa.staff_id = su.id AND sa.date = CURDATE() AND sa.check_out_time IS NULL) as is_available
            FROM staff_users su
            JOIN staff_roles sr ON su.role_id = sr.id
            WHERE su.role_id != (SELECT id FROM staff_roles WHERE role_name = 'admin')
        `;
        const params = [];

        if (role) {
            query += " AND sr.role_name = ?";
            params.push(role);
        }
        if (status) {
            query += " AND su.status = ?";
            params.push(status);
        }
        if (search) {
            query += " AND (su.full_name LIKE ? OR su.email LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        query += " ORDER BY su.created_at DESC";

        const [rows] = await pool.query(query, params);
        res.json({ staff: rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching staff members', error: err.message });
    }
};

export const updateStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // active, disabled, pending

        if (!['active', 'disabled', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Get current role to apply permissions if activating
        const [user] = await pool.query(`
            SELECT sr.role_name 
            FROM staff_users su
            JOIN staff_roles sr ON su.role_id = sr.id
            WHERE su.id = ?
        `, [id]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        let updateQuery = "UPDATE staff_users SET status = ?, is_active = ? WHERE id = ?";
        const updateParams = [status, status === 'active' ? 1 : 0, id];

        // If activating, sync permissions based on role
        if (status === 'active') {
            const permissions = getPermissionsForRole(user[0].role_name);
            updateQuery = "UPDATE staff_users SET status = ?, is_active = ?, permissions = ? WHERE id = ?";
            updateParams.splice(2, 0, JSON.stringify(permissions));
        }

        await pool.query(updateQuery, updateParams);
        res.json({ message: `Staff status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ message: 'Error updating staff status', error: err.message });
    }
};

export const updateStaffRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;

        const [role] = await pool.query("SELECT role_name FROM staff_roles WHERE id = ?", [roleId]);
        if (role.length === 0) {
            return res.status(400).json({ message: 'Invalid role ID' });
        }

        const permissions = getPermissionsForRole(role[0].role_name);
        
        await pool.query(
            "UPDATE staff_users SET role_id = ?, permissions = ? WHERE id = ?",
            [roleId, JSON.stringify(permissions), id]
        );

        res.json({ message: 'Staff role and permissions updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating staff role', error: err.message });
    }
};
