import http from 'http';

const data = JSON.stringify({
  username: 'steward@test.com',
  password: 'password', // Assuming common password or need to check
  deviceType: 'mobile'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/staff/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(`BODY: ${body}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
