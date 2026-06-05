const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Registro estricto desde frontend (Público)
async function autoRegistro(req, res, next) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { email, password, nombre, apellido, dni, fecha_nacimiento, telefono, direccion } = req.body;
    
    // Validación estricta del DNI (7 a 9 dígitos numéricos)
    if (!/^\d{7,9}$/.test(dni)) {
      return res.status(400).json({ error: 'DNI inválido. Debe contener entre 7 y 9 dígitos numéricos.' });
    }

    // 1. Crear Usuario
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userRes = await client.query(
      "INSERT INTO usuarios (email, password_hash, rol) VALUES ($1, $2, 'paciente') RETURNING id",
      [email, hash]
    );
    const usuario_id = userRes.rows[0].id;

    const pacRes = await client.query(
      'INSERT INTO pacientes (usuario_id, nombre, apellido, dni, fecha_nacimiento, telefono, direccion) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [usuario_id, nombre, apellido, dni, fecha_nacimiento, telefono, direccion || null]
    );
    
    await client.query('COMMIT');
    res.status(201).json(pacRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Obtener perfil propio (o de cualquier paciente si eres admin)
async function getPerfil(req, res, next) {
  try {
    // Si el rol es paciente, se fuerza a ver solo su propio ID sacado del token JWT
    const id = req.usuario.rol === 'paciente' ? req.usuario.paciente_id : req.params.id;
    const result = await db.query('SELECT * FROM pacientes WHERE id = $1', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Actualizar perfil (teléfono y dirección)
async function updatePerfil(req, res, next) {
  try {
    const id = req.usuario.rol === 'paciente' ? req.usuario.paciente_id : req.params.id;
    const { telefono, direccion } = req.body;
    const result = await db.query(
      'UPDATE pacientes SET telefono = COALESCE($1, telefono), direccion = COALESCE($2, direccion) WHERE id = $3 RETURNING *',
      [telefono, direccion, id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Listado de todos los pacientes (Solo Admin y Secretaría)
async function getAllPacientes(req, res, next) {
  try {
    const result = await db.query('SELECT p.*, u.email FROM pacientes p JOIN usuarios u ON p.usuario_id = u.id ORDER BY p.activo DESC, p.apellido ASC');
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = {
  autoRegistro, getPerfil, updatePerfil, getAllPacientes
};
