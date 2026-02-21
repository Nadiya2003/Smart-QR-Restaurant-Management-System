import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Backend is running successfully!`);
    console.log(`👉 Server running on: http://localhost:${PORT}`);
    console.log(`👉 LAN access: http://0.0.0.0:${PORT}`);
    console.log(`👉 API available at: http://localhost:${PORT}/api/menu`);
    console.log(`=================================================\n`);
});
