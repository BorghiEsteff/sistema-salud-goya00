require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, 'sql', '06_notificaciones.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
    console.log('Migración completada con éxito. Tabla notificaciones creada.');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
