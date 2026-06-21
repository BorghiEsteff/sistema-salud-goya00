const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const pacientesRoutes = require('./routes/pacientes.routes');
const medicosRoutes = require('./routes/medicos.routes');
const turnosRoutes = require('./routes/turnos.routes');
const historiasRoutes = require('./routes/historias.routes');
const archivosRoutes = require('./routes/archivos.routes');
const adminRoutes = require('./routes/admin.routes');
const publicRoutes = require('./routes/public.routes');
const pagosRoutes = require('./routes/pagos.routes');
const informesRoutes = require('./routes/informes.routes');

const app = express();

const path = require('path');

app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP estricto temporalmente para que el frontend local corra fácil
}));
const frontendUrlStr = process.env.FRONTEND_URL || '*';
const allowedOrigins = frontendUrlStr !== '*' ? frontendUrlStr.split(',').map(u => u.trim()) : '*';

app.use(cors({
  origin: allowedOrigins === '*' ? '*' : function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin === 'https://sistema-salud-goya00.vercel.app' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback: permitir todo temporalmente si hay problemas, o puedes poner new Error('Not allowed by CORS')
    }
  }
}));

// Webhook de MercadoPago: requiere raw body para validar la firma
app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }), require('./controllers/pagos.controller').webhook);

app.use(express.json());

// Servir frontend estático directamente desde Node para evitar CORS de 'file://'
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas (Sprint 2 y 3)
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/historias', historiasRoutes);
app.use('/api/archivos', archivosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/informes', informesRoutes);
app.use('/api/pagos', pagosRoutes);

app.use('/api/public', publicRoutes);

// Rutas genéricas
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Middleware global de errores — SIEMPRE al final
app.use(errorHandler);

module.exports = app;
