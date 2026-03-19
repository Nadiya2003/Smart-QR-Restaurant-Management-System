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
