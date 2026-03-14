import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Debug verification
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email Service Error (SMTP):', error.message);
        console.warn('💡 HELP: To fix this, update backend/.env with your REAL Gmail and 16-character App Password.');
    } else {
        console.log('✅ Email Service Configured & Ready');
    }
});

export default transporter;
