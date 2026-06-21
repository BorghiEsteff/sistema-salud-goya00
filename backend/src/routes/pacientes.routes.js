const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

// Pública (Auto-registro desde el index)
router.post('/registro', pacientesController.autoRegistro);

// Protegidas exclusivamente para que el propio paciente gestione su info
router.get('/me', verificarToken, verificarRol(['paciente']), pacientesController.getPerfil);
router.put('/me', verificarToken, verificarRol(['paciente']), pacientesController.updatePerfil);

// Protegidas para uso administrativo (Secretaría y Admin)
router.get('/', verificarToken, verificarRol(['admin', 'secretaria']), pacientesController.getAllPacientes);
router.get('/:id', verificarToken, verificarRol(['admin', 'secretaria']), pacientesController.getPerfil);
router.put('/:id', verificarToken, verificarRol(['admin', 'secretaria']), pacientesController.updatePerfil);

module.exports = router;
