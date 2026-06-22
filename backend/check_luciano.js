require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const p = await db.query("SELECT * FROM pacientes WHERE nombre ILIKE '%luciano%' OR apellido ILIKE '%luciano%'");
    console.log('--- Pacientes ---');
    console.log(p.rows);

    const m = await db.query("SELECT * FROM medicos WHERE nombre ILIKE '%luciano%' OR apellido ILIKE '%luciano%'");
    console.log('--- Medicos ---');
    console.log(m.rows);

    const u = await db.query("SELECT * FROM usuarios WHERE email ILIKE '%luciano%'");
    console.log('--- Usuarios por email ---');
    console.log(u.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
