import pool from '../config/db.js';

export const processPayment = async (req, res) => {
    try {
        const { orderId, paymentMethod, amount } = req.body;

        let methodId = 1;
        if (paymentMethod === 'ONLINE') methodId = 3;
        else if (paymentMethod === 'CARD') methodId = 2;

        const [result] = await pool.query(
            `UPDATE orders 
             SET payment_method_id = ?, paid_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [methodId, orderId]
        );

        // Fetch the order to get customer ID and total price for loyalty points
        const [orders] = await pool.query("SELECT customer_id, total_price, paid_at FROM orders WHERE id = ?", [orderId]);

        if (orders.length > 0 && orders[0].paid_at) {
            const pointsToGain = Math.floor(orders[0].total_price / 10);
            if (pointsToGain > 0) {
                await pool.query(
                    'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
                    [pointsToGain, orders[0].customer_id]
                );
            }
        }

        res.json({ message: 'Payment processed', orderId, status: 'Completed' });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ message: 'Payment failed' });
    }
};

export const getPaymentHistory = async (req, res) => {
    // Return paid orders?
    try {
        const { customerId } = req.params;
        const [rows] = await pool.query(
            "SELECT * FROM orders WHERE customer_id = ? AND paid_at IS NOT NULL ORDER BY created_at DESC",
            [customerId]
        );
        res.json({ payments: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};
