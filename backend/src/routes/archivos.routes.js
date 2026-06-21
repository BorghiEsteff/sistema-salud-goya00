const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');
const upload = require('../middleware/upload');
const archivosController = require('../controllers/archivos.controller');

router.use(verificarToken);

// Solo Admin, Secretaría y Médico pueden subir archivos.
// El middleware `upload.single('archivo')` intercepta la petición multipart form-data.
router.post('/subir', verificarRol(['admin', 'secretaria', 'medico']), upload.single('archivo'), archivosController.subirArchivo);

// Todos pueden ver (los permisos finos de "quién ve a quién" están en el controlador)
router.get('/paciente/:id', archivosController.getArchivosPaciente);

module.exports = router;
