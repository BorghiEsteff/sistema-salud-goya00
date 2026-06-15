require('dotenv').config();
const pool = require('./src/config/db');

const intrusos = [
  'de19c0d8-e389-4ef0-85ca-31635856a664',
  'b9e20946-515f-48ea-b00a-55d9b59fc13c',
  'ed2499bb-69d8-400a-abda-71ec9f6e6156',
  'cb3b9cb7-739a-4c2d-8064-0814f22afbb4',
  '1d52c271-4e50-4315-b4df-8200474930b3',
  '10ca5af0-341f-43ee-ae9e-a2c3ffbb81e0'
];

async function bloquearIntrusos() {
  try {
    const idsString = intrusos.map(id => `'${id}'`).join(', ');
    const query = `
      UPDATE usuarios 
      SET activo = FALSE 
      WHERE id IN (${idsString}) 
      RETURNING id, email, activo;
    `;
    
    const result = await pool.query(query);
    console.table(result.rows);
    console.log(`Cuentas bloqueadas exitosamente: ${result.rowCount}`);
  } catch (err) {
    console.error('Error al actualizar las cuentas:', err);
  } finally {
    process.exit(0);
  }
}

bloquearIntrusos();
