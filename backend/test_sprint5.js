require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('Iniciando tests automatizados del Sprint 5 (Panel Admin)...');
  let tokenAdmin = '';
  let especialidadId = null;

  try {
    // Test 1: Login de Administrador
    let res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@saludgoya.com', password: 'admin123' })
    });
    
    if (res.status !== 200) throw new Error('Fallo Test 1 (Login Admin)');
    const loginData = await res.json();
    tokenAdmin = loginData.token;
    console.log('✅ Login de Administrador exitoso.');

    // Test 2: Crear Especialidad
    const espNombre = `Especialidad Test ${Date.now()}`;
    res = await fetch(`${API_URL}/admin/especialidades`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ nombre: espNombre, descripcion: 'Prueba autogenerada' })
    });
    
    if (res.status !== 201) throw new Error('Fallo Test 2 (Crear Especialidad)');
    const espData = await res.json();
    especialidadId = espData.id;
    console.log('✅ Especialidad creada exitosamente.');

    // Test 3: Crear Médico
    const medEmail = `medico.test.${Date.now()}@saludgoya.com`;
    const medMatricula = `MN-${Math.floor(Math.random() * 900000)}`;
    res = await fetch(`${API_URL}/admin/medicos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        nombre: 'Doc',
        apellido: 'Test',
        email: medEmail,
        matricula: medMatricula,
        especialidad_id: especialidadId,
        telefono: '1122334455',
        password: 'password_aleatoria_123'
      })
    });
    
    if (res.status !== 201) throw new Error('Fallo Test 3 (Crear Médico)');
    console.log('✅ Médico creado y vinculado a la especialidad exitosamente.');

    // Test 4: Traer Logs de Auditoría
    res = await fetch(`${API_URL}/admin/auditoria`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    
    if (res.status !== 200) {
      const errTxt = await res.text();
      throw new Error(`Fallo Test 4 (Auditoría): ${errTxt}`);
    }
    const auditoriaData = await res.json();
    if (!Array.isArray(auditoriaData)) throw new Error('Formato de auditoría incorrecto');
    console.log('✅ Logs de Auditoría consultados sin errores (La columna fue corregida).');

    console.log('🎉 TODOS LOS TESTS DEL SPRINT 5 PASARON EXITOSAMENTE!');

  } catch (err) {
    console.error('❌ ERROR DURANTE LOS TESTS:', err.message);
  } finally {
    await pool.end();
  }
}

runTests();
