const http = require('http');

function testRolesApi() {
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/roles',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response Body:', data);
            process.exit(res.statusCode === 200 ? 0 : 1);
        });
    });

    req.on('error', (err) => {
        console.error('Error:', err.message);
        process.exit(1);
    });

    req.end();
}

testRolesApi();
