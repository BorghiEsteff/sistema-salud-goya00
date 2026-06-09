const db = require('../config/db');

async function crearHistoria(req, res, next) {
  try {
    const { turno_id, diagnostico, indicaciones, observaciones, proxima_consulta } = req.body;

    // 1. Obtener información del turno
    const t = await db.query(`SELECT estado, paciente_id, medico_id FROM turnos WHERE id = $1`, [turno_id]);
    
    if (t.rows.length === 0) {
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }

    const turno = t.rows[0];

    // 2. Verificación de Seguridad (Rol Médico)
    if (req.usuario.rol === 'medico' && turno.medico_id !== req.usuario.medico_id) {
      return res.status(403).json({ error: 'No puedes cargar historias de turnos que no te pertenecen.' });
    }

    // =========================================================================
    // REGLA MAESTRA EXPLÍCITA:
    // No se puede crear historia para un turno que no esté en estado 'atendido'
    // Documentado por requerimiento del Plan Maestro.
    // =========================================================================
    if (turno.estado !== 'atendido') {
      return res.status(400).json({ error: `ERROR: El turno debe estar obligatoriamente en estado 'atendido' para poder cargar su historia clínica. Estado actual: ${turno.estado}` });
    }

    // 4. Insertar la historia clínica
    const result = await db.query(`
      INSERT INTO historia_clinica (turno_id, paciente_id, medico_id, diagnostico, indicaciones, observaciones, proxima_consulta)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [turno_id, turno.paciente_id, turno.medico_id, diagnostico, indicaciones, observaciones, proxima_consulta || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una historia clínica cargada para este turno.' });
    }
    next(err);
  }
}

async function getHistoriaPaciente(req, res, next) {
  try {
    const { id } = req.params; // paciente_id

    if (req.usuario.rol === 'secretaria') {
      return res.status(403).json({ error: 'No tenés permisos para ver historias clínicas.' });
    }

    // Verificación de seguridad
    if (req.usuario.rol === 'paciente' && req.usuario.paciente_id !== id) {
      return res.status(403).json({ error: 'No tienes permiso para ver la historia clínica de este paciente.' });
    }

    if (req.usuario.rol === 'medico') {
      const t = await db.query(
        `SELECT 1 FROM turnos 
         WHERE medico_id = $1 
           AND paciente_id = $2 
           AND estado IN ('solicitado', 'confirmado', 'atendido')
         LIMIT 1`,
        [req.usuario.medico_id, id]
      );
      if (t.rows.length === 0) {
        return res.status(403).json({ error: 'No tenés acceso al historial de este paciente.' });
      }
    }

    const result = await db.query(`
      SELECT h.*, 
             m.nombre AS medico_nombre, m.apellido AS medico_apellido, m.matricula,
             t.fecha_turno
      FROM historia_clinica h
      JOIN medicos m ON h.medico_id = m.id
      JOIN turnos t ON h.turno_id = t.id
      WHERE h.paciente_id = $1
      ORDER BY t.fecha_turno DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { crearHistoria, getHistoriaPaciente };
