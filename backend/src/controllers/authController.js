const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
const registerCustomer = async (req, res) => {
    try {
        const { full_name, email, phone, password } = req.body;

        // Validation
        if (!full_name || !email || !phone || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if customer exists
        const [existingCustomers] = await db.query(
            'SELECT id FROM customers WHERE email = ?',
            [email]
        );

        if (existingCustomers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create customer
        const [result] = await db.query(
            'INSERT INTO customers (full_name, email, phone, password) VALUES (?, ?, ?, ?)',
            [full_name, email, phone, hashedPassword]
        );

        if (result.affectedRows > 0) {
            res.status(201).json({
                message: 'Customer registered successfully',
                id: result.insertId,
                full_name,
                email
            });
        } else {
            res.status(400).json({ message: 'Invalid customer data' });
        }
    } catch (error) {
        console.error('Error in registerCustomer:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Authenticate a customer
// @route   POST /api/auth/login
// @access  Public
const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check for customer
        const [customers] = await db.query(
            'SELECT * FROM customers WHERE email = ?',
            [email]
        );

        const customer = customers[0];

        if (customer && (await bcrypt.compare(password, customer.password))) {
            res.json({
                message: 'Login successful',
                id: customer.id,
                full_name: customer.full_name,
                email: customer.email,
                token: generateToken(customer.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error in loginCustomer:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get customer data
// @route   GET /api/auth/profile
// @access  Private
const getCustomerProfile = async (req, res) => {
    try {
        // req.user is set by authentication middleware
        const [customers] = await db.query(
            'SELECT id, full_name, email, phone, created_at FROM customers WHERE id = ?',
            [req.user.id]
        );

        if (customers.length > 0) {
            res.json(customers[0]);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        console.error('Error in getCustomerProfile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = {
    registerCustomer,
    loginCustomer,
    getCustomerProfile,
};
