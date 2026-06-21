const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

// Ruta pública protegida solo por secreto (para el CRON externo)
router.post('/job/recordatorios', controller.dispararRecordatorios);

router.use(verificarToken);
router.use(verificarRol(['paciente']));

router.get('/', controller.getNotificaciones);
router.get('/no-leidas/count', controller.getNoLeidasCount);
router.put('/marcar-todas-leidas', controller.marcarTodasLeidas);
router.put('/:id/leida', controller.marcarLeida);

module.exports = router;
