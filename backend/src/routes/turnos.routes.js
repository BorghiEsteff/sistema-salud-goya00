const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnos.controller');
const { verificarToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roles');

router.use(verificarToken);

// Disponibilidad (puede ser vista por cualquiera con token, pacientes incluidos)
router.get('/disponibilidad', turnosController.getDisponibilidad);

// Listar turnos (el controlador filtra y maneja qué ve cada rol)
router.get('/', turnosController.getTurnos);

// Reservar (todos pueden reservar, el controller deduce si es paciente o admin)
router.post('/', verificarRol(['admin', 'secretaria', 'paciente']), turnosController.reservarTurno);

// Cancelar (todos pueden cancelar, el controller valida pertenencia si es paciente)
router.put('/:id/cancelar', turnosController.cancelarTurno);

// Cambiar estado (solo personal de la clínica puede confirmar, marcar ausente o atendido)
router.put('/:id/estado', verificarRol(['admin', 'secretaria', 'medico']), turnosController.cambiarEstado);

module.exports = router;
