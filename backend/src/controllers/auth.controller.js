const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function register(req, res, next) {
  try {
    const { email, password, rol } = req.body;
    
    // Validación básica
    if (!email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar el usuario
    const result = await db.query(
      'INSERT INTO usuarios (email, password_hash, rol) VALUES ($1, $2, $3) RETURNING id, email, rol, activo, creado_en',
      [email, passwordHash, rol]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan email o contraseña' });
    }

    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'La cuenta está desactivada' });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT
    const payload = {
      id: usuario.id,
      rol: usuario.rol
    };

    if (usuario.rol === 'medico') {
      const medRes = await db.query('SELECT id FROM medicos WHERE usuario_id = $1', [usuario.id]);
      if (medRes.rows.length > 0) payload.medico_id = medRes.rows[0].id;
    } else if (usuario.rol === 'paciente') {
      const pacRes = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [usuario.id]);
      if (pacRes.rows.length > 0) payload.paciente_id = pacRes.rows[0].id;
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION || '8h'
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        ...(payload.medico_id && { medico_id: payload.medico_id }),
        ...(payload.paciente_id && { paciente_id: payload.paciente_id })
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };
