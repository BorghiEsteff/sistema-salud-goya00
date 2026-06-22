const db = require('../config/db');

// Obtener el perfil propio del médico logueado
async function getPerfil(req, res, next) {
  try {
    const medico_id = req.usuario.medico_id;
    const result = await db.query(`
      SELECT m.*, e.nombre as especialidad 
      FROM medicos m 
      LEFT JOIN especialidades e ON m.especialidad_id = e.id 
      WHERE m.id = $1 AND m.activo = TRUE
    `, [medico_id]);
    
    if (!result.rows[0]) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Obtener agenda del médico logueado (turnos asignados)
async function getMiAgenda(req, res, next) {
  try {
    const medico_id = req.usuario.medico_id;
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0]; // Hoy por defecto

    const result = await db.query(`
      SELECT t.id, t.fecha_turno, t.hora_inicio, t.hora_fin, t.estado, t.motivo_consulta, t.paciente_id,
             p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.dni
      FROM turnos t
      JOIN pacientes p ON t.paciente_id = p.id
      WHERE t.medico_id = $1 AND t.fecha_turno = $2 AND t.activo = TRUE
      ORDER BY t.hora_inicio ASC
    `, [medico_id, fecha]);

    res.json(result.rows);
  } catch (err) { next(err); }
}

// Actualizar perfil (teléfono, precio, modalidad)
async function updatePerfil(req, res, next) {
  try {
    const id = req.usuario.rol === 'medico' ? req.usuario.medico_id : req.params.id;
    const { telefono, precio_consulta, modalidad_pago } = req.body;
    
    // Solo permitimos on_site o prepaid
    if (modalidad_pago && !['on_site', 'prepaid'].includes(modalidad_pago)) {
      return res.status(400).json({ error: 'Modalidad de pago inválida' });
    }

    const result = await db.query(`
      UPDATE medicos 
      SET 
        telefono = COALESCE($1, telefono),
        precio_consulta = COALESCE($2, precio_consulta),
        modalidad_pago = COALESCE($3, modalidad_pago)
      WHERE id = $4 RETURNING *
    `, [telefono, precio_consulta, modalidad_pago, id]);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Registrar Aviso de Ausencia
async function registrarAviso(req, res, next) {
  try {
    const medico_id = req.usuario.medico_id;
    const { ausente_desde, ausente_hasta, motivo_ausencia } = req.body;

    if (!ausente_desde || !ausente_hasta || !motivo_ausencia) {
      return res.status(400).json({ error: 'Faltan datos para el aviso' });
    }

    if (new Date(ausente_desde) > new Date(ausente_hasta)) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior o igual a la de fin' });
    }

    // Verificar que no tenga turnos activos en ese periodo
    const turnosConflictivos = await db.query(`
      SELECT id FROM turnos 
      WHERE medico_id = $1 
        AND fecha_turno >= $2 
        AND fecha_turno <= $3 
        AND estado IN ('solicitado', 'confirmado')
        AND activo = TRUE
    `, [medico_id, ausente_desde, ausente_hasta]);

    if (turnosConflictivos.rows.length > 0) {
      return res.status(400).json({ 
        error: `No puedes marcar ausencia porque tienes ${turnosConflictivos.rows.length} turno(s) pendiente(s) en ese periodo.` 
      });
    }

    const result = await db.query(`
      UPDATE medicos 
      SET 
        ausente_desde = $1,
        ausente_hasta = $2,
        motivo_ausencia = $3
      WHERE id = $4 RETURNING *
    `, [ausente_desde, ausente_hasta, motivo_ausencia, medico_id]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// Cancelar Aviso de Ausencia
async function cancelarAviso(req, res, next) {
  try {
    const medico_id = req.usuario.medico_id;
    
    const result = await db.query(`
      UPDATE medicos 
      SET 
        ausente_desde = NULL,
        ausente_hasta = NULL,
        motivo_ausencia = NULL
      WHERE id = $1 RETURNING *
    `, [medico_id]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

module.exports = { getPerfil, getMiAgenda, updatePerfil, registrarAviso, cancelarAviso };
