/* global process */
/**
 * Netlify Scheduled Function: recordatorio-pago
 *
 * Todos los días a las 10 a. m. de Costa Rica: a quien tiene el pedido SIN
 * PAGAR y la entrega en los próximos 3 días le manda la plantilla aprobada
 * `recordatorio_pago`. Una sola vez por pedido (`avisoRecordatorioPago`).
 * Quién entra lo decide pagosPorRecordar (avisosDePago.js), la misma que
 * muestra la pantalla Listas de Difusión.
 *
 * OJO: "sin pagar" es lo que dice el SISTEMA. Si un pago se confirmó en el chat
 * y no en el panel, el pedido sigue "pendiente" y a ese cliente le llegaría el
 * recordatorio. Por eso arranca en prueba y se compara su lista con los chats.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. RECORDATORIO_PAGO_AUTOMATICO:
 *   (sin poner) / "no" → no hace nada
 *   "prueba"           → UNA muestra al CAMBIOS_TELEFONO_PRUEBA y la lista de a
 *                        quién le habría llegado queda en `envios_kommo`
 *   "si"               → a todos los de la lista
 * Nunca a teléfonos de relleno, uno por persona, y con más de TOPE no manda nada.
 *
 * Variables: KOMMO_SUBDOMINIO, KOMMO_TOKEN, KOMMO_BOT_RECORDATORIO_PAGO (el bot
 * con la plantilla `recordatorio_pago`), KOMMO_CAMPO_ENTREGA y KOMMO_CAMPO_PACK.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { destinatarioDeRenovacion, destinatariosUnicos } from '../../src/utils/envioDeCambios.js';
import { pagosPorRecordar, hoyEnCostaRica, ESTADOS_SIN_PAGAR } from '../../src/utils/avisosDePago.js';
import { entradaDeRegistro, anotarEnvio } from '../../src/utils/registroDeEnvios.js';

export const TOPE = 30;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[RecordatorioPago] Firebase init:', err.message);
}

export const correr = async ({ ahora = new Date(), modo = process.env.RECORDATORIO_PAGO_AUTOMATICO } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN', 'KOMMO_BOT_RECORDATORIO_PAGO'].filter(v => !process.env[v]);
    if (modo === 'prueba' && !process.env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    // Solo los pedidos sin pagar (regla 17): unas decenas de lecturas, no la colección
    const snap = await db.collection('pedidos').where('status', 'in', ESTADOS_SIN_PAGAR).get();
    const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const lista = pagosPorRecordar(pedidos, hoyEnCostaRica(ahora), { prueba: modo === 'prueba' });

    const conDestino = lista.map(x => ({ x, d: destinatarioDeRenovacion(x) })).filter(y => y.d);
    const todos = destinatariosUnicos(conDestino.map(y => y.d));
    if (todos.length === 0) return { estado: 'nadie', detalle: { revisados: pedidos.length } };
    if (todos.length > TOPE) {
        await anotarEnvio(db, entradaDeRegistro({ tipo: 'recordatorio-pago', modo, estado: 'frenado-por-tope', ahora, lesHabriaLlegado: todos }));
        return { estado: 'frenado-por-tope', detalle: { cuantos: todos.length } };
    }

    const destinatarios = modo === 'prueba'
        ? soloAlNumeroDePrueba(todos, '', todos[0].suscripcion?.proxima)
        : todos;
    const { conId } = await enviarPorKommo(destinatarios, {
        bot: process.env.KOMMO_BOT_RECORDATORIO_PAGO,
        camposIds: { entrega: process.env.KOMMO_CAMPO_ENTREGA, pack: process.env.KOMMO_CAMPO_PACK },
        segmentoId: 'recordatorio-pago'
    });

    const avisados = new Set(modo === 'prueba' ? todos.map(d => d.telefono) : conId.map(c => c.d.telefono));
    const marca = modo === 'prueba' ? 'avisoRecordatorioPagoPrueba' : 'avisoRecordatorioPago';
    for (const { x, d } of conDestino) {
        if (avisados.has(d.telefono)) {
            await db.collection('pedidos').doc(x.pedido.id).update({ [marca]: ahora.toISOString() });
        }
    }

    const estado = modo === 'si' ? 'enviado' : 'prueba';
    await anotarEnvio(db, entradaDeRegistro({
        tipo: 'recordatorio-pago', modo, estado, ahora,
        enviados: conId.map(c => c.d), lesHabriaLlegado: modo === 'prueba' ? todos : []
    }));
    return { estado, detalle: { enviados: conId.length, clientes: todos.map(d => d.nombre) } };
};

export default async () => {
    try {
        const r = await correr();
        console.log('[RecordatorioPago]', JSON.stringify(r));
        return new Response(JSON.stringify(r), { status: 200 });
    } catch (err) {
        console.error('[RecordatorioPago] Error:', err);
        return new Response(err.message, { status: 500 });
    }
};

// 16:00 UTC = 10:00 a. m. en Costa Rica, todos los días
export const config = {
    schedule: '0 16 * * *'
};
