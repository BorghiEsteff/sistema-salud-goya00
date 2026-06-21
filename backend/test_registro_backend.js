const http = require('http');

const data = JSON.stringify({
  nombre: "TestNode",
  apellido: "NodeJS",
  dni: "10203040",
  fecha_nacimiento: "2000-01-01",
  telefono: "123456",
  email: "testnode" + Date.now() + "@saludgoya.com",
  password: "password123"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pacientes/registro',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
