require('dotenv').config();
const pool = require('./src/config/db');
const query = `
  SELECT u.id, u.email, u.rol, u.creado_en
  FROM usuarios u
  LEFT JOIN medicos m ON m.usuario_id = u.id
  WHERE u.rol = 'medico' AND m.id IS NULL
  ORDER BY u.creado_en DESC;
`;
pool.query(query).then(res => {
  console.table(res.rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
