import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('--- Email Config Check ---');
console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
console.log(`EMAIL_PASS (length): ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined'}`);

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Missing credentials in .env file!');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Spaces are generally fine, but stripping them is safer
    }
});

console.log('Attempting to connect to Gmail...');

transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Code:', error.code);
        console.error('Response:', error.response);
        console.log('\n--- TROUBLESHOOTING ---');
        console.log('1. Ensure "2-Step Verification" is ON for your Google Account.');
        console.log('2. Ensure you are using an "App Password" (16 chars), NOT your login password.');
        console.log('3. Generate a NEW App Password here: https://myaccount.google.com/apppasswords');
        console.log('4. Update your .env file with the new password.');
    } else {
        console.log('✅ Success! Your email configuration is correct.');
    }
});
