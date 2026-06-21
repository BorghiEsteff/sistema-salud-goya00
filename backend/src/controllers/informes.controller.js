const db = require('../config/db');

async function getResumen(req, res, next) {
  try {
    const { desde, hasta } = req.query;
    let turnosQuery = 'SELECT COUNT(*) as total FROM turnos WHERE 1=1';
    let pagosQuery = 'SELECT SUM(monto) as recaudacion FROM pagos WHERE estado = $1';
    let valuesTurnos = [];
    let valuesPagos = ['pagado'];
    let counterT = 1;
    let counterP = 2;

    if (desde) {
      turnosQuery += ` AND fecha_turno >= $${counterT++}`;
      pagosQuery += ` AND pagado_en::date >= $${counterP++}`;
      valuesTurnos.push(desde);
      valuesPagos.push(desde);
    }
    if (hasta) {
      turnosQuery += ` AND fecha_turno <= $${counterT++}`;
      pagosQuery += ` AND pagado_en::date <= $${counterP++}`;
      valuesTurnos.push(hasta);
      valuesPagos.push(hasta);
    }

    const resTurnos = await db.query(turnosQuery, valuesTurnos);
    const resPagos = await db.query(pagosQuery, valuesPagos);
    const totalPacientes = await db.query('SELECT COUNT(*) as total FROM pacientes WHERE activo = TRUE');

    res.json({
      turnos_totales: parseInt(resTurnos.rows[0].total) || 0,
      recaudacion_total: parseFloat(resPagos.rows[0].recaudacion) || 0,
      pacientes_activos: parseInt(totalPacientes.rows[0].total) || 0
    });
  } catch (err) { next(err); }
}

async function getPagos(req, res, next) {
  try {
    const { desde, hasta } = req.query;
    let query = `
      SELECT pagado_en::date as fecha, SUM(monto) as total
      FROM pagos
      WHERE estado = 'pagado'
    `;
    let values = [];
    let counter = 1;

    if (desde) { query += ` AND pagado_en::date >= $${counter++}`; values.push(desde); }
    if (hasta) { query += ` AND pagado_en::date <= $${counter++}`; values.push(hasta); }

    query += ' GROUP BY pagado_en::date ORDER BY fecha ASC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getTurnosPorEstado(req, res, next) {
  try {
    const { desde, hasta } = req.query;
    let query = `
      SELECT estado, COUNT(*) as cantidad
      FROM turnos
      WHERE 1=1
    `;
    let values = [];
    let counter = 1;

    if (desde) { query += ` AND fecha_turno >= $${counter++}`; values.push(desde); }
    if (hasta) { query += ` AND fecha_turno <= $${counter++}`; values.push(hasta); }

    query += ' GROUP BY estado ORDER BY cantidad DESC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = { getResumen, getPagos, getTurnosPorEstado };
