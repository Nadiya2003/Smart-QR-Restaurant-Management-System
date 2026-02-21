import pool from '../config/db.js';

export const getNotifications = async (req, res) => {
    try {
        const { id: staffId, roleId } = req.staff;
        const limit = req.query.limit || 50;
        const unreadOnly = req.query.unread === 'true';

        let query = `
            SELECT * FROM staff_notifications 
            WHERE (staff_id = ? OR role_id = ?)
        `;

        if (unreadOnly) {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC LIMIT ?';

        const [notifications] = await pool.query(query, [staffId, roleId, parseInt(limit)]);

        const [unreadCount] = await pool.query(
            'SELECT COUNT(*) as count FROM staff_notifications WHERE (staff_id = ? OR role_id = ?) AND is_read = FALSE',
            [staffId, roleId]
        );

        res.json({
            notifications,
            unreadCount: unreadCount[0].count
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { id: staffId } = req.staff;

        await pool.query(
            'UPDATE staff_notifications SET is_read = TRUE WHERE id = ? AND (staff_id = ? OR staff_id IS NULL)',
            [notificationId, staffId]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const { id: staffId, roleId } = req.staff;

        await pool.query(
            'UPDATE staff_notifications SET is_read = TRUE WHERE (staff_id = ? OR role_id = ?)',
            [staffId, roleId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
    }
};

export const sendNotification = async (req, res) => {
    try {
        const { stewardId, message, type } = req.body;

        if (!stewardId || !message) {
            return res.status(400).json({ message: 'Steward ID and message are required' });
        }

        // Get staff user ID from steward
        const [stewardRows] = await pool.query('SELECT staff_id FROM stewards WHERE id = ?', [stewardId]);

        if (stewardRows.length === 0) {
            return res.status(404).json({ message: 'Steward not found' });
        }

        const staffUserId = stewardRows[0].staff_id;

        // Create notification
        await pool.query(
            'INSERT INTO staff_notifications (staff_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
            [staffUserId, type || 'PAYMENT_REQUEST', message, type || 'PAYMENT_REQUEST']
        );

        res.json({ message: 'Notification sent successfully' });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ message: 'Failed to send notification', error: error.message });
    }
};

export const createNotification = async (staffId, roleId, title, message, type) => {
    try {
        await pool.query(
            'INSERT INTO staff_notifications (staff_id, role_id, title, message, notification_type) VALUES (?, ?, ?, ?, ?)',
            [staffId, roleId, title, message, type]
        );
    } catch (error) {
        console.error('Create notification error:', error);
    }
};

export const notifyRoles = async (roles, title, message, type) => {
    try {
        const [roleRecords] = await pool.query(
            'SELECT id FROM staff_roles WHERE role_name IN (?)',
            [roles]
        );

        for (const role of roleRecords) {
            await createNotification(null, role.id, title, message, type);
        }
    } catch (error) {
        console.error('Notify roles error:', error);
    }
};
