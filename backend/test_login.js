import fetch from 'node-fetch';

const testLogin = async () => {
    try {
        const response = await fetch('http://192.168.1.4:5000/api/staff/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Nadeesha',
                password: 'Nmk@6604'
            }),
        });
        const data = await response.json();
        console.log('Login response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Login test failed:', error.message);
    }
};

testLogin();
