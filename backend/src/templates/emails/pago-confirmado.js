module.exports = function(datos) {
  return {
    subject: `Pago confirmado - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Hemos recibido correctamente el pago de tu turno.</p>
      <ul>
        <li><strong>Fecha del turno:</strong> ${datos.fechaTurno}</li>
        <li><strong>Médico:</strong> ${datos.nombreMedico}</li>
      </ul>
      <p>Tu turno ha sido marcado como Confirmado y el Pago como Procesado.</p>
      <p>Te esperamos el día de tu consulta.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
