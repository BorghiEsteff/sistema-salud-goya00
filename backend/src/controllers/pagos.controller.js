const pagosService = require('../services/pagos.service');

async function crearPreferencia(req, res, next) {
  try {
    const { turno_id } = req.body;
    const paciente_id = req.usuario.paciente_id;
    if (!turno_id) return res.status(400).json({ error: 'Falta turno_id' });
    
    const result = await pagosService.crearPreferencia(turno_id, paciente_id);
    res.json(result);
  } catch(err) { next(err); }
}

async function webhook(req, res, next) {
  try {
    await pagosService.procesarWebhook(req);
    res.status(200).send('OK');
  } catch(err) {
    if (err.status === 401) return res.status(401).json({ error: 'Firma inválida' });
    next(err);
  }
}

module.exports = { crearPreferencia, webhook };
