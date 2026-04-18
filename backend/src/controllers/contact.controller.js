import pool from '../config/db.js';
import nodemailer from 'nodemailer';

export const submitContactMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Save to Database
        await pool.query(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject || 'No Subject', message]
        );

        // Send Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'your-email@gmail.com',
                pass: process.env.EMAIL_PASS || 'your-app-password'
            }
        });

        const mailOptions = {
            from: email,
            to: 'melissasfoodcourt01@gmail.com',
            subject: `Contact Form: ${subject || 'New Message'}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.warn('Failed to send email:', mailErr.message);
            // We still return success since it's saved to DB
        }

        res.status(201).json({ message: 'Message sent successfully! We will get back to you soon.' });
    } catch (error) {
        console.error('Contact submit error:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
};
