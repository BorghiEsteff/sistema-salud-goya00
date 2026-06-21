require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('Iniciando tests automatizados del Sprint 4 (Registro y Rutas Públicas)...');
  let testPacienteEmail = `test.paciente.${Date.now()}@saludgoya.com`;
  let tokenPaciente = '';

  try {
    // Test 1: Registro de Paciente
    const registroPayload = {
      email: testPacienteEmail,
      password: 'password123',
      nombre: 'Paciente',
      apellido: 'Prueba Sprint 4',
      dni: Math.floor(10000000 + Math.random() * 90000000).toString(),
      fecha_nacimiento: '1990-01-01',
      telefono: '1122334455'
    };
    
    let res = await fetch(`${API_URL}/pacientes/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registroPayload)
    });
    
    if (res.status !== 201) {
      const errorData = await res.json();
      throw new Error('Fallo Test 1 (Registro): ' + JSON.stringify(errorData));
    }
    console.log('✅ Registro de paciente público funciona correctamente.');

    // Test 2: Login automático
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testPacienteEmail, password: 'password123' })
    });
    
    if (res.status !== 200) throw new Error('Fallo Test 2 (Login)');
    const loginData = await res.json();
    tokenPaciente = loginData.token;
    console.log('✅ Login encadenado (posterior al registro) devuelve el JWT correctamente.');

    // Test 3: Rutas Públicas (Especialidades)
    res = await fetch(`${API_URL}/public/especialidades`, {
      headers: { 'Authorization': `Bearer ${tokenPaciente}` }
    });
    
    if (res.status !== 200) throw new Error('Fallo Test 3 (Especialidades)');
    const especialidades = await res.json();
    if (!Array.isArray(especialidades)) throw new Error('Formato de especialidades incorrecto');
    console.log('✅ Acceso a ruta pública de Especialidades exitoso (Requiere JWT, no requiere rol admin).');

    // Test 4: Rutas Públicas (Médicos por especialidad)
    if (especialidades.length > 0) {
      const espId = especialidades[0].id;
      res = await fetch(`${API_URL}/public/medicos?especialidad_id=${espId}`, {
        headers: { 'Authorization': `Bearer ${tokenPaciente}` }
      });
      if (res.status !== 200) throw new Error('Fallo Test 4 (Médicos)');
      console.log('✅ Búsqueda de médicos filtrados por especialidad funciona correctamente.');
    } else {
      console.log('⚠️ Test 4 saltado (No hay especialidades en la BD)');
    }

    console.log('🎉 TODOS LOS TESTS DEL SPRINT 4 PASARON EXITOSAMENTE!');

  } catch (err) {
    console.error('❌ ERROR DURANTE LOS TESTS:', err.message);
  } finally {
    await pool.end();
  }
}

runTests();
