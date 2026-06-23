require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

async function createAdmin() {
  const email = 'admin@saludgoya.com';
  const password = 'admin'; // Contraseña que usarás para entrar
  
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Verificamos si el admin ya existe (de cuando corrimos el seed)
    const res = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (res.rows.length > 0) {
      // Si existe, le arreglamos la contraseña rota
      await pool.query('UPDATE usuarios SET password_hash = $1, rol = $2 WHERE email = $3', [passwordHash, 'admin', email]);
      console.log('✅ Cuenta de administrador arreglada con éxito.');
    } else {
      // Si no existe, la creamos de cero
      await pool.query('INSERT INTO usuarios (email, password_hash, rol) VALUES ($1, $2, $3)', [email, passwordHash, 'admin']);
      console.log('✅ Cuenta de administrador creada con éxito.');
    }
    
    console.log('\n--- DATOS DE ACCESO ---');
    console.log('Correo: admin@saludgoya.com');
    console.log('Contraseña: admin');
    
  } catch (error) {
    console.error('❌ Error al crear el admin:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
