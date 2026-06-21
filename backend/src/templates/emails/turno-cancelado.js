module.exports = function(datos) {
  return {
    subject: `Turno cancelado - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Te informamos que tu turno para el día <strong>${datos.fechaTurno}</strong> a las <strong>${datos.horaTurno}</strong> con el médico <strong>${datos.nombreMedico}</strong> ha sido cancelado.</p>
      <p>Si deseas reprogramarlo, puedes hacerlo ingresando a nuestro portal de pacientes.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
