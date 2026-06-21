const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.gebfvdnhdhrmxhcdkrfh:Borghi20266@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`SELECT p.id as pac_id, t.id as tur_id FROM turnos t JOIN pacientes p ON t.paciente_id = p.id WHERE p.dni = '99999999'`);
  console.log(res.rows[0].pac_id + ',' + res.rows[0].tur_id);
  process.exit(0);
}
run();
