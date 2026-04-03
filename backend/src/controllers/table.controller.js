import pool from '../config/db.js';

/**
 * Unified Table Management Controller
 * Central source of truth for Table Status, Reservations (6-hr rule), and Active Orders
 */

export const getUnifiedTables = async (req, res) => {
    try {
        const { date, time } = req.query;
        // Use provided date/time or current server time
        const checkDate = date || new Date().toISOString().split('T')[0];
        const checkTime = time || new Date().toTimeString().split(' ')[0];

        // 1. Get all tables with: Occupancy info + Reservation logic (6-hr Rule) 
        // 180 Minutes = 3 Hours
        const [tables] = await pool.query(`
            SELECT 
                t.*, 
                a.area_name,
                -- Active Order Info (Occupied status)
                o.id as active_order_id,
                os.name as active_order_status,
                su.full_name as steward_name,
                -- Reservation Info (6-hour rule: 3h before to 3h after)
                r.id as reservation_id,
                r.customer_name as reservation_customer,
                r.reservation_time,
                r.guest_count as reservation_guests
            FROM restaurant_tables t
            JOIN dining_areas a ON t.area_id = a.id
            -- Active Orders (Dine-in only)
            LEFT JOIN orders o ON t.id = o.table_id AND o.status_id NOT IN (
                SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED', 'FINISHED')
            )
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            -- Reservations within the window
            LEFT JOIN reservations r ON t.id = r.table_id 
                AND r.reservation_date = ? 
                AND r.reservation_status NOT IN ('CANCELLED', 'REJECTED')
                AND ABS(TIMESTAMPDIFF(MINUTE, CONCAT(r.reservation_date, ' ', r.reservation_time), CONCAT(?, ' ', ?))) <= 180
            ORDER BY (CASE WHEN a.area_name = 'Italian Area' THEN 0 ELSE 1 END), a.area_name, t.table_number ASC
        `, [checkDate, checkDate, checkTime]);

        // 2. Fetch areas list for dashboard area tabs
        const [areas] = await pool.query('SELECT * FROM dining_areas ORDER BY area_name');

        // 3. Process status and metadata
        const processedTables = tables.map(t => {
            let realTimeStatus = 'Available';
            
            // Priority: Occupied > Cleaning > Reserved > Available
            if (t.active_order_id) {
                realTimeStatus = 'Occupied';
            } else if (t.status === 'cleaning') {
                realTimeStatus = 'Cleaning';
            } else if (t.reservation_id) {
                realTimeStatus = 'Reserved';
            }

            return {
                ...t,
                // Unified Status mapping
                status: realTimeStatus,
                is_occupied: !!t.active_order_id,
                is_reserved: !!t.reservation_id,
                // Backward compatibility info
                reservation_time: t.reservation_time ? t.reservation_time.substring(0, 5) : null,
                reservation_details: t.reservation_id ? {
                    id: t.reservation_id,
                    customer_name: t.reservation_customer || 'GUEST',
                    time: t.reservation_time,
                    guests: t.reservation_guests
                } : null
            };
        });

        res.json({ 
            success: true, 
            tables: processedTables,
            areas: areas,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Unified getTables error:', error);
        res.status(500).json({ success: false, message: 'Server status error' });
    }
};

/**
 * Handle manual table status updates
 * Ensures changes are reflected across all dashboards instantly
 */
export const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'available', 'not available', etc.

        await pool.query('UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, id]);

        // Emit socket event for real-time synchronization (Requirement #5)
        if (global.io) {
            global.io.emit('tableUpdate', { tableId: id, status });
        }

        res.json({ success: true, message: 'Table status updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed' });
    }
};
