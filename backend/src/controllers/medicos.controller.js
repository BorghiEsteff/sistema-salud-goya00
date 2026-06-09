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

module.exports = { getPerfil, getMiAgenda };
