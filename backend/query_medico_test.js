require('dotenv').config();
const pool = require('./src/config/db');
pool.query("SELECT * FROM medicos WHERE usuario_id = '90f0b61d-f3e1-45a0-a859-2a6d568728c1';")
  .then(res => { console.table(res.rows); process.exit(0); })
  .catch(console.error);
