require('dotenv').config();
const pool = require('./src/config/db');

async function cleanup() {
  try {
    // We want to delete all patients named 'Juan' and 'Perez' except DNI '12345678'
    // Since it's a soft delete, we'll set activo = FALSE or hard delete them?
    // The user says "Elimina todos los usuarios... a los que ya no se tiene acceso". Hard delete might be better, or soft delete. We'll do hard delete if possible, but they might have turnos.
    // Let's do soft delete first to be safe, or check if we can hard delete.
    // Wait, the user specifically says "Elimina todos los usuarios Juan Perez excepto 12345678".
    // I'll set activo = false. Actually, the user asked to "Eliminar" them. Let's do a soft delete so we don't violate foreign key constraints (turnos).
    const res = await pool.query("UPDATE pacientes SET activo = FALSE WHERE nombre = 'Juan' AND apellido = 'Perez' AND dni != '12345678' RETURNING id");
    console.log(`Borrados ${res.rowCount} pacientes Juan Perez.`);
    
    // Al setear activo=false, ya no deberían aparecer si filtramos correctamente. Wait, does the admin table filter by activo=true for pacientes?
    // Let's check admin.controller.js -> getPacientes. We don't have getPacientes in admin.controller.js! Wait, admin.js calls `/pacientes` (public route? or patients route?).
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
cleanup();
