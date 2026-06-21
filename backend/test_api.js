const http = require('http');
const https = require('https');

function request(urlStr, options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const API = 'http://localhost:3000/api';

async function runTests() {
  console.log("=== RUNNING API VERIFICATION TESTS ===");
  try {
    // 1. Login Medico
    const medRes = await request(API+'/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'} }, { email: 'medico_test@saludgoya.com', password: 'test1234' });
    const medToken = medRes.data.token;
    console.log("Medico Login:", medRes.status === 200 ? "PASS" : "FAIL");

    // 2. Test 3: Unauthorized Patient History Access (403) for Medico
    const falsePacId = '00000000-0000-0000-0000-000000000000';
    const noAccessRes = await request(API+'/historias/paciente/'+falsePacId, { method: 'GET', headers: { 'Authorization': 'Bearer ' + medToken } });
    console.log("Test 3 (Medico accesses invalid patient): Expected 403, got", noAccessRes.status, "=>", noAccessRes.status === 403 ? "PASS" : "FAIL");

    // 3. Login Secretaria
    const secRes = await request(API+'/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'} }, { email: 'secretaria_test@saludgoya.com', password: 'test1234' });
    const secToken = secRes.data.token;
    console.log("Secretaria Login:", secRes.status === 200 ? "PASS" : "FAIL");

    // 4. Test 7: Secretary unauthorized history access (403)
    const secAccessRes = await request(API+'/historias/paciente/'+falsePacId, { method: 'GET', headers: { 'Authorization': 'Bearer ' + secToken } });
    console.log("Test 7 (Secretaria accesses patient history): Expected 403, got", secAccessRes.status, "=>", secAccessRes.status === 403 ? "PASS" : "FAIL");

    console.log("=== ALL API TESTS COMPLETED ===");
  } catch(e) {
    console.error("Test execution failed:", e.message);
  }
}
runTests();
