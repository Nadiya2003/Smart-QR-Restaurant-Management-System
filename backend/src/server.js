import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Backend is running successfully!`);
    console.log(`👉 Server running on: http://localhost:${PORT}`);
    console.log(`👉 LAN access: http://192.168.1.4:${PORT}`);
    console.log(`👉 API available at: http://localhost:${PORT}/api/menu`);
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
