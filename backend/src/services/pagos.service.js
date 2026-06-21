const crypto = require('crypto');
const db = require('../config/db');
const { preference, payment, client } = require('../config/mercadopago');

async function crearPreferencia(turnoId, pacienteId) {
  const result = await db.query(`
    SELECT t.*, m.precio_consulta, m.modalidad_pago 
    FROM turnos t
    JOIN medicos m ON t.medico_id = m.id
    WHERE t.id = $1 AND t.paciente_id = $2 AND t.estado_pago = 'pendiente'
  `, [turnoId, pacienteId]);
  
  const turno = result.rows[0];
  if (!turno) throw new Error('Turno no encontrado o no está pendiente de pago');

  const monto = turno.precio_consulta || 0;

  const prefBody = {
    items: [
      {
        id: turnoId,
        title: 'Consulta Médica',
        quantity: 1,
        unit_price: Number(monto)
      }
    ],
    back_urls: {
      success: `${process.env.FRONTEND_URL}/pago-exitoso.html`,
      failure: `${process.env.FRONTEND_URL}/pago-fallido.html`,
      pending: `${process.env.FRONTEND_URL}/pago-pendiente.html`
    },
    auto_return: 'approved',
    notification_url: 'https://sistema-salud-goya00.onrender.com/api/pagos/webhook',
    external_reference: turnoId
  };

  const pref = await preference.create({ body: prefBody });

  await db.query(`
    INSERT INTO pagos (turno_id, paciente_id, preference_id, monto, moneda, estado)
    VALUES ($1, $2, $3, $4, 'ARS', 'pendiente')
  `, [turnoId, pacienteId, pref.id, monto]);

  return { preferenceId: pref.id, initPoint: pref.init_point };
}

function validarFirma(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  if (!xSignature || !xRequestId) return false;

  const parts = xSignature.split(',');
  const tsPart = parts.find(p => p.startsWith('ts='));
  const v1Part = parts.find(p => p.startsWith('v1='));
  if (!tsPart || !v1Part) return false;

  const ts = tsPart.split('=')[1];
  const v1 = v1Part.split('=')[1];

  let bodyData;
  try {
    bodyData = JSON.parse(req.body.toString());
  } catch(e) {
    return false;
  }

  const dataId = bodyData.data && bodyData.data.id ? bodyData.data.id.toString() : '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(manifest);
  const computedSignature = hmac.digest('hex');

  return computedSignature === v1;
}

async function procesarWebhook(req) {
  if (!validarFirma(req)) {
    const err = new Error('Firma inválida');
    err.status = 401;
    throw err;
  }

  const body = JSON.parse(req.body.toString());
  
  if (body.type === 'payment' && body.action === 'payment.created') {
    const paymentId = body.data.id;
    const payData = await payment.get({ id: paymentId });
    const turnoId = payData.external_reference;
    
    if (payData.status === 'approved') {
      await db.query(`
        UPDATE turnos SET estado_pago = 'pagado', monto_pagado = $1 WHERE id = $2
      `, [payData.transaction_amount, turnoId]);
      
      await db.query(`
        UPDATE pagos 
        SET mp_payment_id = $1, estado = 'pagado', pagado_en = NOW(), actualizado_en = NOW()
        WHERE turno_id = $2
      `, [paymentId, turnoId]);
    } else if (payData.status === 'rejected' || payData.status === 'cancelled') {
      await db.query(`
        UPDATE turnos SET estado_pago = 'pendiente' WHERE id = $1
      `, [turnoId]);
      await db.query(`
        UPDATE pagos SET estado = 'pendiente', actualizado_en = NOW() WHERE turno_id = $1
      `, [turnoId]);
    }
  }
}

async function reembolsar(turnoId) {
  const result = await db.query('SELECT mp_payment_id FROM pagos WHERE turno_id = $1 AND estado = $2', [turnoId, 'pagado']);
  if (!result.rows[0]) throw new Error('Pago no encontrado o no está pagado');
  
  const paymentId = result.rows[0].mp_payment_id;
  
  const { Refund } = require('mercadopago');
  const refundObj = new Refund(client);
  
  const refundData = await refundObj.create({ payment_id: paymentId });
  
  await db.query(`
    UPDATE turnos SET estado_pago = 'reembolso_pendiente' WHERE id = $1
  `, [turnoId]);
  
  await db.query(`
    UPDATE pagos 
    SET mp_refund_id = $1, estado = 'reembolso_pendiente', actualizado_en = NOW()
    WHERE turno_id = $2
  `, [refundData.id, turnoId]);
}

module.exports = { crearPreferencia, procesarWebhook, reembolsar };
