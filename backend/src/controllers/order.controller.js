import pool from '../config/db.js';

/**
 * Handle Delivery Order Creation
 */
export const createDeliveryOrder = async (req, res) => {
    try {
        const { customer_name, phone, address, items, total_price, notes, payment_status, transaction_id } = req.body;

        // Requirement 10: Backend must verify payment_status === "paid" before saving
        if (payment_status !== 'paid') {
            return res.status(400).json({ message: 'Payment failed. Order not saved.' });
        }

        const [result] = await pool.query(
            `INSERT INTO delivery_orders 
            (customer_name, phone, address, items, total_price, notes, payment_method, payment_status, transaction_id, order_status) 
            VALUES (?, ?, ?, ?, ?, ?, 'ONLINE', 'paid', ?, 'pending')`,
            [customer_name, phone, address, JSON.stringify(items), total_price, notes || '', transaction_id]
        );

        res.status(201).json({ 
            message: '✅ Payment Successful! Your order has been placed successfully. We will contact you shortly.', 
            orderId: result.insertId 
        });

    } catch (error) {
        console.error('Create delivery order error:', error);
        res.status(500).json({ message: '❌ Payment Failed. Your order was not completed. Please try again.', error: error.message });
    }
};

/**
 * Handle Takeaway Order Creation
 */
export const createTakeawayOrder = async (req, res) => {
    try {
        const { customer_name, phone, pickup_time, items, total_price, notes, payment_status, transaction_id } = req.body;

        // Requirement 10: Backend must verify payment_status === "paid"
        if (payment_status !== 'paid') {
            return res.status(400).json({ message: 'Payment failed. Order not saved.' });
        }

        const [result] = await pool.query(
            `INSERT INTO takeaway_orders 
            (customer_name, phone, pickup_time, items, total_price, notes, payment_method, payment_status, transaction_id, order_status) 
            VALUES (?, ?, ?, ?, ?, ?, 'ONLINE', 'paid', ?, 'pending')`,
            [customer_name, phone, pickup_time, JSON.stringify(items), total_price, notes || '', transaction_id]
        );

        res.status(201).json({ 
            message: '✅ Payment Successful! Your order has been placed successfully. We will contact you shortly.', 
            orderId: result.insertId 
        });

    } catch (error) {
        console.error('Create takeaway order error:', error);
        res.status(500).json({ message: '❌ Payment Failed. Your order was not completed. Please try again.', error: error.message });
    }
};

/**
 * Get Customer Orders (Updated to pull from both tables)
 */
export const getCustomerOrders = async (req, res) => {
    try {
        const { name } = req.query; // Assuming we search by name for now, or use auth user

        const [deliveryOrders] = await pool.query(
            'SELECT *, "DELIVERY" as type FROM delivery_orders WHERE customer_name = ? ORDER BY created_at DESC',
            [name]
        );

        const [takeawayOrders] = await pool.query(
            'SELECT *, "TAKEAWAY" as type FROM takeaway_orders WHERE customer_name = ? ORDER BY created_at DESC',
            [name]
        );

        const allOrders = [...deliveryOrders, ...takeawayOrders].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json({ orders: allOrders });
    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};
