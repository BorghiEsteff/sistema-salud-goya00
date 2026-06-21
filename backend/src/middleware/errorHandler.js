function errorHandler(err, req, res, next) {
  console.error('Error no manejado:', err);
  // Nunca exponer detalles internos del error en producción
  const mensaje = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message || 'Error interno del servidor';
  
  res.status(err.status || 500).json({ error: mensaje });
}

module.exports = { errorHandler };
