/* global process */
/**
 * Netlify Scheduled Function: pago-recibido
 *
 * Cada 10 minutos: a quien le acaban de confirmar el pago le manda por Kommo
 * "Recibimos tu pago, tu entrega es el …". Reemplaza las dos confirmaciones
 * que Gina pegaba a mano en cada chat (versiones A y B, auditoría del 2 oct 2026).
 *
 * CÓMO SABE QUIÉN SE CONFIRMÓ, SIN TOCAR EL PANEL: al confirmar un pago,
 * OrdersContext.updateOrderStatus escribe `pointsAwardedAt` (la hora). Acá se
 * leen SOLO los pedidos con esa hora en la última media hora (regla 17: unas
 * pocas lecturas por vuelta) y cada uno se marca con `avisoPagoRecibido` para
 * no mandarlo nunca dos veces. Un pedido confirmado hace más de media hora no
 * se toca: al encender esto no le escribe a los pedidos viejos.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. PAGO_RECIBIDO_AUTOMATICO:
 *   (sin poner) / "no" → no hace nada
 *   "prueba"           → solo si el pedido es del CAMBIOS_TELEFONO_PRUEBA (tu pedido de prueba)
 *   "si"               → a todos
 * Nunca a teléfonos de relleno, uno por persona, y con más de TOPE en una
 * vuelta no manda nada.
 *
 * Variables: KOMMO_SUBDOMINIO, KOMMO_TOKEN, KOMMO_BOT_PAGO_RECIBIDO (el bot con
 * la plantilla `pago_recibido`), KOMMO_CAMPO_ENTREGA (la variable de la fecha).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo } from './cambios-miercoles.js';
import { destinatarioDeRenovacion, destinatariosUnicos } from '../../src/utils/envioDeCambios.js';
import { entregasDelPedido } from '../../src/utils/proteinasPorEntrega.js';
import { soloDigitos } from '../../src/utils/kommoPayload.js';

export const TOPE = 30;
export const VENTANA_MS = 30 * 60 * 1000;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[PagoRecibido] Firebase init:', err.message);
}

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyEnCostaRica = (ahora) => isoDe(new Date(ahora.getTime() - 6 * 3600000 + ahora.getTimezoneOffset() * 60000));

/**
 * A quién le toca: confirmado en la ventana, todavía sin aviso, no cancelado,
 * y con una entrega de hoy en adelante (si ya se entregó todo, no tiene sentido).
 */
export const pagosParaAvisar = (pedidos = [], hoy) => (pedidos || [])
    .filter(p => p && p.status === 'confirmed' && !p.avisoPagoRecibido)
    .map(pedido => ({ pedido, fecha: entregasDelPedido(pedido).find(f => f >= hoy) }))
    .filter(x => x.fecha)
    .map(x => ({ ...x, ultima: false }));

export const correr = async ({ ahora = new Date(), modo = process.env.PAGO_RECIBIDO_AUTOMATICO } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN', 'KOMMO_BOT_PAGO_RECIBIDO'].filter(v => !process.env[v]);
    if (modo === 'prueba' && !process.env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const desde = new Date(ahora.getTime() - VENTANA_MS).toISOString();
    const snap = await db.collection('pedidos').where('pointsAwardedAt', '>=', desde).get();
    const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const lista = pagosParaAvisar(pedidos, hoyEnCostaRica(ahora));

    // Nunca a relleno (lo descarta destinatarioDeRenovacion) y uno por persona
    let conDestino = lista.map(x => ({ x, d: destinatarioDeRenovacion(x) })).filter(y => y.d);
    if (modo === 'prueba') {
        const tel = soloDigitos(process.env.CAMBIOS_TELEFONO_PRUEBA);
        conDestino = conDestino.filter(y => y.d.telefono === tel);
    }
    const destinatarios = destinatariosUnicos(conDestino.map(y => y.d));
    if (destinatarios.length === 0) return { estado: 'nadie', detalle: { revisados: pedidos.length } };
    if (destinatarios.length > TOPE) return { estado: 'frenado-por-tope', detalle: { cuantos: destinatarios.length } };

    const { conId } = await enviarPorKommo(destinatarios, {
        bot: process.env.KOMMO_BOT_PAGO_RECIBIDO,
        camposIds: { entrega: process.env.KOMMO_CAMPO_ENTREGA, pack: process.env.KOMMO_CAMPO_PACK },
        segmentoId: 'pago-recibido'
    });

    // Marcar por el id REAL del pedido (update: si no existe, falla en vez de crear otro)
    const avisados = new Set(conId.map(c => c.d.telefono));
    for (const { x, d } of conDestino) {
        if (avisados.has(d.telefono)) {
            await db.collection('pedidos').doc(x.pedido.id).update({ avisoPagoRecibido: ahora.toISOString() });
        }
    }
    return { estado: modo === 'si' ? 'enviado' : 'prueba', detalle: { enviados: conId.length, clientes: conId.map(c => c.d.nombre) } };
};

export default async () => {
    try {
        const r = await correr();
        if (r.estado !== 'apagado' && r.estado !== 'nadie') console.log('[PagoRecibido]', JSON.stringify(r));
        return new Response(JSON.stringify(r), { status: 200 });
    } catch (err) {
        console.error('[PagoRecibido] Error:', err);
        return new Response(err.message, { status: 500 });
    }
};

export const config = {
    schedule: '*/10 * * * *'
};
