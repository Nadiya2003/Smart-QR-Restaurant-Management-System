import transporter from './src/config/mailer.js';

const testMail = async () => {
    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('✅ Transporter verified!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Mail test failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        if (err.message.includes('Invalid login')) {
            console.warn('💡 ACTION REQUIRED: Your EMAIL_USER or EMAIL_PASS in backend/.env is incorrect.');
        } else if (err.code === 'ESOCKET') {
            console.warn('💡 ACTION REQUIRED: Connection failed. Check your internet or firewall settings.');
        }
        process.exit(1);
    }
};

testMail();
