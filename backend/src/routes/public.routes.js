const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Las rutas requieren estar logueado (como paciente o cualquier otro rol), pero no requieren ser admin.
router.use(verificarToken);

// Listar especialidades activas
router.get('/especialidades', async (req, res, next) => {
  try {
    const { solo_con_medicos } = req.query;
    let query = 'SELECT * FROM especialidades WHERE activo = TRUE';
    if (solo_con_medicos === 'true') {
      query = `
        SELECT DISTINCT e.*
        FROM especialidades e
        JOIN medicos m ON e.id = m.especialidad_id
        WHERE e.activo = TRUE AND m.activo = TRUE
      `;
    }
    query += ' ORDER BY nombre ASC';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// Listar médicos (opcionalmente filtrados por especialidad_id)
router.get('/medicos', async (req, res, next) => {
  try {
    const { especialidad_id } = req.query;
    let query = `
      SELECT m.id, m.nombre, m.apellido, e.nombre as especialidad_nombre
      FROM medicos m
      JOIN especialidades e ON m.especialidad_id = e.id
      WHERE m.activo = TRUE
    `;
    const values = [];
    
    if (especialidad_id) {
      query += ` AND m.especialidad_id = $1`;
      values.push(especialidad_id);
    }
    
    query += ` ORDER BY m.apellido ASC, m.nombre ASC`;
    
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
