-- ============================================
-- ARCHIVO: 07_ausencias_medicos.sql
-- DESCRIPCIÓN: Columnas para ausencias/avisos
-- ============================================

ALTER TABLE medicos
  ADD COLUMN ausente_desde DATE,
  ADD COLUMN ausente_hasta DATE,
  ADD COLUMN motivo_ausencia TEXT;
