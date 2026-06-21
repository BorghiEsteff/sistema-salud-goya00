module.exports = function(datos) {
  return {
    subject: `Registro de inasistencia a turno - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Te informamos que se ha registrado una inasistencia a tu turno del día <strong>${datos.fechaTurno}</strong> a las <strong>${datos.horaTurno}</strong> con el médico <strong>${datos.nombreMedico}</strong>.</p>
      <p>Recuerda que la acumulación de inasistencias sin previo aviso puede derivar en la suspensión temporal de tu cuenta para reservar nuevos turnos.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
