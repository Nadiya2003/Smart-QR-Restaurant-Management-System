import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Debug verification
transporter.verify((error, success) => {
    if (error) {
        console.error('Email Service Error (SMTP):', error.message);
        console.warn('💡 TIP: Ensure EMAIL_USER is your Gmail and EMAIL_PASS is a 16-character App Password.');
    } else {
        console.log('✅ Email Service Ready');
    }
});

export default transporter;
