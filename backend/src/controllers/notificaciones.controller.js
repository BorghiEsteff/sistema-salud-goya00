const db = require('../config/db');
const { notificarYEnviar } = require('../services/notificaciones.service');

async function getNotificaciones(req, res, next) {
  try {
    const paciente_id = req.usuario.paciente_id;
    const result = await db.query(`
      SELECT * FROM notificaciones 
      WHERE paciente_id = $1 AND activo = TRUE 
      ORDER BY creado_en DESC 
      LIMIT 50
    `, [paciente_id]);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getNoLeidasCount(req, res, next) {
  try {
    const paciente_id = req.usuario.paciente_id;
    const result = await db.query(`
      SELECT COUNT(*) as count FROM notificaciones 
      WHERE paciente_id = $1 AND leida = FALSE AND activo = TRUE
    `, [paciente_id]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { next(err); }
}

async function marcarLeida(req, res, next) {
  try {
    const paciente_id = req.usuario.paciente_id;
    const { id } = req.params;

    const notif = await db.query('SELECT paciente_id FROM notificaciones WHERE id = $1', [id]);
    if (notif.rows.length === 0) return res.status(404).json({ error: 'Notificación no encontrada' });
    if (notif.rows[0].paciente_id !== paciente_id) return res.status(403).json({ error: 'No tienes permiso para modificar esta notificación' });

    const result = await db.query(`
      UPDATE notificaciones SET leida = TRUE, leida_en = NOW() WHERE id = $1 RETURNING *
    `, [id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function marcarTodasLeidas(req, res, next) {
  try {
    const paciente_id = req.usuario.paciente_id;
    await db.query(`
      UPDATE notificaciones SET leida = TRUE, leida_en = NOW() 
      WHERE paciente_id = $1 AND leida = FALSE
    `, [paciente_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function dispararRecordatorios(req, res, next) {
  try {
    const secret = process.env.CRON_SECRET;
    const incomingSecret = req.headers['x-cron-secret'];
    if (!secret || incomingSecret !== secret) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaSql = manana.toISOString().split('T')[0];

    const result = await db.query(`
      SELECT t.id, t.paciente_id, t.fecha_turno, t.hora_inicio, m.nombre as medico_nombre, m.apellido as medico_apellido
      FROM turnos t
      JOIN medicos m ON t.medico_id = m.id
      WHERE t.fecha_turno = $1 AND t.estado IN ('solicitado', 'confirmado') AND t.activo = TRUE
    `, [fechaSql]);

    let procesados = 0;
    let notificaciones_creadas = 0;

    for (const turno of result.rows) {
      procesados++;
      await notificarYEnviar({
        paciente_id: turno.paciente_id,
        turno_id: turno.id,
        tipo: 'recordatorio_24h',
        titulo: 'Recordatorio de turno',
        mensaje: `Tienes un turno programado para mañana con ${turno.medico_nombre} ${turno.medico_apellido} a las ${turno.hora_inicio.substring(0, 5)}.`,
        claveIdempotencia: `recordatorio_24h:${turno.id}`
      });
      notificaciones_creadas++;
    }

    res.json({ procesados, notificaciones_creadas });
  } catch (err) { next(err); }
}

module.exports = {
  getNotificaciones,
  getNoLeidasCount,
  marcarLeida,
  marcarTodasLeidas,
  dispararRecordatorios
};
