const db = require('../config/db');

// Motor secundario de verificación de suspensiones.
// Se ejecuta antes de procesar una nueva reserva para bloquearla si corresponde.
async function verificarPacienteSuspendido(paciente_id) {
  const { rows } = await db.query(`
    SELECT estado_cuenta, suspension_hasta
    FROM pacientes
    WHERE id = $1 AND activo = TRUE
  `, [paciente_id]);

  if (!rows[0]) throw new Error('Paciente no encontrado');

  const { estado_cuenta, suspension_hasta } = rows[0];

  if (estado_cuenta === 'suspendido') {
    // Verificar si la suspensión temporal ya expiró de forma natural
    if (suspension_hasta && new Date(suspension_hasta) < new Date()) {
      // Levantar suspensión automáticamente
      await db.query(`
        UPDATE pacientes
        SET estado_cuenta = 'activo',
            inasistencias_recientes = 0,
            suspension_hasta = NULL
        WHERE id = $1
      `, [paciente_id]);
      return { suspendido: false };
    }
    return {
      suspendido: true,
      hasta: suspension_hasta,
      mensaje: `Tu cuenta está temporalmente suspendida hasta el ${new Date(suspension_hasta).toLocaleDateString('es-AR')}. No puedes reservar nuevos turnos.`
    };
  }

  // Estado inhabilitado (suspensión permanente por administrador)
  if (estado_cuenta === 'inhabilitado') {
    return {
      suspendido: true,
      hasta: null,
      mensaje: 'Tu cuenta ha sido inhabilitada permanentemente. Por favor, comunícate con la administración de la clínica.'
    };
  }

  return { suspendido: false };
}

module.exports = { verificarPacienteSuspendido };
