/* global process */
/**
 * Netlify Scheduled Function: pago-recibido
 *
 * Cada 10 minutos: a quien le acaban de confirmar el pago le manda por Kommo
 * "Recibimos tu pago, tu entrega es el …". Reemplaza las dos confirmaciones
 * que Gina pegaba a mano en cada chat (versiones A y B, auditoría del 2 oct 2026).
 *
 * CÓMO SABE QUIÉN SE CONFIRMÓ, SIN TOCAR EL PANEL: al confirmar un pago,
 * OrdersContext.updateOrderStatus (y el pago con tarjeta) escriben
 * `pointsAwardedAt`. Acá se leen SOLO los pedidos con esa hora en la última
 * media hora (regla 17: unas pocas lecturas por vuelta) y cada uno se marca
 * para no mandarlo nunca dos veces. Un pedido confirmado hace más de media hora
 * no se toca: al encender esto no le escribe a los pedidos viejos.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. PAGO_RECIBIDO_AUTOMATICO:
 *   (sin poner) / "no" → no hace nada
 *   "prueba"           → UNA muestra al CAMBIOS_TELEFONO_PRUEBA por cada tanda de
 *                        pagos confirmados (con la fecha del primero); a los
 *                        clientes no les llega nada. Queda `avisoPagoRecibidoPrueba`.
 *   "si"               → a todos; queda `avisoPagoRecibido` en el pedido
 * Nunca a teléfonos de relleno, uno por persona, y con más de TOPE en una
 * vuelta no manda nada. Cada vuelta que manda queda en `envios_kommo`.
 *
 * Variables: KOMMO_SUBDOMINIO, KOMMO_TOKEN, KOMMO_BOT_PAGO_RECIBIDO (el bot con
 * la plantilla `pago_recibido`), KOMMO_CAMPO_ENTREGA (la variable de la fecha).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { destinatarioDeRenovacion, destinatariosUnicos } from '../../src/utils/envioDeCambios.js';
import { pagosParaAvisar, hoyEnCostaRica } from '../../src/utils/avisosDePago.js';
import { entradaDeRegistro, anotarEnvio } from '../../src/utils/registroDeEnvios.js';

export { pagosParaAvisar };
export const TOPE = 30;
export const VENTANA_MS = 30 * 60 * 1000;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[PagoRecibido] Firebase init:', err.message);
}

export const correr = async ({ ahora = new Date(), modo = process.env.PAGO_RECIBIDO_AUTOMATICO } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN', 'KOMMO_BOT_PAGO_RECIBIDO'].filter(v => !process.env[v]);
    if (modo === 'prueba' && !process.env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const desde = new Date(ahora.getTime() - VENTANA_MS).toISOString();
    const snap = await db.collection('pedidos').where('pointsAwardedAt', '>=', desde).get();
    const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const lista = pagosParaAvisar(pedidos, hoyEnCostaRica(ahora), { prueba: modo === 'prueba' });

    // Nunca a relleno (lo descarta destinatarioDeRenovacion) y uno por persona
    const conDestino = lista.map(x => ({ x, d: destinatarioDeRenovacion(x) })).filter(y => y.d);
    const todos = destinatariosUnicos(conDestino.map(y => y.d));
    if (todos.length === 0) return { estado: 'nadie', detalle: { revisados: pedidos.length } };
    if (todos.length > TOPE) return { estado: 'frenado-por-tope', detalle: { cuantos: todos.length } };

    const destinatarios = modo === 'prueba'
        ? soloAlNumeroDePrueba(todos, '', todos[0].suscripcion?.proxima)
        : todos;
    const { conId } = await enviarPorKommo(destinatarios, {
        bot: process.env.KOMMO_BOT_PAGO_RECIBIDO,
        camposIds: { entrega: process.env.KOMMO_CAMPO_ENTREGA, pack: process.env.KOMMO_CAMPO_PACK },
        segmentoId: 'pago-recibido'
    });

    // Marcar por el id REAL del pedido (update: si no existe, falla en vez de crear otro)
    const avisados = new Set(modo === 'prueba' ? todos.map(d => d.telefono) : conId.map(c => c.d.telefono));
    const marca = modo === 'prueba' ? 'avisoPagoRecibidoPrueba' : 'avisoPagoRecibido';
    for (const { x, d } of conDestino) {
        if (avisados.has(d.telefono)) {
            await db.collection('pedidos').doc(x.pedido.id).update({ [marca]: ahora.toISOString() });
        }
    }

    const estado = modo === 'si' ? 'enviado' : 'prueba';
    await anotarEnvio(db, entradaDeRegistro({
        tipo: 'pago-recibido', modo, estado, ahora,
        enviados: conId.map(c => c.d), lesHabriaLlegado: modo === 'prueba' ? todos : []
    }));
    return { estado, detalle: { enviados: conId.length, clientes: todos.map(d => d.nombre) } };
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
