const db = require('../config/db');
const { verificarDisponibilidad } = require('../services/disponibilidad.service');
const { verificarPacienteSuspendido } = require('../services/suspensiones.service');

// 1. Obtener disponibilidad de horarios libres
async function getDisponibilidad(req, res, next) {
  try {
    const { medico_id, fecha } = req.query;
    if (!medico_id || !fecha) return res.status(400).json({ error: 'Faltan parámetros (medico_id y fecha)' });

    // Rango horario estático (08:00 a 16:00, turnos de 30 min)
    const horariosPosibles = [
      '08:00:00', '08:30:00', '09:00:00', '09:30:00', '10:00:00', '10:30:00',
      '11:00:00', '11:30:00', '12:00:00', '12:30:00', '13:00:00', '13:30:00',
      '14:00:00', '14:30:00', '15:00:00', '15:30:00'
    ];

    const result = await db.query(`
      SELECT hora_inicio FROM turnos 
      WHERE medico_id = $1 AND fecha_turno = $2 AND estado NOT IN ('cancelado', 'ausente') AND activo = TRUE
    `, [medico_id, fecha]);
    
    const ocupados = result.rows.map(r => r.hora_inicio);
    const disponibles = horariosPosibles.filter(h => !ocupados.includes(h));

    res.json({ disponibles });
  } catch (err) { next(err); }
}

// 2. Reservar turno
async function reservarTurno(req, res, next) {
  try {
    const { medico_id, especialidad_id, fecha_turno, hora_inicio, motivo_consulta } = req.body;
    
    let paciente_id = req.body.paciente_id;
    if (req.usuario.rol === 'paciente') {
      paciente_id = req.usuario.paciente_id;
    }

    if (!paciente_id) return res.status(400).json({ error: 'Paciente no identificado' });

    // Verificación de reglas de negocio: ¿Está suspendido?
    const estadoPac = await verificarPacienteSuspendido(paciente_id);
    if (estadoPac.suspendido) {
      return res.status(403).json({ error: estadoPac.mensaje });
    }

    // Verificación de reglas de negocio: ¿Alguien le ganó de mano el turno?
    const disponible = await verificarDisponibilidad(medico_id, fecha_turno, hora_inicio);
    if (!disponible) {
      return res.status(400).json({ error: 'Lo sentimos, este horario acaba de ser ocupado.' });
    }

    // Calcular hora fin (+30 min)
    const horaF = new Date(`1970-01-01T${hora_inicio}Z`);
    horaF.setMinutes(horaF.getMinutes() + 30);
    const hora_fin = horaF.toISOString().substr(11, 8);

    const result = await db.query(`
      INSERT INTO turnos (paciente_id, medico_id, especialidad_id, fecha_turno, hora_inicio, hora_fin, estado, motivo_consulta, creado_por)
      VALUES ($1, $2, $3, $4, $5, $6, 'solicitado', $7, $8) RETURNING *
    `, [paciente_id, medico_id, especialidad_id, fecha_turno, hora_inicio, hora_fin, motivo_consulta, req.usuario.id]);

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

// 3. Cancelar turno
async function cancelarTurno(req, res, next) {
  try {
    const { id } = req.params;
    const { motivo_cancelacion } = req.body;

    if (req.usuario.rol === 'paciente') {
      const t = await db.query('SELECT paciente_id FROM turnos WHERE id = $1', [id]);
      if (!t.rows[0] || t.rows[0].paciente_id !== req.usuario.paciente_id) {
        return res.status(403).json({ error: 'No tienes permiso para cancelar este turno.' });
      }
    }

    const result = await db.query(`
      UPDATE turnos 
      SET estado = 'cancelado', cancelado_por = $1, motivo_cancelacion = $2
      WHERE id = $3 RETURNING *
    `, [req.usuario.id, motivo_cancelacion, id]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

// 4. Cambiar estado (confirmado, atendido, ausente)
async function cambiarEstado(req, res, next) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (req.usuario.rol === 'medico') {
      const t = await db.query('SELECT medico_id FROM turnos WHERE id = $1', [id]);
      if (!t.rows[0] || t.rows[0].medico_id !== req.usuario.medico_id) {
        return res.status(403).json({ error: 'No puedes modificar un turno que no te pertenece.' });
      }
    }

    const result = await db.query(`
      UPDATE turnos SET estado = $1 WHERE id = $2 RETURNING *
    `, [estado, id]);

    const turnoActualizado = result.rows[0];

    // Lógica de Suspensión Automática por Inasistencia
    if (estado === 'ausente') {
      const paciente_id = turnoActualizado.paciente_id;
      
      // Incrementar inasistencias
      await db.query(`
        UPDATE pacientes 
        SET inasistencias_recientes = inasistencias_recientes + 1 
        WHERE id = $1
      `, [paciente_id]);

      // Verificar si llegó a 2 o más
      const pacInfo = await db.query(`SELECT inasistencias_recientes FROM pacientes WHERE id = $1`, [paciente_id]);
      if (pacInfo.rows[0].inasistencias_recientes >= 2) {
        // Suspender por 15 días
        const fechaSuspension = new Date();
        fechaSuspension.setDate(fechaSuspension.getDate() + 15);
        await db.query(`
          UPDATE pacientes 
          SET estado_cuenta = 'suspendido', suspension_hasta = $1 
          WHERE id = $2
        `, [fechaSuspension.toISOString(), paciente_id]);
      }
    }

    res.json(turnoActualizado);
  } catch (err) { next(err); }
}

// 5. Listar turnos con filtros
async function getTurnos(req, res, next) {
  try {
    const { fecha, medico_id, paciente_id, estado } = req.query;
    let query = 'SELECT * FROM turnos WHERE activo = TRUE';
    const values = [];
    let counter = 1;

    if (fecha) { query += ` AND fecha_turno = $${counter++}`; values.push(fecha); }
    if (medico_id) { query += ` AND medico_id = $${counter++}`; values.push(medico_id); }
    if (estado) { query += ` AND estado = $${counter++}`; values.push(estado); }

    if (req.usuario.rol === 'paciente') {
      query += ` AND paciente_id = $${counter++}`; values.push(req.usuario.paciente_id);
    } else if (req.usuario.rol === 'medico') {
      query += ` AND medico_id = $${counter++}`; values.push(req.usuario.medico_id);
    } else if (paciente_id) {
      query += ` AND paciente_id = $${counter++}`; values.push(paciente_id);
    }

    query += ' ORDER BY fecha_turno DESC, hora_inicio ASC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = { getDisponibilidad, reservarTurno, cancelarTurno, cambiarEstado, getTurnos };
