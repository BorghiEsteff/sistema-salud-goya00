module.exports = function(datos) {
  return {
    subject: `Reembolso procesado - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Te informamos que se ha procesado correctamente el reembolso correspondiente a la cancelación de tu turno.</p>
      <ul>
        <li><strong>Fecha original del turno:</strong> ${datos.fechaTurno}</li>
        <li><strong>Médico:</strong> ${datos.nombreMedico}</li>
      </ul>
      <p>El dinero debería verse reflejado en tu cuenta de Mercado Pago o tarjeta utilizada según los plazos habituales de tu entidad financiera.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
