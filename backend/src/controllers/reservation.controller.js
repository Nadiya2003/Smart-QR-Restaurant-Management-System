import pool from '../config/db.js';
import { notifyRoles } from './staff.notification.controller.js';

export const createReservation = async (req, res) => {
    try {
        const { date, time, guests, table_number } = req.body;
        // userId is in req.user from protect middleware
        const customer_id = req.user.userId;

        if (!date || !time || !guests) {
            return res.status(400).json({ message: 'Date, time, and guest count are required' });
        }

        // Combine date and time for MySQL DATETIME
        const reservation_time = `${date} ${time}`;
        const targetTableNum = table_number || Math.floor(Math.random() * 20) + 1;

        // Find Table ID
        const [tables] = await pool.query('SELECT id FROM restaurant_tables WHERE table_number = ?', [targetTableNum]);
        if (tables.length === 0) {
            return res.status(400).json({ message: 'Invalid table number' });
        }
        const tableId = tables[0].id;

        const [result] = await pool.query(
            'INSERT INTO reservations (customer_id, table_id, reservation_time, guest_count, status) VALUES (?, ?, ?, ?, ?)',
            [customer_id, tableId, reservation_time, guests, 'PENDING']
        );

        // Notify Admin and Manager
        await notifyRoles(
            ['admin', 'manager'],
            'New Reservation Request',
            `A new reservation has been requested for ${date} at ${time} for ${guests} guests.`,
            'RESERVATION'
        );

        res.status(201).json({
            message: 'Reservation request submitted successfully!',
            reservationId: result.insertId
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({ message: 'Failed to create reservation', error: error.message });
    }
};

export const getMyReservations = async (req, res) => {
    try {
        const customer_id = req.user.userId;
        const [reservations] = await pool.query(
            `SELECT r.*, t.table_number
             FROM reservations r
             JOIN restaurant_tables t ON r.table_id = t.id
             WHERE r.customer_id = ? 
             ORDER BY r.reservation_time DESC`,
            [customer_id]
        );
        res.json({ reservations });
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
};
