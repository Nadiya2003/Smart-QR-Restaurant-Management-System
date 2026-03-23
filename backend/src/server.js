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
        const [statusRows] = await pool.query("SELECT id FROM order_statuses WHERE name = 'COMPLETED'");
        const completedId = statusRows[0]?.id || 5;

        const [result] = await pool.query(`
            UPDATE orders 
            SET status_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE status_id NOT IN (
                SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED')
            )
            AND created_at < DATE_SUB(NOW(), INTERVAL 6 HOUR)
        `, [completedId]);

        if (result.affectedRows > 0) {
            console.log(`[Maintenance] Auto-completed ${result.affectedRows} stale orders.`);
        }
    } catch (err) {
        console.error('[Maintenance] Auto-completion task failed:', err.message);
    }
}, 30 * 60 * 1000);

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
