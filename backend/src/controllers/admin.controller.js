import pool from '../config/db.js';

// --- Staff Management ---
export const getAllStaff = async (req, res) => {
    try {
        const [staff] = await pool.query(
            `SELECT su.id, su.full_name as name, su.email, su.phone,
                    sr.role_name as role, su.is_active, su.created_at, su.permissions
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             ORDER BY su.created_at DESC`
        );

        const staffWithPermissions = staff.map(s => {
            let permissions = [];
            try {
                permissions = JSON.parse(s.permissions || '[]');
            } catch (e) {
                permissions = s.permissions ? [s.permissions] : [];
            }
            return { ...s, permissions };
        });

        res.json({ staff: staffWithPermissions });
    } catch (err) {
        console.error('Get all staff error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleStaffStatus = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { status } = req.body; // 'active', 'inactive'

        console.log(`Updating staff ${id} status to: ${status}`);

        // Get staff details before update
        const [staffBefore] = await connection.query(
            'SELECT id, full_name, email, is_active FROM staff_users WHERE id = ?',
            [id]
        );

        if (staffBefore.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Staff member not found' });
        }

        const staffUser = staffBefore[0];
        const newIsActive = status === 'active' ? 1 : 0;

        // Update staff status
        await connection.query(
            'UPDATE staff_users SET is_active = ? WHERE id = ?',
            [newIsActive, id]
        );

        // Log the action in audit_logs
        const actionType = status === 'active' ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED';
        const details = `Staff account ${staffUser.full_name} status changed to ${status}`;
        const performerId = req.user?.userId || 0;

        try {
            await connection.query(
                'INSERT INTO audit_logs (action_type, target_user_id, performed_by, details) VALUES (?, ?, ?, ?)',
                [actionType, id, performerId, details]
            );
        } catch (auditErr) {
            console.warn('Audit log failed:', auditErr.message);
        }

        await connection.commit();
        res.json({
            message: `Staff status updated to ${status}`,
            is_active: newIsActive
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Toggle staff status error:', err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (connection) connection.release();
    }
};

export const updateStaffPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }

        const permissionsJson = JSON.stringify(permissions);
        await pool.query('UPDATE staff_users SET permissions = ? WHERE id = ?', [permissionsJson, id]);

        res.json({ message: 'Permissions updated successfully' });
    } catch (err) {
        console.error('Update staff permissions error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateStaffRole = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { role_name } = req.body;

        // 1. Get role ID
        const [roleRows] = await connection.query('SELECT id FROM staff_roles WHERE role_name = ?', [role_name]);
        if (roleRows.length === 0) {
            return res.status(400).json({ message: 'Invalid role name' });
        }
        const roleId = roleRows[0].id;

        // 2. Update staff_users
        await connection.query('UPDATE staff_users SET role_id = ? WHERE id = ?', [roleId, id]);

        // 3. Handle role-specific table (Optional/Advanced: move data if needed, but for now just ensure entry exists)
        // This part is tricky because of the schema, but at minimum the role_id change works for auth.
        
        await connection.commit();
        res.json({ message: `Role updated to ${role_name}` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Update staff role error:', err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (connection) connection.release();
    }
};

// --- Customer Management ---
export const getAllCustomers = async (req, res) => {
    try {
        const [customers] = await pool.query(
            `SELECT id, name, email, phone, loyalty_points, is_active, created_at
             FROM online_customers
             ORDER BY created_at DESC`
        );

        res.json({ customers });
    } catch (err) {
        console.error('Get all customers error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateCustomerPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        const [tables] = await pool.query("SHOW TABLES LIKE 'customer_permissions'");

        if (tables.length === 0) {
            return res.status(501).json({ message: 'Customer permissions not implemented in current schema' });
        }

        await pool.query('DELETE FROM customer_permissions WHERE customer_id = ?', [id]);

        if (permissions && permissions.length > 0) {
            const values = permissions.map(p => [id, p, true]);
            await pool.query('INSERT INTO customer_permissions (customer_id, permission_key, allowed) VALUES ?', [values]);
        }

        res.json({ message: 'Customer permissions updated' });
    } catch (err) {
        console.error('Update customer permissions error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'inactive'
        const newIsActive = status === 'active' ? 1 : 0;

        await pool.query('UPDATE online_customers SET is_active = ? WHERE id = ?', [newIsActive, id]);
        
        // Audit log
        try {
            const performerId = req.user?.userId || 0;
            const actionType = status === 'active' ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED';
            await pool.query(
                'INSERT INTO audit_logs (action_type, target_user_id, performed_by, details) VALUES (?, ?, ?, ?)',
                [actionType, id, performerId, `Customer account status changed to ${status}`]
            );
        } catch (e) {}

        res.json({ message: `Customer status updated to ${status}` });
    } catch (err) {
        console.error('Toggle customer status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Order Management ---
export const getAllOrders = async (req, res) => {
    try {
        const [deliveryOrders] = await pool.query('SELECT *, "DELIVERY" as order_type FROM delivery_orders ORDER BY created_at DESC');
        const [takeawayOrders] = await pool.query('SELECT *, "TAKEAWAY" as order_type FROM takeaway_orders ORDER BY created_at DESC');
        
        const allOrders = [...deliveryOrders, ...takeawayOrders].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json({ orders: allOrders });
    } catch (err) {
        console.error('Get all orders error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [statusRows] = await pool.query('SELECT id FROM order_statuses WHERE name = ?', [status.toUpperCase()]);
        if (statusRows.length === 0) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await pool.query('UPDATE orders SET status_id = ? WHERE id = ?', [statusRows[0].id, id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Stats ---
export const getStats = async (req, res) => {
    try {
        const [[{ deliveryCount }]] = await pool.query('SELECT COUNT(*) as deliveryCount FROM delivery_orders');
        const [[{ takeawayCount }]] = await pool.query('SELECT COUNT(*) as takeawayCount FROM takeaway_orders');
        const [[{ customerCount }]] = await pool.query('SELECT COUNT(*) as customerCount FROM online_customers');
        const [[{ staffCount }]] = await pool.query('SELECT COUNT(*) as staffCount FROM staff_users');
        const [[{ revenue }]] = await pool.query(`
            SELECT (
                COALESCE((SELECT SUM(total_price) FROM delivery_orders WHERE payment_status = 'paid'), 0) + 
                COALESCE((SELECT SUM(total_price) FROM takeaway_orders WHERE payment_status = 'paid'), 0)
            ) as revenue
        `);

        res.json({ 
            stats: {
                customers: customerCount,
                staff: staffCount,
                orders: deliveryCount + takeawayCount,
                revenue: revenue || 0,
                pendingOrders: 0, // Simplified for now
                completedOrders: 0
            } 
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Reservation Management ---
export const getAllReservations = async (req, res) => {
    try {
        const [reservations] = await pool.query('SELECT * FROM reservations ORDER BY created_at DESC');
        res.json({ reservations });
    } catch (err) {
        console.error('Get all reservations error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        if (!validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid reservation status' });
        }

        await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [status.toUpperCase(), id]);
        res.json({ message: 'Reservation status updated' });
    } catch (err) {
        console.error('Update reservation status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Table & Area Management ---
export const getAllAreas = async (req, res) => {
    try {
        const [areas] = await pool.query('SELECT * FROM dining_areas ORDER BY id ASC');
        res.json({ areas });
    } catch (err) {
        console.error('Get all areas error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const addArea = async (req, res) => {
    try {
        const { area_name, description } = req.body;
        await pool.query('INSERT INTO dining_areas (area_name, description) VALUES (?, ?)', [area_name, description]);
        res.status(201).json({ message: 'Dining area added successfully' });
    } catch (err) {
        console.error('Add area error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateArea = async (req, res) => {
    try {
        const { id } = req.params;
        const { area_name, description } = req.body;
        await pool.query('UPDATE dining_areas SET area_name = ?, description = ? WHERE id = ?', [area_name, description, id]);
        res.json({ message: 'Dining area updated' });
    } catch (err) {
        console.error('Update area error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getAllTables = async (req, res) => {
    try {
        const [tables] = await pool.query(`
            SELECT t.*, a.area_name 
            FROM restaurant_tables t
            JOIN dining_areas a ON t.area_id = a.id
            ORDER BY a.area_name, t.table_number
        `);
        res.json({ tables });
    } catch (err) {
        console.error('Get all tables error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const addTable = async (req, res) => {
    try {
        const { area_id, table_number, capacity } = req.body;
        await pool.query('INSERT INTO restaurant_tables (area_id, table_number, capacity) VALUES (?, ?, ?)', [area_id, table_number, capacity]);
        res.status(201).json({ message: 'Table added successfully' });
    } catch (err) {
        console.error('Add table error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { area_id, table_number, capacity, status } = req.body;
        await pool.query(
            'UPDATE restaurant_tables SET area_id = ?, table_number = ?, capacity = ?, status = ? WHERE id = ?',
            [area_id, table_number, capacity, status, id]
        );
        res.json({ message: 'Table updated successfully' });
    } catch (err) {
        console.error('Update table error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'available', 'occupied', 'reserved'
        await pool.query('UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: `Table status updated to ${status}` });
    } catch (err) {
        console.error('Update table status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Audit Logs ---
export const getAuditLogs = async (req, res) => {
    try {
        const { limit = 100, offset = 0, action_type, target_user_id } = req.query;

        let query = `
            SELECT a.id, a.action_type, a.details, a.created_at, a.ip_address,
                   t.full_name as target_user_name, t.email as target_user_email,
                   p.full_name as performed_by_name, p.email as performed_by_email
            FROM audit_logs a
            LEFT JOIN staff_users t ON a.target_user_id = t.id
            LEFT JOIN staff_users p ON a.performed_by = p.id
            WHERE 1=1
        `;

        const params = [];

        if (action_type) {
            query += ` AND a.action_type = ?`;
            params.push(action_type);
        }

        if (target_user_id) {
            query += ` AND a.target_user_id = ?`;
            params.push(target_user_id);
        }

        query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.query(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
        const countParams = [];

        if (action_type) {
            countQuery += ` AND action_type = ?`;
            countParams.push(action_type);
        }

        if (target_user_id) {
            countQuery += ` AND target_user_id = ?`;
            countParams.push(target_user_id);
        }

        const [[{ total }]] = await pool.query(countQuery, countParams);

        res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (err) {
        console.error('Get audit logs error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
