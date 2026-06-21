const db = require('../config/db');
const transporter = require('../config/email');
const path = require('path');

async function obtenerPlantilla(tipo, datos) {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${tipo.replace(/_/g, '-')}.js`);
    const generarPlantilla = require(templatePath);
    return generarPlantilla(datos);
  } catch (error) {
    console.error(`No se encontró plantilla para tipo ${tipo}:`, error);
    return null;
  }
}

async function crearNotificacion({ paciente_id, turno_id, tipo, titulo, mensaje, claveIdempotencia }) {
  if (claveIdempotencia) {
    const existing = await db.query('SELECT * FROM notificaciones WHERE clave_idempotencia = $1', [claveIdempotencia]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
  }

  const result = await db.query(`
    INSERT INTO notificaciones (paciente_id, turno_id, tipo, titulo, mensaje, clave_idempotencia)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [paciente_id, turno_id || null, tipo, titulo, mensaje, claveIdempotencia || null]);

  return result.rows[0];
}

async function enviarEmailNotificacion(notificacionId) {
  try {
    const resNotif = await db.query('SELECT * FROM notificaciones WHERE id = $1', [notificacionId]);
    const notificacion = resNotif.rows[0];
    if (!notificacion) return;

    // Obtener datos del paciente (nombre y correo desde la tabla usuarios)
    const resPac = await db.query(`
      SELECT p.nombre AS "nombrePaciente", u.email 
      FROM pacientes p 
      JOIN usuarios u ON p.usuario_id = u.id 
      WHERE p.id = $1
    `, [notificacion.paciente_id]);
    
    const paciente = resPac.rows[0];
    if (!paciente || !paciente.email) return;

    const datos = {
      nombrePaciente: paciente.nombrePaciente,
      fechaTurno: 'N/A',
      horaTurno: 'N/A',
      nombreMedico: 'N/A'
    };

    if (notificacion.turno_id) {
      const resTurno = await db.query(`
        SELECT t.fecha_turno, t.hora_inicio, m.nombre AS "nombreMedico", m.apellido AS "apellidoMedico"
        FROM turnos t
        JOIN medicos m ON t.medico_id = m.id
        WHERE t.id = $1
      `, [notificacion.turno_id]);
      
      const turnoInfo = resTurno.rows[0];
      if (turnoInfo) {
        // Formatear fecha
        const dateObj = new Date(turnoInfo.fecha_turno);
        datos.fechaTurno = dateObj.toLocaleDateString('es-AR');
        datos.horaTurno = turnoInfo.hora_inicio.substring(0, 5); // HH:mm
        datos.nombreMedico = `${turnoInfo.nombreMedico} ${turnoInfo.apellidoMedico}`;
      }
    }

    const contenido = await obtenerPlantilla(notificacion.tipo, datos);
    
    if (contenido && contenido.subject && contenido.html) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: paciente.email,
        subject: contenido.subject,
        html: contenido.html
      });
      
      await db.query('UPDATE notificaciones SET enviado_email = true, email_enviado_en = NOW() WHERE id = $1', [notificacionId]);
    }
  } catch (error) {
    console.error(`Error al enviar email para notificacion ${notificacionId}:`, error);
    await db.query('UPDATE notificaciones SET email_error = $1 WHERE id = $2', [error.message, notificacionId]);
  }
}

async function notificarYEnviar(params) {
  try {
    const notificacion = await crearNotificacion(params);
    if (notificacion) {
      // Fire and forget: no hacer await de enviarEmailNotificacion
      enviarEmailNotificacion(notificacion.id).catch(err => console.error("Error asíncrono email:", err));
    }
  } catch (error) {
    console.error("Error al crear la notificacion:", error);
  }
}

module.exports = {
  crearNotificacion,
  enviarEmailNotificacion,
  notificarYEnviar
};
