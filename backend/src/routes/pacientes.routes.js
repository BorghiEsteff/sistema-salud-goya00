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

// Protegidas para uso administrativo (Secretaría y Admin) y médicos (para ver historial)
router.get('/', verificarToken, verificarRol(['admin', 'secretaria']), pacientesController.getAllPacientes);
router.get('/:id', verificarToken, verificarRol(['admin', 'secretaria', 'medico']), pacientesController.getPerfil);
router.put('/:id', verificarToken, verificarRol(['admin', 'secretaria']), pacientesController.updatePerfil);

// Gestión de suspensiones manuales (Admins y Médicos)
router.put('/:id/suspender', verificarToken, verificarRol(['admin', 'medico']), pacientesController.suspenderPaciente);
router.put('/:id/levantar-suspension', verificarToken, verificarRol(['admin', 'medico']), pacientesController.levantarSuspension);

module.exports = router;
