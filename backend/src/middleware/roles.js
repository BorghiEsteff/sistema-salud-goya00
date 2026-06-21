function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    // Asumimos que el middleware verificarToken ya se ejecutó antes que este
    // y pobló req.usuario con el payload del JWT
    if (!req.usuario || !req.usuario.rol) {
      return res.status(403).json({ error: 'Usuario no autenticado o sin rol asignado.' });
    }
    
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'No tenés permisos para realizar esta acción.'
      });
    }
    next();
  };
}

module.exports = { verificarRol };
