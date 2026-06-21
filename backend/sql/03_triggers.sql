-- ============================================
-- ARCHIVO: 03_triggers.sql
-- ============================================

-- Función genérica para actualizar 'actualizado_en'
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_turnos_timestamp
  BEFORE UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

CREATE TRIGGER trg_historia_timestamp
  BEFORE UPDATE ON historia_clinica
  FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- -----------------------------------------------
-- TRIGGER CRÍTICO: Auditoría de cambios en turnos
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditar_cambio_turno()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO logs_auditoria (
      tabla_afectada, registro_id, accion,
      campo_modificado, valor_anterior, valor_nuevo
    ) VALUES (
      'turnos', NEW.id, 'UPDATE',
      'estado', OLD.estado::TEXT, NEW.estado::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_turno
  AFTER UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambio_turno();

-- -----------------------------------------------
-- TRIGGER: Motor de suspensiones automáticas
-- Cuando un turno pasa a 'ausente', incrementa
-- el contador y suspende si supera el umbral.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION fn_motor_suspensiones()
RETURNS TRIGGER AS $$
DECLARE
  v_inasistencias INTEGER;
  v_umbral INTEGER := 2;  -- Configurable: 2 ausencias en 30 días
  v_dias_suspension INTEGER := 30;
BEGIN
  IF NEW.estado = 'ausente' AND OLD.estado != 'ausente' THEN

    -- Contar ausencias en los últimos 30 días
    SELECT COUNT(*) INTO v_inasistencias
    FROM turnos
    WHERE paciente_id = NEW.paciente_id
      AND estado = 'ausente'
      AND fecha_turno >= CURRENT_DATE - INTERVAL '30 days';

    -- Actualizar contador en paciente
    UPDATE pacientes
    SET inasistencias_recientes = v_inasistencias
    WHERE id = NEW.paciente_id;

    -- Aplicar suspensión si supera el umbral
    IF v_inasistencias >= v_umbral THEN
      UPDATE pacientes
      SET
        estado_cuenta = 'suspendido',
        suspension_hasta = NOW() + (v_dias_suspension || ' days')::INTERVAL
      WHERE id = NEW.paciente_id
        AND estado_cuenta = 'activo';

      -- Registrar en auditoría
      INSERT INTO logs_auditoria (
        tabla_afectada, registro_id, accion,
        campo_modificado, valor_anterior, valor_nuevo
      ) VALUES (
        'pacientes', NEW.paciente_id, 'UPDATE',
        'estado_cuenta', 'activo', 'suspendido'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_motor_suspensiones
  AFTER UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION fn_motor_suspensiones();

-- -----------------------------------------------
-- TRIGGER: Máquina de estados — bloquea retrocesos
-- Los estados finales NO pueden revertirse
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_transicion_estado()
RETURNS TRIGGER AS $$
BEGIN
  -- Estados finales: atendido, ausente, cancelado
  IF OLD.estado IN ('atendido', 'ausente', 'cancelado') THEN
    RAISE EXCEPTION
      'El turno % ya está en estado final (%) y no puede modificarse.',
      OLD.id, OLD.estado
      USING ERRCODE = 'P0001';
  END IF;

  -- Transiciones permitidas explícitas
  IF NOT (
    (OLD.estado = 'solicitado'  AND NEW.estado IN ('confirmado', 'cancelado')) OR
    (OLD.estado = 'confirmado'  AND NEW.estado IN ('atendido', 'ausente', 'cancelado')) OR
    (OLD.estado = NEW.estado)   -- Permite actualizar otros campos sin cambiar estado
  ) THEN
    RAISE EXCEPTION
      'Transición de estado inválida: % -> %',
      OLD.estado, NEW.estado
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_estado_turno
  BEFORE UPDATE ON turnos
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION fn_validar_transicion_estado();
