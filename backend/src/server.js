import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
    }
});

// Set global io for controllers to use (Requirement 13)
global.io = io;

io.on('connection', (socket) => {
    console.log('👤 A user connected:', socket.id);
    
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`🏠 User ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('👤 User disconnected');
    });
});

import pool from './config/db.js';

// Requirement 10: Auto Order Completion Logic (6 hours)
// Check every 30 minutes and complete orders that were started more than 6 hours ago
setInterval(async () => {
    try {
        console.log('[Maintenance] Checking for stale orders (>6h)...');
        
        // 1. Get 'COMPLETED' status ID
        const [statusRows] = await pool.query("SELECT id FROM order_statuses WHERE name = 'COMPLETED'");
        const completedId = statusRows[0]?.id || 5;

        // 2. Find stale orders that are not COMPLETED or CANCELLED
        const [staleOrders] = await pool.query(`
            SELECT o.id, o.table_id, rt.table_number
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            JOIN order_statuses os ON o.status_id = os.id
            WHERE os.name NOT IN ('COMPLETED', 'CANCELLED')
            AND o.created_at < DATE_SUB(NOW(), INTERVAL 6 HOUR)
        `);

        if (staleOrders.length > 0) {
            const staleIds = staleOrders.map(o => o.id);
            const staleTableIds = Array.from(new Set(staleOrders.map(o => o.table_id).filter(id => id !== null)));

            // 3. Update Order Statuses
            await pool.query('UPDATE orders SET status_id = ?, main_status = "COMPLETED", updated_at = CURRENT_TIMESTAMP WHERE id IN (?)', [completedId, staleIds]);

            // 4. Reset Tables to Available
            if (staleTableIds.length > 0) {
                await pool.query('UPDATE restaurant_tables SET status = "available" WHERE id IN (?)', [staleTableIds]);
            }

            // 5. Notify Sockets for Real-time Refresh
            staleOrders.forEach(order => {
                if (global.io) {
                    // Notify order update
                    global.io.emit('orderUpdate', { 
                        orderId: order.id, 
                        status: 'COMPLETED',
                        mainStatus: 'COMPLETED',
                        isAutoClosed: true,
                        message: 'Order auto-closed after 6 hours.'
                    });

                    // Notify table status change
                    if (order.table_id) {
                        global.io.emit('tableUpdate', { 
                            tableId: order.table_id, 
                            tableNumber: order.table_number,
                            status: 'available' 
                        });
                    }
                }
            });

            console.log(`[Maintenance] ✅ Auto-closed ${staleOrders.length} stale orders and reset ${staleTableIds.length} tables.`);
        }

        // Also handle Takeaway and Delivery stale orders (optional but good for consistency)
        await pool.query(`
            UPDATE takeaway_orders 
            SET order_status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
            WHERE order_status NOT IN ('COMPLETED', 'CANCELLED') 
            AND created_at < DATE_SUB(NOW(), INTERVAL 6 HOUR)
        `);

        await pool.query(`
            UPDATE delivery_orders 
            SET order_status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
            WHERE order_status NOT IN ('COMPLETED', 'CANCELLED', 'DELIVERED') 
            AND created_at < DATE_SUB(NOW(), INTERVAL 6 HOUR)
        `);

    } catch (err) {
        console.error('[Maintenance] Auto-completion task failed:', err.message);
    }
}, 10 * 60 * 1000);

// Requirement: Daily Reset Feature (12:00 AM)
// Resets all menu items to Available every day at midnight
setInterval(async () => {
    try {
        const now = new Date();
        // Since we check every 15 minutes, we look for the 00:00 - 00:15 window
        if (now.getHours() === 0 && now.getMinutes() < 15) {
            console.log('[Maintenance] Daily reset: Setting all menu items to Available...');
            await pool.query('UPDATE menu_items SET is_available = 1');
            if (global.io) {
                global.io.emit('menuUpdate', { type: 'global_reset', isAvailable: true });
            }
            console.log('[Maintenance] ✅ All items reset to Available.');
        }
    } catch (err) {
        console.error('[Maintenance] Daily reset failed:', err.message);
    }
}, 15 * 60 * 1000); // Check every 15 minutes

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Backend with Socket.io is running!`);
    console.log(`👉 Server running on: http://localhost:${PORT}`);
    console.log(`=================================================\n`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
        console.error(`💡 TIP: You might have another terminal running the backend (check your open terminals).`);
        console.error(`💡 TRY: Run 'npx kill-port ${PORT}' or close other terminals, then try again.\n`);
        process.exit(1);
    } else {
        console.error('Server error:', e);
        process.exit(1);
    }
});
