module.exports = function(datos) {
  return {
    subject: `Aviso Importante: Cuenta suspendida - Salud Goya`,
    html: `
      <h2>Hola ${datos.nombrePaciente},</h2>
      <p>Te informamos que tu cuenta ha sido temporalmente suspendida debido a reiteradas inasistencias a turnos sin previo aviso.</p>
      <p>Durante este período no podrás reservar nuevos turnos a través del portal de pacientes.</p>
      <p>Si consideras que esto es un error o necesitas comunicarte con la administración, por favor acércate a la recepción de la clínica o llama a nuestros teléfonos de contacto.</p>
      <p>Saludos,<br>El equipo de Salud Goya</p>
    `
  };
};
