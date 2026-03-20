import jwt from 'jsonwebtoken';
const token = jwt.sign({ userId: 9, role: 'CUSTOMER' }, 'your_jwt_secret_key_123456789', { expiresIn: '1h' });
console.log(token);
