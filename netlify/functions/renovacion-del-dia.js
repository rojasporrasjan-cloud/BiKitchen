/* global process */
/**
 * Netlify Scheduled Function: renovacion-del-dia
 *
 * Los días de reparto (lunes, miércoles y sábado) a las 10 a. m. de Costa Rica,
 * le manda el mensaje de renovación a cada cliente que HOY recibe la última
 * entrega de su pack (decisión de Jan, 29 set 2026). Quién recibe lo decide
 * renovacionesDelDia (envioDeCambios.js): packs de varias entregas cuya última
 * es hoy y que NO renovaron ya; nunca teléfonos de relleno; uno por persona.
 *
 * MANDA WHATSAPP REALES SIN QUE NADIE APRIETE NADA. Por eso:
 *   - Viene APAGADA. RENOVACION_AUTOMATICA:
 *       (sin poner) / "no" → no hace nada
 *       "prueba"           → arma la lista y le manda UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *       "si"               → le manda a todos los de la lista
 *   - Nunca manda dos veces el mismo día: constancia en `envios_renovacion/{fecha}`.
 *   - Con más de TOPE en un solo día no manda nada: algo está mal.
 *
 * Variables en Netlify: CAMBIOS_SECRETO, KOMMO_SUBDOMINIO, KOMMO_TOKEN,
 * KOMMO_BOT_RENOVACION (el bot "Renovación de pack", con su plantilla
 * `renovacion_pack` aprobada), y KOMMO_CAMPO_PACK opcional.
 */

import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { getFirestore } from 'firebase-admin/firestore';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import {
    renovacionesDelDia, destinatarioDeRenovacion, destinatariosUnicos, leerPedidosDelCiclo
} from '../../src/utils/envioDeCambios.js';
import { entradaDeRegistro, anotarEnvio } from '../../src/utils/registroDeEnvios.js';

export const TOPE = 40;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[RenovacionDelDia] Firebase init:', err.message);
}

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Hoy y las 5 semanas siguientes en Costa Rica, aunque el servidor esté en UTC. */
const fechasDesdeHoy = (ahora) => {
    const cr = new Date(ahora.getTime() - 6 * 60 * 60 * 1000 + ahora.getTimezoneOffset() * 60 * 1000);
    return Array.from({ length: 36 }, (_, i) => isoDe(new Date(cr.getFullYear(), cr.getMonth(), cr.getDate() + i)));
};

/**
 * @param {object} opciones  inyectables para probar sin red ni reloj
 * @returns {Promise<{ estado: string, detalle?: object }>}
 */
export const correr = async ({ ahora = new Date(), modo = process.env.RENOVACION_AUTOMATICA } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN', 'KOMMO_BOT_RENOVACION'].filter(v => !process.env[v]);
    if (modo === 'prueba' && !process.env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const fechas = fechasDesdeHoy(ahora);
    const hoy = fechas[0];
    const constancia = db.collection('envios_renovacion').doc(hoy);
    const previa = await constancia.get();
    if (previa.exists && previa.data()?.estado === 'enviado' && modo === 'si') {
        return { estado: 'ya-enviado', detalle: { hoy } };
    }

    // Hoy y lo que viene: para saber quién termina hoy y quién ya renovó
    const pedidos = await leerPedidosDelCiclo(db, fechas);
    const lista = renovacionesDelDia(pedidos, hoy);
    const todos = destinatariosUnicos(lista.map(destinatarioDeRenovacion));
    let destinatarios = todos;
    const quienes = destinatarios.map(d => d.nombre);

    if (destinatarios.length === 0) {
        await constancia.set({ estado: 'nadie', revisadoEn: ahora.toISOString() }, { merge: true });
        return { estado: 'nadie', detalle: { hoy } };
    }
    if (modo === 'prueba') destinatarios = soloAlNumeroDePrueba(destinatarios);
    if (destinatarios.length > TOPE) {
        await constancia.set({ estado: 'frenado-por-tope', cuantos: destinatarios.length, revisadoEn: ahora.toISOString() }, { merge: true });
        return { estado: 'frenado-por-tope', detalle: { cuantos: destinatarios.length } };
    }

    const { conId, nuevos } = await enviarPorKommo(destinatarios, {
        bot: process.env.KOMMO_BOT_RENOVACION,
        camposIds: { pack: process.env.KOMMO_CAMPO_PACK },
        segmentoId: 'renovacion'
    });

    const detalle = {
        hoy, modo, enviados: conId.length, nuevosEnKommo: nuevos.length,
        // En prueba: a quiénes les HABRÍA llegado
        [modo === 'si' ? 'clientes' : 'lesHabriaLlegado']: quienes
    };
    await constancia.set({ estado: modo === 'si' ? 'enviado' : 'prueba', enviadoEn: ahora.toISOString(), ...detalle }, { merge: true });
    await anotarEnvio(db, entradaDeRegistro({
        tipo: 'renovacion', modo, estado: modo === 'si' ? 'enviado' : 'prueba', ahora,
        enviados: conId.map(c => c.d), lesHabriaLlegado: modo === 'prueba' ? todos : []
    }));
    return { estado: modo === 'si' ? 'enviado' : 'prueba', detalle };
};

export default async () => {
    try {
        const r = await correr();
        console.log('[RenovacionDelDia]', JSON.stringify(r));
        return new Response(JSON.stringify(r), { status: 200 });
    } catch (err) {
        console.error('[RenovacionDelDia] Error:', err);
        return new Response(err.message, { status: 500 });
    }
};

// Lunes, miércoles y sábado a las 16:00 UTC = 10:00 a. m. en Costa Rica
export const config = {
    schedule: '0 16 * * 1,3,6'
};
