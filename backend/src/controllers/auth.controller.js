import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import crypto from 'crypto';
import transporter from '../config/mailer.js';

const sendVerificationEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email - Smart QR Restaurant',
        html: `
            <h1>Welcome to Smart QR Restaurant!</h1>
            <p>Your verification code is: <strong>${otp}</strong></p>
            <p>Please enter this code in the app to verify your email address. It expires in 15 minutes.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Verification email failed:', error);
        return false;
    }
};

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP - Smart QR Restaurant',
        text: `Your OTP for password reset is: ${otp}. It expires in 15 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
};

export const register = async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    try {
        // Check if user exists in online_customers
        const [existing] = await db.query('SELECT * FROM online_customers WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO online_customers (name, email, phone, password, is_verified) VALUES (?, ?, ?, ?, 1)',
            [name, email, phone, password_hash]
        );

        const userId = result.insertId;
        
        // Auto login after registration
        const token = jwt.sign({ userId: userId, email: email, name: name, phone: phone }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

        res.status(201).json({ 
            message: 'User registered successfully', 
            token,
            user: {
                id: userId,
                name: name,
                email: email,
                phone: phone || ''
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM online_customers WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ 
            userId: user.id, 
            email: user.email,
            name: user.name,
            phone: user.phone || ''
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const [users] = await db.query('SELECT id FROM online_customers WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await db.query(
            'UPDATE online_customers SET reset_otp = ?, reset_otp_expiry = ? WHERE email = ?',
            [otp, expires, email]
        );

        const emailSent = await sendOTPEmail(email, otp);

        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send OTP email. Please check server logs.' });
        }

        res.json({
            message: 'OTP sent to your email',
            info: 'Check your inbox (and spam)'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

        const [users] = await db.query(
            'SELECT id FROM online_customers WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()',
            [email, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        // Validate OTP Again
        const [users] = await db.query(
            'SELECT id FROM online_customers WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()',
            [email, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP
        await db.query(
            'UPDATE online_customers SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = ?',
            [hashedPassword, users[0].id]
        );

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

        const [users] = await db.query(
            'SELECT id FROM online_customers WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()',
            [email, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        await db.query(
            'UPDATE online_customers SET is_verified = 1, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = ?',
            [users[0].id]
        );

        res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
