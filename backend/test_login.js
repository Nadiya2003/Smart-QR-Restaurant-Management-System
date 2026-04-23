const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLogin() {
    try {
        const response = await fetch('http://172.19.8.23:5000/api/staff/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: 'steward@test.com', 
                password: 'password123',
                deviceType: 'mobile' 
            }),
        });
        const data = await response.json();
        console.log('Login Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testLogin();
