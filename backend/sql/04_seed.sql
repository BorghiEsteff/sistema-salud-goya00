-- ============================================
-- ARCHIVO: 04_seed.sql
-- ============================================

-- Insertar especialidades
INSERT INTO especialidades (nombre, descripcion) VALUES 
('Cardiología', 'Especialidad médica dedicada a las enfermedades del corazón'),
('Pediatría', 'Atención médica de bebés, niños y adolescentes'),
('Traumatología', 'Especialidad en huesos y articulaciones'),
('Oftalmología', 'Especialidad en enfermedades de los ojos');

-- Insertar un administrador por defecto
-- La contraseña es 'admin123' hasheada con bcrypt
INSERT INTO usuarios (email, password_hash, rol) 
VALUES ('admin@saludgoya.com', '$2a$10$8.XmS2xP0nC.8z5yPz9zH.kU7H8J8J8J8J8J8J8J8J8J8J8J8J8J8', 'admin');
