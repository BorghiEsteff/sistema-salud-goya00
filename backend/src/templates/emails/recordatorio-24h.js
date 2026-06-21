module.exports = function(datos) {
  return {
    subject: `Recordatorio de turno - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Te recordamos que tienes un turno programado para mañana.</p>
      <ul>
        <li><strong>Fecha:</strong> ${datos.fechaTurno}</li>
        <li><strong>Hora:</strong> ${datos.horaTurno}</li>
        <li><strong>Médico:</strong> ${datos.nombreMedico}</li>
      </ul>
      <p>Recuerda que si no puedes asistir, es importante cancelar el turno con anticipación para evitar suspensiones en tu cuenta.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
