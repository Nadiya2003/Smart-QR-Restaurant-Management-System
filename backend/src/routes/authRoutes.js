const express = require('express');
const router = express.Router();
const {
    registerCustomer,
    loginCustomer,
    getCustomerProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Define routes
router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.get('/profile', protect, getCustomerProfile);

module.exports = router;
