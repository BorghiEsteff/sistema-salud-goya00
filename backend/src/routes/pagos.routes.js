const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagos.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

router.post('/preferencia', verificarToken, verificarRol(['paciente']), pagosController.crearPreferencia);

module.exports = router;
