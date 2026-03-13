import pool from '../config/db.js';

export const createReservation = async (req, res) => {
    try {
        const { date, time, guests, special_request } = req.body;
        const customer_id = req.user.userId;

        if (!date || !time || !guests) {
            return res.status(400).json({ message: 'All fields (date, time, guests) are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO reservations (customer_id, reservation_date, reservation_time, guests, special_request) VALUES (?, ?, ?, ?, ?)',
            [customer_id, date, time, guests, special_request || '']
        );

        res.status(201).json({
            message: '✅ Your reservation has been successfully booked.',
            reservationId: result.insertId
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({ message: 'Failed to create reservation', error: error.message });
    }
};

export const getReservations = async (req, res) => {
    try {
        const [reservations] = await pool.query(`
            SELECT r.*, c.name, c.email, c.phone 
            FROM reservations r
            JOIN online_customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `);
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
        res.json({ message: '✅ Reservation cancelled successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Cancel reservation error:', error);
        res.status(500).json({ message: 'Failed to cancel reservation' });
    } finally {
        connection.release();
    }
};

