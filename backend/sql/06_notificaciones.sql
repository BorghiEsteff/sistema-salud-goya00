-- ============================================
-- ARCHIVO: 06_notificaciones.sql
-- ============================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id),
  turno_id        UUID REFERENCES turnos(id),

  tipo            VARCHAR(30) NOT NULL
    CHECK (tipo IN ('turno_reservado', 'turno_cancelado', 'recordatorio_24h',
                     'turno_ausente', 'paciente_suspendido', 'pago_confirmado',
                     'reembolso_procesado')),

  titulo          VARCHAR(150) NOT NULL,
  mensaje         TEXT NOT NULL,

  enviado_email   BOOLEAN NOT NULL DEFAULT FALSE,
  email_enviado_en TIMESTAMPTZ,
  email_error     TEXT,

  leida           BOOLEAN NOT NULL DEFAULT FALSE,
  leida_en        TIMESTAMPTZ,

  clave_idempotencia VARCHAR(100) UNIQUE,

  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices condicionalmente (si no existen)
CREATE INDEX IF NOT EXISTS idx_notificaciones_paciente ON notificaciones(paciente_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_turno ON notificaciones(turno_id);
