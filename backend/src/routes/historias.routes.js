const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');
const historiasController = require('../controllers/historias.controller');

router.use(verificarToken);

// Creación de Historia Clínica (Médico y Admin como backup)
router.post('/', verificarRol(['medico', 'admin']), historiasController.crearHistoria);

// Lectura de historial por paciente
router.get(
  '/paciente/:id',
  verificarRol(['admin', 'medico', 'paciente']),
  historiasController.getHistoriaPaciente
);

module.exports = router;
