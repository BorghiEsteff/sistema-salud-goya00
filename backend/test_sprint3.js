require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');

const server = http.createServer(app);
const PORT = 4006;

async function runTests() {
  console.log('Iniciando tests automatizados del Sprint 3 (Historias Clínicas y Archivos)...');

  server.listen(PORT, async () => {
    try {
      // 1. Iniciar sesión como administrador para obtener token
      const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@saludgoya.com', password: 'admin123' })
      });
      const loginData = await loginRes.json();
      const adminToken = loginData.token;

      // 2. Usar al paciente de prueba ya existente
      const pacRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'paciente.test@saludgoya.com', password: 'password' })
      });
      const pacData = await pacRes.json();
      const pacienteToken = pacData.token;

      // 3. Crear un médico de prueba rápido
      const rnd = Date.now();
      const medRes = await fetch(`http://localhost:${PORT}/api/admin/medicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          email: `sprint3.${rnd}@saludgoya.com`,
          password: 'password',
          nombre: 'Test',
          apellido: 'Sprint3',
          matricula: `M${rnd}`,
          especialidad_id: 1,
          telefono: '123'
        })
      });
      const medData = await medRes.json();
      const medico_id = medData.id;

      const medLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `sprint3.${rnd}@saludgoya.com`, password: 'password' })
      });
      const medLoginData = await medLoginRes.json();
      const medicoToken = medLoginData.token;

      // 4. Crear turno (Paciente)
      const turnoRes = await fetch(`http://localhost:${PORT}/api/turnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pacienteToken}` },
        body: JSON.stringify({ medico_id, especialidad_id: 1, fecha_turno: '2027-01-01', hora_inicio: '10:00:00', motivo_consulta: 'Test S3' })
      });
      const turnoData = await turnoRes.json();
      const turnoId = turnoData.id;

      // 5. TEST DE SEGURIDAD REGLA MAESTRA:
      // Intentar crear historia médica SIN estar atendido (debe fallar con 400)
      const historiaFail = await fetch(`http://localhost:${PORT}/api/historias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${medicoToken}` },
        body: JSON.stringify({ turno_id: turnoId, diagnostico: 'No debería pasar' })
      });

      if (historiaFail.status !== 400) {
        throw new Error('Seguridad vulnerada: Se permitió crear historia clínica en un turno NO atendido.');
      } else {
        console.log('✅ Regla Maestra: No se puede crear historia sin estado "atendido". (Bloqueado exitosamente)');
      }

      // 6. Aprobar el turno (Admin) y luego atender (Médico o Admin)
      await fetch(`http://localhost:${PORT}/api/turnos/${turnoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ estado: 'confirmado' })
      });
      await fetch(`http://localhost:${PORT}/api/turnos/${turnoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ estado: 'atendido' })
      });

      // 7. Crear historia (ÉXITO)
      const historiaOk = await fetch(`http://localhost:${PORT}/api/historias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${medicoToken}` },
        body: JSON.stringify({ turno_id: turnoId, diagnostico: 'Gripe leve', indicaciones: 'Ibuprofeno' })
      });

      if (historiaOk.status !== 201) {
        throw new Error('Fallo al crear la historia clínica válida.');
      } else {
        console.log('✅ Creación de Historia Clínica vinculada al Turno funciona correctamente.');
      }

      // 8. TEST DE PRIVACIDAD DE PACIENTES
      const otroPacienteRes = await fetch(`http://localhost:${PORT}/api/historias/paciente/999999`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pacienteToken}` }
      });
      
      if (otroPacienteRes.status !== 403) {
        throw new Error('Seguridad vulnerada: Un paciente pudo leer la historia de OTRO paciente.');
      } else {
        console.log('✅ Privacidad: Un paciente NO puede leer historias clínicas que no sean suyas.');
      }

      console.log('🎉 TODOS LOS TESTS DE SEGURIDAD DEL SPRINT 3 PASARON EXITOSAMENTE!');

    } catch (e) {
      console.error('❌ ERROR EN TEST SPRINT 3:', e.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
