require('dotenv').config();
const pool = require('./src/config/db');
pool.query("UPDATE medicos SET activo = FALSE WHERE nombre LIKE '%Test%' OR apellido LIKE '%Test%' OR apellido = 'House'")
  .then(() => { console.log('Borrados'); process.exit(); })
  .catch(console.error);
