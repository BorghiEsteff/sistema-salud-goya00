const bcrypt = require('bcryptjs');
const db = require('../config/db');

// --- ESPECIALIDADES ---
async function getEspecialidades(req, res, next) {
  try {
    const result = await db.query(`
      SELECT e.*,
        COUNT(m.id) FILTER (WHERE m.activo = true) AS medicos_activos_count
      FROM especialidades e
      LEFT JOIN medicos m ON m.especialidad_id = e.id
      GROUP BY e.id
      ORDER BY e.activo DESC, e.nombre ASC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function createEspecialidad(req, res, next) {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const result = await db.query(
      'INSERT INTO especialidades (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteEspecialidad(req, res, next) {
  try {
    const { id } = req.params;
    // Baja lógica según regla #1
    await db.query('UPDATE especialidades SET activo = FALSE WHERE id = $1', [id]);
    await db.query(`INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_anterior, valor_nuevo, usuario_id) VALUES ('especialidades', $1, 'DELETE_LOGICO', 'activo', 'true', 'false', $2)`, [id, req.usuario.id]);
    res.json({ message: 'Especialidad eliminada lógicamente' });
  } catch (err) { next(err); }
}

// --- MÉDICOS ---
async function getMedicos(req, res, next) {
  try {
    const { especialidad_id, activo, nombre, page, limit } = req.query;
    let query = `
      SELECT m.id, m.nombre, m.apellido, m.matricula, m.telefono, m.activo, m.precio_consulta, m.modalidad_pago, 
             e.nombre as especialidad, u.email,
             CASE 
               WHEN CURRENT_DATE >= m.ausente_desde AND CURRENT_DATE <= m.ausente_hasta THEN 'ausente' 
               ELSE 'activo' 
             END AS estado_disponibilidad
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      LEFT JOIN especialidades e ON m.especialidad_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (especialidad_id) {
      params.push(especialidad_id);
      query += ` AND m.especialidad_id = $${params.length}`;
    }
    if (activo !== undefined) {
      params.push(activo === 'true');
      query += ` AND m.activo = $${params.length}`;
    }
    if (nombre) {
      params.push(`%${nombre}%`);
      query += ` AND (m.nombre ILIKE $${params.length} OR m.apellido ILIKE $${params.length})`;
    }

    query += ` ORDER BY m.activo DESC, m.apellido ASC`;

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

async function createMedico(req, res, next) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { email, password, nombre, apellido, matricula, especialidad_id, telefono } = req.body;
    
    // 1. Crear usuario
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userRes = await client.query(
      "INSERT INTO usuarios (email, password_hash, rol) VALUES ($1, $2, 'medico') RETURNING id",
      [email, hash]
    );
    const usuario_id = userRes.rows[0].id;

    // 2. Crear perfil médico
    const medRes = await client.query(
      'INSERT INTO medicos (usuario_id, nombre, apellido, matricula, especialidad_id, telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [usuario_id, nombre, apellido, matricula, especialidad_id, telefono]
    );

    // 3. Reactivar la especialidad si estaba inactiva
    if (especialidad_id) {
      await client.query('UPDATE especialidades SET activo = TRUE WHERE id = $1', [especialidad_id]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(medRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function updateMedico(req, res, next) {
  try {
    const { id } = req.params;
    const { precio_consulta, modalidad_pago } = req.body;
    const result = await db.query(`
      UPDATE medicos 
      SET precio_consulta = $1, modalidad_pago = $2
      WHERE id = $3 RETURNING *
    `, [precio_consulta || 0, modalidad_pago || 'on_site', id]);
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médico no encontrado' });
    
    await db.query(`INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_nuevo, usuario_id) VALUES ('medicos', $1, 'UPDATE', 'pagos', 'Precio o modalidad actualizados', $2)`, [id, req.usuario.id]);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// --- AUDITORÍA ---
async function getAuditoria(req, res, next) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    // Validación de formatos de fecha
    if (fecha_desde && isNaN(Date.parse(fecha_desde))) {
      return res.status(400).json({ error: 'Formato de fecha_desde inválido' });
    }
    if (fecha_hasta && isNaN(Date.parse(fecha_hasta))) {
      return res.status(400).json({ error: 'Formato de fecha_hasta inválido' });
    }

    let query = `
      SELECT l.*, u.email as admin_email,
             CASE 
               WHEN l.tabla_afectada = 'medicos' THEN (SELECT nombre || ' ' || apellido FROM medicos WHERE id::text = l.registro_id::text)
               WHEN l.tabla_afectada = 'pacientes' THEN (SELECT nombre || ' ' || apellido FROM pacientes WHERE id::text = l.registro_id::text)
               WHEN l.tabla_afectada = 'especialidades' THEN (SELECT nombre FROM especialidades WHERE id::text = l.registro_id::text)
               ELSE NULL
             END as nombre_afectado
      FROM logs_auditoria l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (fecha_desde) {
      params.push(fecha_desde);
      query += ` AND l.creado_en::date >= $${params.length}`;
    }
    if (fecha_hasta) {
      params.push(fecha_hasta);
      query += ` AND l.creado_en::date <= $${params.length}`;
    }
    
    query += ` ORDER BY l.creado_en DESC`;
    
    if (req.query.page) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const countRes = await db.query(`SELECT COUNT(*) FROM (${query}) AS subquery`, params);
      const total = parseInt(countRes.rows[0].count);

      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await db.query(query, params);
      res.json({ data: result.rows, total, page, pages: Math.ceil(total / limit) });
    } else {
      query += ` LIMIT 100`;
      const result = await db.query(query, params);
      res.json(result.rows);
    }
  } catch (err) { next(err); }
}

async function toggleMedicoStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const result = await db.query('UPDATE medicos SET activo = $1 WHERE id = $2 RETURNING *', [activo, id]);
    const medico = result.rows[0];
    await db.query(`INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_anterior, valor_nuevo, usuario_id) VALUES ('medicos', $1, 'UPDATE', 'activo', $2, $3, $4)`, [id, String(!activo), String(activo), req.usuario.id]);
    if (medico && activo) {
      // Reactivar especialidad si el medico vuelve a estar activo
      await db.query('UPDATE especialidades SET activo = TRUE WHERE id = $1', [medico.especialidad_id]);
    }
    res.json(medico);
  } catch(err) { next(err); }
}

async function togglePacienteStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const result = await db.query('UPDATE pacientes SET activo = $1 WHERE id = $2 RETURNING *', [activo, id]);
    await db.query(`INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_anterior, valor_nuevo, usuario_id) VALUES ('pacientes', $1, 'UPDATE', 'activo', $2, $3, $4)`, [id, String(!activo), String(activo), req.usuario.id]);
    res.json(result.rows[0]);
  } catch(err) { next(err); }
}

async function deletePacienteFisico(req, res, next) {
  const client = await db.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    
    // Primero, obtener el usuario_id asociado a este paciente
    const pacRes = await client.query('SELECT usuario_id FROM pacientes WHERE id = $1', [id]);
    if (pacRes.rowCount === 0) throw new Error('Paciente no encontrado');
    const usuarioId = pacRes.rows[0].usuario_id;
    
    // Eliminar dependencias primero
    await client.query('DELETE FROM archivos_adjuntos WHERE paciente_id = $1', [id]);
    await client.query('DELETE FROM historia_clinica WHERE paciente_id = $1', [id]);
    await client.query('DELETE FROM turnos WHERE paciente_id = $1', [id]);
    
    // Ahora eliminar el paciente
    await client.query('DELETE FROM pacientes WHERE id = $1', [id]);
    // Finalmente eliminar el usuario asociado
    await client.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
    
    // Auditoría
    await client.query(`INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_nuevo, usuario_id) VALUES ('pacientes', $1, 'DELETE', 'registros', 'Paciente eliminado físicamente', $2)`, [id, req.usuario.id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Paciente eliminado' });
  } catch(err) { 
    await client.query('ROLLBACK');
    next(err); 
  } finally {
    client.release();
  }
}

async function limpiarEspecialidadesVacias(req, res, next) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Identificar especialidades sin médicos activos o ya inactivadas
    const result = await client.query(`
      SELECT id FROM especialidades
      WHERE activo = FALSE
    `);
    
    const ids = result.rows.map(r => r.id);
    let eliminadas = 0;
    
    if (ids.length > 0) {
      // 2. Desvincular médicos inactivos de esas especialidades para evitar error de llave foránea
      await client.query('UPDATE medicos SET especialidad_id = NULL WHERE especialidad_id = ANY($1::int[])', [ids]);
      
      // 2.5 Desvincular de los turnos también
      await client.query('UPDATE turnos SET especialidad_id = NULL WHERE especialidad_id = ANY($1::int[])', [ids]);
      
      // 3. Eliminar físicamente
      const delRes = await client.query('DELETE FROM especialidades WHERE id = ANY($1::int[]) RETURNING id', [ids]);
      eliminadas = delRes.rowCount;
      
      // 4. Log
      await client.query(`INSERT INTO logs_auditoria (tabla_afectada, accion, campo_modificado, valor_nuevo, usuario_id) VALUES ('especialidades', 'DELETE_BULK', 'registros', 'Limpieza masiva: ' || $1 || ' especialidades eliminadas físicamente', $2)`, [eliminadas, req.usuario.id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Limpieza exitosa', inactivadas: eliminadas });
  } catch(err) { 
    await client.query('ROLLBACK');
    next(err); 
  } finally {
    client.release();
  }
}

// --- EXPORTACIÓN CSV ---
async function exportarAuditoriaCSV(req, res, next) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    if (fecha_desde && isNaN(Date.parse(fecha_desde))) {
      return res.status(400).json({ error: 'Formato de fecha_desde inválido' });
    }
    if (fecha_hasta && isNaN(Date.parse(fecha_hasta))) {
      return res.status(400).json({ error: 'Formato de fecha_hasta inválido' });
    }

    let query = `
      SELECT
        l.id,
        l.creado_en,
        u.email AS admin_email,
        l.accion,
        l.tabla_afectada,
        l.campo_modificado,
        l.valor_anterior,
        l.valor_nuevo,
        l.ip_address,
        CASE
          WHEN l.tabla_afectada = 'medicos' THEN (SELECT nombre || ' ' || apellido FROM medicos WHERE id::text = l.registro_id::text)
          WHEN l.tabla_afectada = 'pacientes' THEN (SELECT nombre || ' ' || apellido FROM pacientes WHERE id::text = l.registro_id::text)
          WHEN l.tabla_afectada = 'especialidades' THEN (SELECT nombre FROM especialidades WHERE id::text = l.registro_id::text)
          ELSE NULL
        END AS nombre_afectado
      FROM logs_auditoria l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (fecha_desde) {
      params.push(fecha_desde);
      query += ` AND l.creado_en::date >= $${params.length}`;
    }
    if (fecha_hasta) {
      params.push(fecha_hasta);
      query += ` AND l.creado_en::date <= $${params.length}`;
    }
    query += ` ORDER BY l.creado_en DESC`;

    const result = await db.query(query, params);

    // Construcción del CSV
    const cabeceras = ['ID', 'Fecha y Hora', 'Admin', 'Accion', 'Tabla', 'Campo', 'Valor Anterior', 'Valor Nuevo', 'IP', 'Nombre Afectado'];

    const escaparCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const filas = result.rows.map(log => [
      escaparCSV(log.id),
      escaparCSV(new Date(log.creado_en).toLocaleString('es-AR')),
      escaparCSV(log.admin_email || 'Sistema'),
      escaparCSV(log.accion),
      escaparCSV(log.tabla_afectada),
      escaparCSV(log.campo_modificado),
      escaparCSV(log.valor_anterior),
      escaparCSV(log.valor_nuevo),
      escaparCSV(log.ip_address),
      escaparCSV(log.nombre_afectado)
    ].join(','));

    const csvContent = [cabeceras.join(','), ...filas].join('\n');
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const filename = `auditoria_${fechaArchivo}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM para que Excel reconozca UTF-8 correctamente
    res.send('\uFEFF' + csvContent);

  } catch (err) { next(err); }
}

// --- SECRETARÍAS ---
async function getSecretarias(req, res, next) {
  try {
    const result = await db.query(`
      SELECT s.id, s.nombre, s.apellido, s.activo, u.email
      FROM secretarias s
      JOIN usuarios u ON s.usuario_id = u.id
      ORDER BY s.activo DESC, s.apellido ASC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function createSecretaria(req, res, next) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { email, password, nombre, apellido } = req.body;
    
    // 1. Crear usuario
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userRes = await client.query(
      "INSERT INTO usuarios (email, password_hash, rol) VALUES ($1, $2, 'secretaria') RETURNING id",
      [email, hash]
    );
    const usuario_id = userRes.rows[0].id;

    // 2. Crear perfil secretaría
    const secRes = await client.query(
      'INSERT INTO secretarias (usuario_id, nombre, apellido) VALUES ($1, $2, $3) RETURNING *',
      [usuario_id, nombre, apellido]
    );

    // 3. Auditoría de creación
    await client.query(
      `INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_nuevo, usuario_id) VALUES ('secretarias', $1, 'INSERT', 'registros', 'Creación de secretaría', $2)`,
      [secRes.rows[0].id, req.usuario.id]
    );
    
    await client.query('COMMIT');
    res.status(201).json(secRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function toggleSecretariaStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const result = await db.query('UPDATE secretarias SET activo = $1 WHERE id = $2 RETURNING *', [activo, id]);
    const secretaria = result.rows[0];
    await db.query(`INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, campo_modificado, valor_anterior, valor_nuevo, usuario_id) VALUES ('secretarias', $1, 'UPDATE', 'activo', $2, $3, $4)`, [id, String(!activo), String(activo), req.usuario.id]);
    res.json(secretaria);
  } catch(err) { next(err); }
}

module.exports = {
  getEspecialidades, createEspecialidad, deleteEspecialidad, limpiarEspecialidadesVacias,
  getMedicos, createMedico, updateMedico, toggleMedicoStatus,
  getSecretarias, createSecretaria, toggleSecretariaStatus,
  togglePacienteStatus, deletePacienteFisico,
  getAuditoria, exportarAuditoriaCSV
};
