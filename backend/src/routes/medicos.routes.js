const express = require('express');
const router = express.Router();
const medicosController = require('../controllers/medicos.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

// Rutas protegidas y exclusivas para el rol médico
router.use(verificarToken, verificarRol(['medico']));

router.get('/me', medicosController.getPerfil);
router.put('/me', medicosController.updatePerfil);
router.post('/me/avisos', medicosController.registrarAviso);
router.delete('/me/avisos', medicosController.cancelarAviso);
router.get('/me/agenda', medicosController.getMiAgenda);

module.exports = router;
