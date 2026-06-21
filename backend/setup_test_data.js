const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.gebfvdnhdhrmxhcdkrfh:Borghi20266@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const hash = await bcrypt.hash('test1234', 10);
  
  try {
    // Limpiar
    await pool.query(`DELETE FROM turnos WHERE medico_id IN (SELECT id FROM medicos WHERE matricula='M999')`);
    await pool.query(`DELETE FROM pacientes WHERE dni='99999999'`);
    await pool.query(`DELETE FROM medicos WHERE matricula='M999'`);
    await pool.query(`DELETE FROM secretarias WHERE nombre='Test' AND apellido='Secretaria'`);
    await pool.query(`DELETE FROM usuarios WHERE email IN ('medico_test@saludgoya.com', 'paciente_test@saludgoya.com', 'secretaria_test@saludgoya.com')`);

    let resEsp = await pool.query(`SELECT id FROM especialidades LIMIT 1`);
    let espId;
    if (resEsp.rows.length === 0) {
      resEsp = await pool.query(`INSERT INTO especialidades (nombre, descripcion) VALUES ('General', 'test') RETURNING id`);
      espId = resEsp.rows[0].id;
    } else {
      espId = resEsp.rows[0].id;
    }

    // 1. Create Medico User
    const resUsrMed = await pool.query(`INSERT INTO usuarios (email, password_hash, rol) VALUES ('medico_test@saludgoya.com', $1, 'medico') RETURNING id`, [hash]);
    const uMedId = resUsrMed.rows[0].id;
    const resMed = await pool.query(`INSERT INTO medicos (usuario_id, nombre, apellido, matricula, especialidad_id, telefono) VALUES ($1, 'Test', 'Medico', 'M999', $2, '1111') RETURNING id`, [uMedId, espId]);
    const medicoId = resMed.rows[0].id;

    // 2. Create Paciente User
    const resUsrPac = await pool.query(`INSERT INTO usuarios (email, password_hash, rol) VALUES ('paciente_test@saludgoya.com', $1, 'paciente') RETURNING id`, [hash]);
    const uPacId = resUsrPac.rows[0].id;
    const resPac = await pool.query(`INSERT INTO pacientes (usuario_id, nombre, apellido, dni, fecha_nacimiento, telefono) VALUES ($1, 'Test', 'Paciente', '99999999', '2000-01-01', '2222') RETURNING id`, [uPacId]);
    const pacienteId = resPac.rows[0].id;

    // 3. Create Secretaria User
    const resUsrSec = await pool.query(`INSERT INTO usuarios (email, password_hash, rol) VALUES ('secretaria_test@saludgoya.com', $1, 'secretaria') RETURNING id`, [hash]);
    const uSecId = resUsrSec.rows[0].id;
    await pool.query(`INSERT INTO secretarias (usuario_id, nombre, apellido) VALUES ($1, 'Test', 'Secretaria')`, [uSecId]);

    // 4. Create Turno
    await pool.query(`INSERT INTO turnos (paciente_id, medico_id, especialidad_id, fecha_turno, hora_inicio, hora_fin, estado) VALUES ($1, $2, $3, CURRENT_DATE, '10:00', '10:30', 'confirmado')`, [pacienteId, medicoId, espId]);

    console.log('Setup complete');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
