import pool from '../config/db.js';

export const createReservation = async (req, res) => {
    try {
        const { name, phone, date, time, guests, notes } = req.body;

        if (!name || !phone || !date || !time || !guests) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO reservations (name, phone, date, time, guests, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [name, phone, date, time, guests, notes || '']
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
        const [reservations] = await pool.query('SELECT * FROM reservations ORDER BY created_at DESC');
        res.json({ reservations });
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
};
