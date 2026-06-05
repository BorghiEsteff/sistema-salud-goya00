const db = require('../config/db');

async function subirArchivo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo válido o el formato fue rechazado por seguridad.' });
    }

    const { paciente_id, turno_id, historia_id, tipo_archivo } = req.body;

    const url = req.file.path; // URL entregada por Cloudinary
    const public_id = req.file.filename; 
    const nombre_archivo = req.file.originalname;

    const result = await db.query(`
      INSERT INTO archivos_adjuntos (historia_id, turno_id, paciente_id, nombre_archivo, tipo_archivo, url_cloudinary, public_id_cloudinary, subido_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [historia_id || null, turno_id || null, paciente_id, nombre_archivo, tipo_archivo || 'otro', url, public_id, req.usuario.id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getArchivosPaciente(req, res, next) {
  try {
    const { id } = req.params; // paciente_id

    // Verificación de seguridad
    if (req.usuario.rol === 'paciente' && req.usuario.paciente_id !== id) {
      return res.status(403).json({ error: 'No tienes permiso para ver los archivos de este paciente.' });
    }

    if (req.usuario.rol === 'medico') {
      const t = await db.query('SELECT 1 FROM turnos WHERE medico_id = $1 AND paciente_id = $2 LIMIT 1', [req.usuario.medico_id, id]);
      if (t.rows.length === 0) {
        return res.status(403).json({ error: 'Solo puedes ver los archivos de pacientes de tu nómina.' });
      }
    }

    const result = await db.query(`
      SELECT id, historia_id, turno_id, nombre_archivo, tipo_archivo, url_cloudinary, creado_en 
      FROM archivos_adjuntos 
      WHERE paciente_id = $1 AND activo = TRUE
      ORDER BY creado_en DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { subirArchivo, getArchivosPaciente };
