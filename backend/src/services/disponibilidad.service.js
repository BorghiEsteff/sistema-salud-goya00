const db = require('../config/db');

// Verifica si un médico tiene libre un horario específico
async function verificarDisponibilidad(medico_id, fecha, hora_inicio) {
  const { rows } = await db.query(`
    SELECT id FROM turnos
    WHERE medico_id = $1
      AND fecha_turno = $2
      AND hora_inicio = $3
      AND estado NOT IN ('cancelado', 'ausente')
      AND activo = TRUE
    LIMIT 1
  `, [medico_id, fecha, hora_inicio]);

  // Si no hay filas, significa que está disponible (true)
  return rows.length === 0;
}

module.exports = { verificarDisponibilidad };
