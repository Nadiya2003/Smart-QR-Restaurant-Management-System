import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

async function testApi() {
    const token = jwt.sign({ userId: 9, role: 'CUSTOMER' }, 'your_jwt_secret_key_123456789', { expiresIn: '1h' });
    const res = await fetch('http://localhost:5000/api/customer/account', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('API RESPONSE:', JSON.stringify(data, null, 2));
    console.log('RESERVATIONS LENGTH:', data.reservations?.length);
}
testApi();
