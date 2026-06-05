require('dotenv').config();
const pool = require('./src/config/db');

pool.query("UPDATE usuarios SET password_hash = '$2b$10$4A87pw2VP2IEomNyfZMhFOQ2tGRo5pk3tUDnd0lOkyN4j6jrPFzzW' WHERE email = 'admin@saludgoya.com'")
  .then(() => {
    console.log('Contraseña actualizada correctamente en la BD.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
