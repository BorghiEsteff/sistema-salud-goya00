require('dotenv').config();
const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function crear() {
  try {
    const email = 'paciente@saludgoya.com';
    const password_hash = await bcrypt.hash('password', 10);
    
    // Insertar usuario
    const userRes = await db.query(`
      INSERT INTO usuarios (email, password_hash, rol)
      VALUES ($1, $2, 'paciente')
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      RETURNING id
    `, [email, password_hash]);
    
    const usuario_id = userRes.rows[0].id;

    // Insertar paciente
    await db.query(`
      INSERT INTO pacientes (usuario_id, nombre, apellido, dni, fecha_nacimiento, telefono, direccion)
      VALUES ($1, 'Juan', 'Pérez', '12345678', '1990-01-01', '123456', 'Calle Falsa 123')
      ON CONFLICT (usuario_id) DO NOTHING
    `, [usuario_id]);

    console.log('Paciente creado: paciente@saludgoya.com / password');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

crear();
