require('dotenv').config();
const transporter = require('./src/config/email');

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'azulnievasdeborghi1@gmail.com', // CAMBIAR ESTO ANTES DE PROBAR
      subject: 'Prueba de Sistema Salud Goya',
      html: '<h1>¡Hola!</h1><p>Esta es una prueba del sistema de notificaciones de Salud Goya utilizando Nodemailer y Gmail.</p>'
    });
    console.log('Mensaje enviado exitosamente:', info.messageId);
  } catch (error) {
    console.error('Error al enviar el email:', error);
  }
}

testEmail();
