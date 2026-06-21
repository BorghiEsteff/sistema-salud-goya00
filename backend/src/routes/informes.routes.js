const express = require('express');
const router = express.Router();
const informesController = require('../controllers/informes.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

router.use(verificarToken, verificarRol(['admin']));

router.get('/resumen', informesController.getResumen);
router.get('/pagos', informesController.getPagos);
router.get('/turnos-por-estado', informesController.getTurnosPorEstado);

module.exports = router;
