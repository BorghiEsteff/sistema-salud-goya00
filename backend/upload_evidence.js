const fs = require('fs');
const { Pool } = require('pg');

const API = 'http://localhost:3000/api';

const pool = new Pool({
  connectionString: 'postgresql://postgres.gebfvdnhdhrmxhcdkrfh:Borghi20266@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // 1. Get Token
    const loginRes = await fetch(API+'/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: 'medico_test@saludgoya.com', password: 'test1234' })
    });
    const { token } = await loginRes.json();

    // 2. Upload file
    const pac_id = '8172eca8-6239-4b1f-8319-558b18685622';
    const tur_id = 'ab1e705d-b819-43dd-a8d1-cb107e012ca6';

    const formData = new FormData();
    // In Node 18 fetch, FormData requires a Blob or File. We can create a Blob from fs.readFileSync
    const buffer = fs.readFileSync('../dummy.pdf');
    const blob = new Blob([buffer], { type: 'application/pdf' });
    formData.append('archivo', blob, 'dummy.pdf');
    formData.append('paciente_id', pac_id);
    formData.append('turno_id', tur_id);
    formData.append('tipo_archivo', 'documento_pdf');

    console.log("Subiendo archivo a Cloudinary via API...");
    const uploadRes = await fetch(API+'/archivos/subir', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    const uploadData = await uploadRes.json();
    console.log("Upload Response:", uploadData);

    if(!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

    console.log("\\n=== EVIDENCIA EN SUPABASE ===");
    const dbRes = await pool.query('SELECT * FROM archivos_adjuntos WHERE id = $1', [uploadData.id]);
    console.log(dbRes.rows[0]);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
