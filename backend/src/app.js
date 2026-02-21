import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/unified.auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import stewardRoutes from './routes/steward.routes.js';
import reservationRoutes from './routes/reservation.routes.js';

// Legacy/Compatibility (Optional cleanup)
import staffAuthRoutes from './routes/staff.auth.routes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: true, // Allow all origins (needed for Expo Go mobile app)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/stewards', express.static('public/stewards'));
app.use('/food', express.static('public/food'));

// Root Route
app.get('/', (req, res) => {
    res.send('Melissa\'s Food Court - System Active');
});

// ================================================
// API ROUTES (Section 6 Requirement)
// ================================================

// 1. /auth - Login, Register, OTP, Reset
app.use('/api/auth', authRoutes);

// 2. /admin - Management (Staff, Customers, Orders, Permissions)
app.use('/api/admin', adminRoutes);

// 3. /staff - Dashboard & Work (Reusing existing or mapping)
// We'll create a dedicated staff.routes.js for permission-driven dashboard data
import staffWorkRoutes from './routes/staff.work.routes.js';
app.use('/api/staff', staffAuthRoutes);
app.use('/api/staff', staffWorkRoutes);

// 4. /customer - Dashboard & Profile
// Reusing unified auth for profile, creating dedicated for dashboard features
import customerPortalRoutes from './routes/customer.portal.routes.js';
app.use('/api/customer', customerPortalRoutes);

// 5. /orders - Placement & History
app.use('/api/orders', orderRoutes);

// 6. /menu - Visibility
app.use('/api/menu', menuRoutes);

// Additional Helper Routes
app.use('/api/stewards', stewardRoutes);
app.use('/api/reservations', reservationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

export default app;
