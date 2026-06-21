-- ============================================
-- ARCHIVO: 05_mercadopago.sql
-- DESCRIPCIÓN: Migraciones para el Sprint 2 - Módulo de Pagos
-- ============================================

-- 1. Tabla medicos
ALTER TABLE medicos
  ADD COLUMN precio_consulta NUMERIC(10,2),
  ADD COLUMN modalidad_pago VARCHAR(10) NOT NULL DEFAULT 'on_site'
    CHECK (modalidad_pago IN ('on_site', 'prepaid'));

-- 2. Tabla turnos
ALTER TABLE turnos
  ADD COLUMN estado_pago VARCHAR(20) NOT NULL DEFAULT 'no_requerido'
    CHECK (estado_pago IN ('no_requerido', 'pendiente', 'pagado', 'reembolso_pendiente', 'reembolsado')),
  ADD COLUMN monto_pagado NUMERIC(10,2);

-- 3. Tabla nueva pagos
CREATE TABLE pagos (
  id              SERIAL PRIMARY KEY,
  turno_id        UUID NOT NULL REFERENCES turnos(id),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id),
  mp_payment_id   VARCHAR(50),
  mp_refund_id    VARCHAR(50),
  preference_id   VARCHAR(80),
  monto           NUMERIC(10,2) NOT NULL,
  moneda          VARCHAR(3) NOT NULL DEFAULT 'ARS',
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado', 'reembolso_pendiente', 'reembolsado')),
  pagado_en       TIMESTAMPTZ,
  reembolsado_en  TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_turno ON pagos(turno_id);
CREATE INDEX idx_pagos_mp_payment ON pagos(mp_payment_id);

-- 4. Campo obra social
ALTER TABLE pacientes
  ADD COLUMN obra_social VARCHAR(100);
