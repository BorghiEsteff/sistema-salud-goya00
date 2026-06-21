module.exports = function(datos) {
  return {
    subject: `Tu turno ha sido confirmado - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Tu turno ha sido reservado exitosamente.</p>
      <ul>
        <li><strong>Fecha:</strong> ${datos.fechaTurno}</li>
        <li><strong>Hora:</strong> ${datos.horaTurno}</li>
        <li><strong>Médico:</strong> ${datos.nombreMedico}</li>
      </ul>
      <p>Te esperamos 10 minutos antes del horario indicado.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
