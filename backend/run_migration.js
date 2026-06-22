require('dotenv').config();
const db = require('./src/config/db');

async function migrate() {
  try {
    console.log('Aplicando migración de ausencias...');
    await db.query(`
      ALTER TABLE medicos
        ADD COLUMN IF NOT EXISTS ausente_desde DATE,
        ADD COLUMN IF NOT EXISTS ausente_hasta DATE,
        ADD COLUMN IF NOT EXISTS motivo_ausencia TEXT;
    `);
    console.log('Migración aplicada con éxito.');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}
migrate();
