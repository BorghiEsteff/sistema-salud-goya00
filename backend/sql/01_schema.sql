-- ============================================
-- ARCHIVO: 01_schema.sql
-- ============================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM para roles
CREATE TYPE rol_usuario AS ENUM ('admin', 'secretaria', 'medico', 'paciente');

-- ENUM para estados de turno (máquina de estados inmutable)
CREATE TYPE estado_turno AS ENUM (
  'solicitado',
  'confirmado',
  'atendido',
  'ausente',
  'cancelado'
);

-- ENUM para estado de cuenta de paciente
CREATE TYPE estado_cuenta AS ENUM ('activo', 'suspendido', 'inhabilitado');

-- =====================
-- TABLA: usuarios
-- =====================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLA: especialidades
-- =====================
CREATE TABLE especialidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE
);

-- =====================
-- TABLA: medicos
-- =====================
CREATE TABLE medicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  matricula VARCHAR(50) UNIQUE NOT NULL,
  especialidad_id INTEGER REFERENCES especialidades(id),
  telefono VARCHAR(30),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLA: pacientes
-- =====================
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  fecha_nacimiento DATE,
  telefono VARCHAR(30),
  direccion TEXT,
  estado_cuenta estado_cuenta DEFAULT 'activo',
  inasistencias_recientes INTEGER DEFAULT 0,
  suspension_hasta TIMESTAMPTZ NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLA: secretarias
-- =====================
CREATE TABLE secretarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLA: turnos
-- =====================
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  especialidad_id INTEGER REFERENCES especialidades(id),
  fecha_turno DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado estado_turno DEFAULT 'solicitado',
  motivo_consulta TEXT,
  creado_por UUID REFERENCES usuarios(id),
  cancelado_por UUID REFERENCES usuarios(id),
  motivo_cancelacion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINT CRÍTICO: impide superposición de turnos a nivel de BD
  CONSTRAINT no_superposicion_turno UNIQUE (medico_id, fecha_turno, hora_inicio),

  -- CONSTRAINT: hora_fin debe ser posterior a hora_inicio
  CONSTRAINT horario_valido CHECK (hora_fin > hora_inicio),

  -- CONSTRAINT: solo estados válidos (refuerzo extra sobre ENUM)
  CONSTRAINT estado_valido CHECK (
    estado IN ('solicitado', 'confirmado', 'atendido', 'ausente', 'cancelado')
  )
);

-- =====================
-- TABLA: historia_clinica
-- =====================
CREATE TABLE historia_clinica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id UUID UNIQUE NOT NULL REFERENCES turnos(id),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  diagnostico TEXT,
  indicaciones TEXT,
  observaciones TEXT,
  proxima_consulta DATE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLA: archivos_adjuntos
-- =====================
CREATE TABLE archivos_adjuntos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  historia_id UUID REFERENCES historia_clinica(id),
  turno_id UUID REFERENCES turnos(id),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_archivo VARCHAR(50),       -- 'receta', 'estudio', 'imagen', 'otro'
  url_cloudinary VARCHAR(500) NOT NULL,
  public_id_cloudinary VARCHAR(255),
  subido_por UUID REFERENCES usuarios(id),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLA: logs_auditoria
-- =====================
CREATE TABLE logs_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tabla_afectada VARCHAR(100) NOT NULL,
  registro_id UUID,
  accion VARCHAR(50) NOT NULL,     -- 'INSERT', 'UPDATE', 'DELETE_LOGICO'
  campo_modificado VARCHAR(100),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES usuarios(id),
  ip_address INET,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);
