import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

async function testApi() {
    const token = jwt.sign({ userId: 9, role: 'CUSTOMER' }, 'your_jwt_secret_key_123456789', { expiresIn: '1h' });
    const res = await fetch('http://192.168.1.2:5000/api/customer/account', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('ERROR:', data.error);
    console.log('MESSAGE:', data.message);
}
testApi();
