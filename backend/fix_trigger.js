require('dotenv').config();
const db = require('./src/config/db');

async function fix() {
  try {
    console.log('Intentando reparar el trigger de máquina de estados...');
    
    await db.query(`
      CREATE OR REPLACE FUNCTION fn_validar_transicion_estado()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.estado IN ('atendido', 'ausente', 'cancelado') THEN
          RAISE EXCEPTION 'El turno % ya está en estado final (%) y no puede modificarse.', OLD.id, OLD.estado USING ERRCODE = 'P0001';
        END IF;

        IF NOT (
          (OLD.estado = 'solicitado'  AND NEW.estado IN ('confirmado', 'cancelado')) OR
          (OLD.estado = 'confirmado'  AND NEW.estado IN ('atendido', 'ausente', 'cancelado')) OR
          (OLD.estado = NEW.estado)
        ) THEN
          RAISE EXCEPTION 'Transición de estado inválida: % -> %', OLD.estado, NEW.estado USING ERRCODE = 'P0002';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.query(`DROP TRIGGER IF EXISTS trg_validar_estado_turno ON turnos`);
    await db.query(`
      CREATE TRIGGER trg_validar_estado_turno
        BEFORE UPDATE ON turnos
        FOR EACH ROW
        WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
        EXECUTE FUNCTION fn_validar_transicion_estado();
    `);
    console.log('¡Trigger reparado exitosamente!');
  } catch (err) {
    console.error('Error al reparar:', err);
  } finally {
    process.exit(0);
  }
}
fix();
