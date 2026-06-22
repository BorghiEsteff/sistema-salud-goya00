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
    const { telefono, direccion, obra_social } = req.body;
    const result = await db.query(
      'UPDATE pacientes SET telefono = COALESCE($1, telefono), direccion = COALESCE($2, direccion), obra_social = COALESCE($3, obra_social) WHERE id = $4 RETURNING *',
      [telefono, direccion, obra_social, id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Listado de todos los pacientes (Solo Admin y Secretaría)
async function getAllPacientes(req, res, next) {
  try {
    const { page, limit, nombre, apellido, dni, estado_cuenta } = req.query;
    
    let query = 'SELECT p.*, u.email FROM pacientes p JOIN usuarios u ON p.usuario_id = u.id WHERE 1=1';
    const params = [];
    
    if (nombre) {
      params.push(`%${nombre}%`);
      query += ` AND p.nombre ILIKE $${params.length}`;
    }
    if (apellido) {
      params.push(`%${apellido}%`);
      query += ` AND p.apellido ILIKE $${params.length}`;
    }
    if (dni) {
      params.push(`%${dni}%`);
      query += ` AND p.dni ILIKE $${params.length}`;
    }
    if (estado_cuenta) {
      params.push(estado_cuenta);
      query += ` AND p.estado_cuenta = $${params.length}`;
    }

    query += ' ORDER BY p.activo DESC, p.apellido ASC';

    if (page) {
      const p = parseInt(page) || 1;
      const l = parseInt(limit) || 10;
      const offset = (p - 1) * l;

      const countRes = await db.query(`SELECT COUNT(*) FROM (${query}) AS subquery`, params);
      const total = parseInt(countRes.rows[0].count);

      params.push(l, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
      
      const result = await db.query(query, params);
      res.json({ data: result.rows, total, page: p, pages: Math.ceil(total / l) });
    } else {
      const result = await db.query(query, params);
      res.json(result.rows);
    }
  } catch (err) { next(err); }
}

// --- GESTIÓN DE SUSPENSIONES (ADMINS Y MÉDICOS) ---
async function suspenderPaciente(req, res, next) {
  try {
    const { id } = req.params;
    const dias = parseInt(req.body.dias) || 15;
    
    const fechaSuspension = new Date();
    fechaSuspension.setDate(fechaSuspension.getDate() + dias);
    
    const result = await db.query(`
      UPDATE pacientes
      SET estado_cuenta = 'suspendido', suspension_hasta = $1
      WHERE id = $2 RETURNING id, estado_cuenta, suspension_hasta
    `, [fechaSuspension.toISOString(), id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    
    // Registrar auditoría
    await db.query(`
      INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
      VALUES ('pacientes', $1, 'UPDATE', 'estado_cuenta', 'activo', 'suspendido (manual)', $2)
    `, [id, req.usuario.id]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function levantarSuspension(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(`
      UPDATE pacientes
      SET estado_cuenta = 'activo', inasistencias_recientes = 0, suspension_hasta = NULL
      WHERE id = $1 RETURNING id, estado_cuenta
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    
    // Registrar auditoría
    await db.query(`
      INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
      VALUES ('pacientes', $1, 'UPDATE', 'estado_cuenta', 'suspendido', 'activo (manual)', $2)
    `, [id, req.usuario.id]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

module.exports = { 
  autoRegistro, 
  getPerfil, 
  updatePerfil, 
  getAllPacientes,
  suspenderPaciente,
  levantarSuspension 
};
