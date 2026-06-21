require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');

const server = http.createServer(app);
const PORT = 4005;

async function runTests() {
  console.log('Iniciando tests automatizados del Sprint 2...');

  server.listen(PORT, async () => {
    try {
      // 1. Obtener un token de Admin para crear un paciente de prueba
      const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@saludgoya.com', password: 'admin123' })
      });
      const loginData = await loginRes.json();
      const adminToken = loginData.token;

      // 2. Registrar Paciente de prueba (con email aleatorio para no chocar con pruebas previas)
      const rnd = Date.now();
      const pacEmail = `paciente.${rnd}@saludgoya.com`;
      const pacRes = await fetch(`http://localhost:${PORT}/api/pacientes/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pacEmail,
          password: 'password',
          nombre: 'Juan',
          apellido: 'Perez',
          dni: `${Math.floor(1000000 + Math.random() * 9000000)}`, // DNI aleatorio de 7-8 digitos
          fecha_nacimiento: '1990-01-01',
          telefono: '11223344',
          direccion: 'Calle Falsa 123'
        })
      });
      
      if(pacRes.status !== 201) {
        console.error('Fallo al registrar paciente test', await pacRes.text());
      }

      // Obtener token del paciente
      const pacLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pacEmail, password: 'password' })
      });
      const pacLoginData = await pacLoginRes.json();
      const pacienteToken = pacLoginData.token;

      if (!pacLoginData.usuario.paciente_id) {
        throw new Error('El JWT no incluye el paciente_id, el bugfix falló.');
      } else {
        console.log('✅ JWT incluye paciente_id correctamente.');
      }

      // 2.5 Crear una Especialidad y un Médico para las pruebas
      const espRes = await fetch(`http://localhost:${PORT}/api/admin/especialidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ nombre: `Cardiología ${rnd}`, descripcion: 'Test' })
      });
      const espData = await espRes.json();
      const especialidad_id = espData.id;

      const medRes = await fetch(`http://localhost:${PORT}/api/admin/medicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          email: `medico.${rnd}@saludgoya.com`,
          password: 'password',
          nombre: 'Gregory',
          apellido: 'House',
          matricula: `M${rnd}`,
          especialidad_id: especialidad_id,
          telefono: '555-HOUSE'
        })
      });
      const medData = await medRes.json();
      const medico_id = medData.id;

      // 3. Test de Superposición de Turnos
      const fecha = '2026-12-01';
      const hora_inicio = '09:00:00';

      const turno1 = await fetch(`http://localhost:${PORT}/api/turnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pacienteToken}` },
        body: JSON.stringify({ medico_id, especialidad_id: especialidad_id, fecha_turno: fecha, hora_inicio, motivo_consulta: 'Test 1' })
      });
      
      const turno2 = await fetch(`http://localhost:${PORT}/api/turnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pacienteToken}` },
        body: JSON.stringify({ medico_id, especialidad_id: especialidad_id, fecha_turno: fecha, hora_inicio, motivo_consulta: 'Test 2' })
      });

      if (turno2.status !== 400) {
        throw new Error('No se bloqueó la superposición de turnos. ' + await turno2.text());
      } else {
        console.log('✅ Prevención de superposición de turnos funciona.');
      }

      // 4. Test de Máquina de Estados
      const t1Data = await turno1.json();
      const turnoId = t1Data.id;

      // Paso obligatorio: solicitado -> confirmado
      const confRes = await fetch(`http://localhost:${PORT}/api/turnos/${turnoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ estado: 'confirmado' })
      });
      if(confRes.status !== 200) console.error('Error al confirmar turno:', await confRes.text());

      // Paso obligatorio: confirmado -> atendido
      const atRes = await fetch(`http://localhost:${PORT}/api/turnos/${turnoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ estado: 'atendido' })
      });
      if(atRes.status !== 200) console.error('Error al marcar atendido:', await atRes.text());

      // Intentar retroceder a solicitado (DEBE FALLAR)
      const retroceso = await fetch(`http://localhost:${PORT}/api/turnos/${turnoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ estado: 'solicitado' })
      });

      if (retroceso.status === 200) {
        throw new Error('La máquina de estados permitió retroceder un turno atendido.');
      } else {
        console.log('✅ Máquina de estados bloquea transiciones inválidas correctamente.');
      }

      // 5. Test de Suspensión Automática
      for (let i = 1; i <= 2; i++) {
        const t = await fetch(`http://localhost:${PORT}/api/turnos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pacienteToken}` },
          body: JSON.stringify({ medico_id, especialidad_id: especialidad_id, fecha_turno: '2026-12-02', hora_inicio: `10:0${i}:00`, motivo_consulta: 'Test' })
        });
        const td = await t.json();
        
        // Transición legal: solicitado -> confirmado -> ausente
        await fetch(`http://localhost:${PORT}/api/turnos/${td.id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ estado: 'confirmado' })
        });
        await fetch(`http://localhost:${PORT}/api/turnos/${td.id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ estado: 'ausente' })
        });
      }

      // El paciente ahora debería estar suspendido. Intentamos reservar:
      const turnoBloqueado = await fetch(`http://localhost:${PORT}/api/turnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pacienteToken}` },
        body: JSON.stringify({ medico_id, especialidad_id: 1, fecha_turno: '2026-12-03', hora_inicio: '11:00:00', motivo_consulta: 'Test bloqueado' })
      });

      if (turnoBloqueado.status !== 403) {
        throw new Error('El paciente no fue suspendido o se le permitió reservar estando suspendido.');
      } else {
        console.log('✅ Motor de suspensiones bloquea reservas de pacientes baneados automáticamente.');
      }

      console.log('🎉 TODOS LOS TESTS DEL SPRINT 2 PASARON EXITOSAMENTE!');

    } catch (e) {
      console.error('❌ ERROR EN TEST:', e.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
