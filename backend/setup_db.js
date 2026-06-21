const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function setup() {
  try {
    const files = ['01_schema.sql', '02_constraints.sql', '03_triggers.sql', '04_seed.sql'];
    for (const file of files) {
      console.log(`Ejecutando ${file}...`);
      const sql = fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8');
      await pool.query(sql);
      console.log(`${file} ejecutado correctamente.`);
    }
    console.log('Base de datos configurada con éxito.');
  } catch (error) {
    console.error('Error configurando la base de datos:', error);
  } finally {
    await pool.end();
  }
}

setup();
