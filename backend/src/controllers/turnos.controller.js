const db = require('../config/db');
const { verificarDisponibilidad } = require('../services/disponibilidad.service');
const { verificarPacienteSuspendido } = require('../services/suspensiones.service');
const { notificarYEnviar } = require('../services/notificaciones.service');

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

    // Verificar si el médico está ausente ese día
    const medRes = await db.query(`
      SELECT id FROM medicos 
      WHERE id = $1 AND $2::DATE >= ausente_desde AND $2::DATE <= ausente_hasta
    `, [medico_id, fecha]);
    if (medRes.rows.length > 0) {
      return res.json({ disponibles: [] }); // No hay turnos si está ausente
    }

    const result = await db.query(`
      SELECT hora_inicio FROM turnos 
      WHERE medico_id = $1 AND fecha_turno = $2 AND estado NOT IN ('cancelado', 'ausente') AND activo = TRUE
    `, [medico_id, fecha]);
    
    const ocupados = result.rows.map(r => r.hora_inicio);
    const disponibles = horariosPosibles.map(h => ({
      hora: h,
      disponible: !ocupados.includes(h)
    }));

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
      return res.status(400).json({ error: estadoPac.mensaje });
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

    // Lógica de pagos (Sprint 4)
    const mRes = await db.query('SELECT modalidad_pago, precio_consulta, nombre, apellido FROM medicos WHERE id = $1', [medico_id]);
    const pRes = await db.query('SELECT obra_social FROM pacientes WHERE id = $1', [paciente_id]);
    
    if (!mRes.rows[0]) return res.status(404).json({ error: 'Médico no encontrado' });
    if (!pRes.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' });

    const modalidad = mRes.rows[0].modalidad_pago;
    const precio = mRes.rows[0].precio_consulta || 0;
    const medicoNombreCompleto = `${mRes.rows[0].nombre} ${mRes.rows[0].apellido}`;
    const obraSocial = pRes.rows[0].obra_social;

    let estado = 'solicitado';
    let estado_pago = 'pendiente';

    if (obraSocial || modalidad === 'on_site') {
      estado = 'confirmado';
      estado_pago = 'no_requerido';
    }

    const result = await db.query(`
      INSERT INTO turnos (paciente_id, medico_id, especialidad_id, fecha_turno, hora_inicio, hora_fin, estado, motivo_consulta, creado_por, estado_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `, [paciente_id, medico_id, especialidad_id, fecha_turno, hora_inicio, hora_fin, estado, motivo_consulta, req.usuario.id, estado_pago]);

    const turnoActualizado = result.rows[0];

    if (estado_pago === 'pendiente') {
      await db.query(`
        INSERT INTO pagos (turno_id, paciente_id, monto, moneda, estado)
        VALUES ($1, $2, $3, 'ARS', 'pendiente')
      `, [turnoActualizado.id, paciente_id, precio]);
    }

    // Notificación Sprint 4 (Notificaciones)
    await notificarYEnviar({
      paciente_id: turnoActualizado.paciente_id,
      turno_id: turnoActualizado.id,
      tipo: 'turno_reservado',
      titulo: 'Turno confirmado',
      mensaje: `Tu turno con ${medicoNombreCompleto} para el ${fecha_turno} a las ${hora_inicio.substring(0, 5)} fue reservado.`,
      claveIdempotencia: `turno_reservado:${turnoActualizado.id}`
    });

    res.status(201).json(turnoActualizado);
  } catch (err) { next(err); }
}

// 3. Cancelar turno
async function cancelarTurno(req, res, next) {
  try {
    const { id } = req.params;
    const { motivo_cancelacion } = req.body;

    const t = await db.query('SELECT paciente_id, estado_pago FROM turnos WHERE id = $1', [id]);
    const turno = t.rows[0];
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    if (req.usuario.rol === 'paciente') {
      if (turno.paciente_id !== req.usuario.paciente_id) {
        return res.status(403).json({ error: 'No tienes permiso para cancelar este turno.' });
      }
      if (turno.estado_pago === 'pagado') {
        return res.status(403).json({ error: 'El turno ya fue pagado y no puede cancelarse desde aquí. Por favor, acércate al consultorio.' });
      }
    }

    // Si es admin/secretaria y está pagado -> reembolso
    if ((req.usuario.rol === 'admin' || req.usuario.rol === 'secretaria') && turno.estado_pago === 'pagado') {
      const pagosService = require('../services/pagos.service');
      try {
        await pagosService.reembolsar(id);
      } catch (err) {
        return res.status(500).json({ error: 'Error al procesar el reembolso en MP: ' + err.message });
      }
    }

    const result = await db.query(`
      UPDATE turnos 
      SET estado = 'cancelado', cancelado_por = $1, motivo_cancelacion = $2
      WHERE id = $3 RETURNING *
    `, [req.usuario.id, motivo_cancelacion, id]);

    const turnoCancelado = result.rows[0];

    // Obtener info del médico para el mensaje
    const mInfo = await db.query('SELECT nombre, apellido FROM medicos WHERE id = $1', [turnoCancelado.medico_id]);
    const mNombre = mInfo.rows[0] ? `${mInfo.rows[0].nombre} ${mInfo.rows[0].apellido}` : 'el médico';

    const fechaFormat = new Date(turnoCancelado.fecha_turno).toLocaleDateString('es-AR');
    await notificarYEnviar({
      paciente_id: turnoCancelado.paciente_id,
      turno_id: turnoCancelado.id,
      tipo: 'turno_cancelado',
      titulo: 'Turno cancelado',
      mensaje: `Tu turno con ${mNombre} para el ${fechaFormat} a las ${turnoCancelado.hora_inicio.substring(0, 5)} ha sido cancelado.`,
      claveIdempotencia: `turno_cancelado:${turnoCancelado.id}`
    });

    res.json(turnoCancelado);
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

        await notificarYEnviar({
          paciente_id: paciente_id,
          turno_id: turnoActualizado.id,
          tipo: 'paciente_suspendido',
          titulo: 'Cuenta suspendida',
          mensaje: 'Tu cuenta ha sido temporalmente suspendida debido a reiteradas inasistencias a turnos sin previo aviso.',
          claveIdempotencia: `paciente_suspendido:${paciente_id}:${Date.now()}`
        });
      }

      await notificarYEnviar({
        paciente_id: paciente_id,
        turno_id: turnoActualizado.id,
        tipo: 'turno_ausente',
        titulo: 'Inasistencia a turno',
        mensaje: `Se ha registrado una inasistencia a tu turno del día de hoy. Acumular inasistencias derivará en una suspensión automática.`,
        claveIdempotencia: `turno_ausente:${turnoActualizado.id}`
      });
    }

    res.json(turnoActualizado);
  } catch (err) { next(err); }
}

// 5. Listar turnos con filtros
async function getTurnos(req, res, next) {
  try {
    const { fecha, medico_id, paciente_id, estado, estado_pago } = req.query;
    let query = 'SELECT t.*, p.nombre as paciente_nombre, p.apellido as paciente_apellido, m.nombre as medico_nombre, m.apellido as medico_apellido, e.nombre as especialidad_nombre FROM turnos t JOIN pacientes p ON t.paciente_id = p.id JOIN medicos m ON t.medico_id = m.id LEFT JOIN especialidades e ON t.especialidad_id = e.id WHERE t.activo = TRUE';
    const values = [];
    let counter = 1;

    if (fecha) { query += ` AND t.fecha_turno = $${counter++}`; values.push(fecha); }
    if (medico_id) { query += ` AND t.medico_id = $${counter++}`; values.push(medico_id); }
    if (estado) { query += ` AND t.estado = $${counter++}`; values.push(estado); }
    if (estado_pago) { query += ` AND t.estado_pago = $${counter++}`; values.push(estado_pago); }

    if (req.usuario.rol === 'paciente') {
      query += ` AND t.paciente_id = $${counter++}`; values.push(req.usuario.paciente_id);
    } else if (req.usuario.rol === 'medico') {
      query += ` AND t.medico_id = $${counter++}`; values.push(req.usuario.medico_id);
    } else if (paciente_id) {
      query += ` AND t.paciente_id = $${counter++}`; values.push(paciente_id);
    }

    query += ' ORDER BY t.fecha_turno DESC, t.hora_inicio ASC';

    if (req.query.page) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      const countRes = await db.query(`SELECT COUNT(*) FROM (${query}) AS subquery`, values);
      const total = parseInt(countRes.rows[0].count);
      
      values.push(limit, offset);
      query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
      
      const result = await db.query(query, values);
      res.json({ data: result.rows, total, page, pages: Math.ceil(total / limit) });
    } else {
      const result = await db.query(query, values);
      res.json(result.rows);
    }
  } catch (err) { next(err); }
}

module.exports = { getDisponibilidad, reservarTurno, cancelarTurno, cambiarEstado, getTurnos };
