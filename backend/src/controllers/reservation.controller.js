import pool from '../config/db.js';
import transporter from '../config/mailer.js';

export const createReservation = async (req, res) => {
    try {
        const { date, time, guests, area_id, table_id, customer_name, mobile_number, email, special_request } = req.body;
        const customer_id = req.user.userId;

        if (!date || !time || !guests || !area_id || !table_id) {
            return res.status(400).json({ message: 'All fields (date, time, guests, area, table) are required' });
        }

        // Check if table is actually available for that time
        const [existing] = await pool.query(
            `SELECT * FROM reservations 
             WHERE table_id = ? 
             AND reservation_date = ? 
             AND reservation_time = ? 
             AND status NOT IN ('CANCELLED')`,
            [table_id, date, time]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'This table is already reserved for the selected time slot.' });
        }

        const [result] = await pool.query(
            `INSERT INTO reservations 
            (customer_id, area_id, table_id, reservation_date, reservation_time, guest_count, customer_name, mobile_number, special_requests) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customer_id, 
                area_id, 
                table_id, 
                date, 
                time, 
                guests, 
                customer_name || req.user.name || '', 
                mobile_number || req.user.phone || '', 
                special_request || ''
            ]
        );

        // Fetch area and table details for Notification
        const [[areaInfo]] = await pool.query('SELECT area_name FROM dining_areas WHERE id = ?', [area_id]);
        const [[tableInfo]] = await pool.query('SELECT table_number FROM restaurant_tables WHERE id = ?', [table_id]);

        // Send confirmation Email
        const targetEmail = email || req.user.email;
        if (targetEmail) {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@restaurant.com',
                to: targetEmail,
                subject: 'Reservation Confirmed - Melissa Restaurant',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                        <div style="background-color: #000; padding: 20px; text-align: center;">
                            <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">Melissa's Food Court</h1>
                        </div>
                        <div style="padding: 30px; background-color: #fff; color: #333;">
                            <h2 style="color: #28a745; margin-top: 0;">Reservation Confirmed! ✅</h2>
                            <p>Hello <strong>${customer_name || req.user.name}</strong>,</p>
                            <p>Your table has been successfully reserved. Here are the details:</p>
                            
                            <div style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; padding: 20px; margin: 25px 0;">
                                <p style="margin: 5px 0;"><strong>Dining Area:</strong> ${areaInfo?.area_name || 'Selected Area'}</p>
                                <p style="margin: 5px 0;"><strong>Table Number:</strong> #${tableInfo?.table_number || 'TBD'}</p>
                                <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
                                <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
                                <p style="margin: 5px 0;"><strong>Guests:</strong> ${guests}</p>
                            </div>
                            
                            <p>If you need to change or cancel your reservation, please do so via your dashboard or contact us directly.</p>
                            <p>We look forward to serving you!</p>
                        </div>
                        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                            <p style="margin: 0;">© 2026 Melissa's Food Court. All rights reserved.</p>
                        </div>
                    </div>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`✅ Confirmation email sent to: ${targetEmail}`);
            } catch (err) {
                console.error('❌ Failed to send confirmation email:', err.message);
            }
        }

        // Notify all dashboards of table status change (Requirement #5)
        if (global.io) {
            global.io.emit('tableUpdate', { 
                tableId: table_id, 
                status: 'Reserved',
                type: 'RESERVATION_CREATED'
            });
        }

        res.status(201).json({
            message: '✅ Your reservation has been successfully booked. A confirmation email has been sent.',
            reservationId: result.insertId
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({ message: 'Failed to create reservation', error: error.message });
    }
};

export const getDiningAreas = async (req, res) => {
    try {
        const [areas] = await pool.query('SELECT * FROM dining_areas');
        res.json({ areas });
    } catch (error) {
        console.error('Get areas error:', error);
        res.status(500).json({ message: 'Failed to fetch dining areas' });
    }
};

export const getTablesWithAvailability = async (req, res) => {
    try {
        const { area_id, date, time } = req.query;

        if (!date || !time) {
            return res.status(400).json({ message: 'date and time are required' });
        }

        // 1. Get tables (optionally filtered by area_id)
        let tablesQuery = 'SELECT * FROM restaurant_tables';
        const queryParams = [];
        if (area_id) {
            tablesQuery += ' WHERE area_id = ?';
            queryParams.push(area_id);
        }
        const [tables] = await pool.query(tablesQuery, queryParams);

        // 2. Get reservations for this date
        const [reservations] = await pool.query(
            `SELECT table_id, reservation_time FROM reservations 
             WHERE reservation_date = ? 
             AND status NOT IN ('CANCELLED')`,
            [date]
        );

        const [h, m] = time.split(':').map(Number);
        const reqTimeMins = h * 60 + m;
        const windowMins = 120; // 2 hours duration for each reservation

        const reservedTableIds = reservations
            .filter(r => {
                const [rh, rm] = r.reservation_time.split(':').map(Number);
                const resTimeMins = rh * 60 + rm;
                return Math.abs(reqTimeMins - resTimeMins) < windowMins;
            })
            .map(r => r.table_id);

        const selectedDateStr = new Date(date).toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = selectedDateStr === todayStr;

        // 3. Map status
        const tableStatusData = tables.map(table => {
            let status = 'available'; // Default to available for any booking slot

            // If it's today, we take into account the current real-time status from DB
            if (isToday) {
                status = table.status; // 'available' or 'occupied'
            }

            // Overwrite if it's reserved for this time slot
            if (reservedTableIds.includes(table.id)) {
                status = 'reserved';
            }

            return {
                ...table,
                current_status: status
            };
        });

        res.json({ tables: tableStatusData });
    } catch (error) {
        console.error('Get tables availability error:', error);
        res.status(500).json({ message: 'Failed to fetch table availability' });
    }
};

export const getReservations = async (req, res) => {
    try {
        const { date } = req.query;
        // BUG FIX: Changed JOIN to LEFT JOIN so guest reservations (customer_id IS NULL) are included
        let query = `
            SELECT r.*, 
                   COALESCE(c.name, r.customer_name) as name,
                   COALESCE(c.email, '') as email,
                   COALESCE(c.phone, r.mobile_number) as phone
            FROM reservations r
            LEFT JOIN online_customers c ON r.customer_id = c.id
        `;
        const params = [];

        if (date) {
            query += " WHERE r.reservation_date = ? ";
            params.push(date);
        }

        query += " ORDER BY (r.reservation_date < CURDATE()) ASC, r.reservation_date ASC, r.reservation_time ASC";

        const [reservations] = await pool.query(query, params);
        res.json({ reservations });
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
};

export const cancelReservation = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const customerId = req.user.userId;

        await connection.beginTransaction();

        // 1. Verify ownership and status
        const [rows] = await connection.query(
            'SELECT * FROM reservations WHERE id = ? AND customer_id = ?',
            [id, customerId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Reservation not found or access denied' });
        }

        const reservation = rows[0];
        if (reservation.status === 'CANCELLED') {
            await connection.rollback();
            return res.status(400).json({ message: 'Reservation is already cancelled' });
        }

        // 2. Update original status
        const statusNotes = reason ? `Cancelled: ${reason}` : 'Cancelled by user';
        await connection.query(
            'UPDATE reservations SET status = "CANCELLED", status_notes = ? WHERE id = ?',
            [statusNotes, id]
        );

        // 3. Record in cancellation table
        await connection.query(
            'INSERT INTO cancel_reservations (customer_id, reservation_id, cancellation_reason) VALUES (?, ?, ?)',
            [customerId, id, reason || 'User requested cancellation']
        );

        await connection.commit();
        // Notify all dashboards (Requirement #5)
        if (global.io) {
            global.io.emit('tableUpdate', { 
                tableId: reservation.table_id, 
                status: 'Available',
                type: 'RESERVATION_CANCELLED'
            });
        }

        res.json({ message: '✅ Reservation cancelled successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Cancel reservation error:', error);
        res.status(500).json({ message: 'Failed to cancel reservation' });
    } finally {
        connection.release();
    }
};

