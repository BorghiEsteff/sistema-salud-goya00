const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

// Todas estas rutas son exclusivas para Administradores
router.use(verificarToken, verificarRol(['admin']));

// Especialidades
router.get('/especialidades', adminController.getEspecialidades);
router.post('/especialidades', adminController.createEspecialidad);
router.post('/especialidades/limpiar-vacias', adminController.limpiarEspecialidadesVacias);
router.delete('/especialidades/:id', adminController.deleteEspecialidad);

// Médicos
router.get('/medicos', adminController.getMedicos);
router.post('/medicos', adminController.createMedico);
router.put('/medicos/:id/estado', adminController.toggleMedicoStatus);

// Secretarías
router.get('/secretarias', adminController.getSecretarias);
router.post('/secretarias', adminController.createSecretaria);
router.put('/secretarias/:id/estado', adminController.toggleSecretariaStatus);

// Pacientes y Suspensiones
router.put('/pacientes/:id/estado', adminController.togglePacienteStatus);
router.put('/pacientes/:id/levantar-suspension', adminController.levantarSuspension);
router.delete('/pacientes/:id', adminController.deletePacienteFisico);

// Auditoría
router.get('/auditoria', adminController.getAuditoria);
// IMPORTANTE: la ruta de exportación debe ir ANTES de module.exports y sin conflicto con :id
router.get('/auditoria/exportar', adminController.exportarAuditoriaCSV);

module.exports = router;
