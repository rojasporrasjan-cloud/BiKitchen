/**
 * Netlify Function: pago-fallido — deja constancia de un pago con tarjeta que falló.
 *
 * Por qué existe (7 oct 2026): dos clientes no pudieron pagar con tarjeta ("error
 * de 3DS") y no quedó NINGÚN rastro de qué les pasó. El error del 3DS ocurre en el
 * navegador, antes de llamar a nmi-charge, y el checkout intentaba guardarlo en el
 * pedido pero las reglas de Firestore no le dejan a un cliente editar `pedidos`
 * (solo admin): el pedido quedaba como "pago pendiente" y el error se perdía.
 *
 * Esta función:
 *   1. Escribe el error en el registro de Netlify (Functions → pago-fallido).
 *   2. Lo guarda en el pedido (buscado por numeroOrden), SOLO si sigue sin pagar.
 *
 * No cobra, no toca montos ni datos de tarjeta. Nunca recibe el número de tarjeta.
 * Firestore: 1 consulta dirigida + 1 escritura por falla (regla 17).
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[PagoFallido] Firebase init:', err.message);
}

const SIN_PAGAR = ['pending_payment', 'payment_failed', 'pending'];
const corto = (v, max) => String(v ?? '').replace(/\d{12,19}/g, '[número]').slice(0, max);

export const registrar = async ({ numeroOrden, etapa, mensaje, detalle, navegador } = {}, base = db) => {
    const orden = corto(numeroOrden, 40);
    const entrada = {
        etapa: corto(etapa, 40) || 'desconocida',
        mensaje: corto(mensaje, 500) || 'sin mensaje',
        detalle: corto(detalle, 1500),
        navegador: corto(navegador, 300)
    };
    console.warn('[PagoFallido]', JSON.stringify({ numeroOrden: orden, ...entrada }));

    if (!base || !orden) return { guardado: false, motivo: !orden ? 'sin-orden' : 'sin-firestore' };
    const snap = await base.collection('pedidos').where('numeroOrden', '==', orden).limit(1).get();
    if (snap.empty) return { guardado: false, motivo: 'pedido-no-encontrado' };
    const pedido = snap.docs[0];
    if (!SIN_PAGAR.includes(pedido.data().status)) return { guardado: false, motivo: 'ya-no-esta-sin-pagar' };

    await pedido.ref.update({
        status: 'payment_failed',
        paymentStatus: 'failed',
        paymentError: entrada.mensaje,
        paymentErrorEtapa: entrada.etapa,
        paymentErrorDetalle: entrada.detalle,
        paymentErrorNavegador: entrada.navegador,
        isPaymentError: true,
        paymentErrorAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });
    return { guardado: true };
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
    }
    try {
        const r = await registrar(body);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) };
    } catch (err) {
        console.error('[PagoFallido] Error:', err.message);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guardado: false, motivo: 'error' }) };
    }
};
