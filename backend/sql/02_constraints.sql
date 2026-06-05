-- ============================================
-- ARCHIVO: 02_constraints.sql
-- ============================================

-- Índices para rendimiento en consultas frecuentes
CREATE INDEX idx_turnos_medico_fecha ON turnos(medico_id, fecha_turno);
CREATE INDEX idx_turnos_paciente ON turnos(paciente_id);
CREATE INDEX idx_turnos_estado ON turnos(estado);
CREATE INDEX idx_turnos_fecha ON turnos(fecha_turno);
CREATE INDEX idx_pacientes_dni ON pacientes(dni);
CREATE INDEX idx_pacientes_estado ON pacientes(estado_cuenta);
CREATE INDEX idx_historia_paciente ON historia_clinica(paciente_id);
CREATE INDEX idx_logs_tabla ON logs_auditoria(tabla_afectada, creado_en);
CREATE INDEX idx_usuarios_email ON usuarios(email);
