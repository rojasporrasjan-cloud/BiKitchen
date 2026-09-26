/* global process */
/**
 * Netlify Scheduled Function: cambios-miercoles
 *
 * Cada miércoles a las 8 a. m. (Costa Rica) le manda a cada cliente con
 * entrega el sábado o el lunes su link para elegir los cambios de la semana.
 * A quien le toca su ÚLTIMA entrega se le manda el mensaje de renovación (si
 * hay bot configurado para eso), que también lleva el link.
 *
 * "yo no voy a estar mandando uno por uno" — Jan, 25 set 2026.
 *
 * MANDA WHATSAPP REALES SIN QUE NADIE APRIETE NADA. Por eso:
 *
 *   - Viene APAGADA. CAMBIOS_ENVIO_AUTOMATICO:
 *       (sin poner) / "no" → no hace nada
 *       "prueba"           → arma todo pero solo le manda a CAMBIOS_TELEFONO_PRUEBA
 *       "si"               → le manda a todos
 *   - Nunca manda dos veces la misma semana: deja constancia en
 *     `envios_cambios/{sabado}` y si ya está "enviado" no hace nada.
 *   - Si le salen más de TOPE destinatarios, no manda NADA y lo registra: algo
 *     está mal (un filtro roto no puede escribirle a toda la base).
 *
 * Qué hace, igual que el botón de la pantalla "Cambios de la semana":
 *   1. Los pedidos del sábado y el lunes (solo esas fechas, regla 17).
 *   2. A quién le toca link (envioDeCambios.js).
 *   3. En Kommo: busca cada contacto por teléfono, le escribe el link en su
 *      campo, y lanza el Salesbot, que es el que manda el mensaje.
 *
 * Variables en Netlify (además de CAMBIOS_SECRETO, KOMMO_SUBDOMINIO, KOMMO_TOKEN):
 *   KOMMO_BOT_CAMBIOS            → id del bot con la plantilla "menú + cambios"
 *   KOMMO_CAMPO_LINK_CAMBIOS     → id del campo del contacto donde va el link
 *   KOMMO_BOT_RENOVACION         → opcional: bot para la última entrega
 *   KOMMO_CAMPO_AVANCE, KOMMO_CAMPO_PROXIMA_ENTREGA, KOMMO_CAMPO_PACK → opcionales
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { codigoPara } from './cambios-semana.js';
import { proximoCiclo, pedidosParaElLink, destinatarioKommo } from '../../src/utils/envioDeCambios.js';
import { consultasParaFechas } from '../../src/utils/consultaPorFechas.js';
import {
    payloadContacto, payloadEjecutarBot, telefonosDeContacto, soloDigitos, enLotes, LOTE_CONTACTOS, LOTE_BOTS
} from '../../src/utils/kommoPayload.js';

export const TOPE = 150;
const ESPERA_MS = 200;               // Kommo aguanta 7 por segundo
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const SITIO = (process.env.SITIO_URL || 'https://bikitchencr.com').replace(/\/+$/, '');

let db;
try {
    db = getFirestore(getApps().length === 0 ? initializeApp() : getApp());
} catch (err) {
    console.error('[CambiosMiercoles] Firebase init:', err.message);
}

const kommo = async (ruta, { method = 'GET', body } = {}) => {
    const res = await fetch(`https://${process.env.KOMMO_SUBDOMINIO}.kommo.com${ruta}`, {
        method,
        headers: { Authorization: `Bearer ${process.env.KOMMO_TOKEN}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const texto = await res.text();
    const datos = texto ? JSON.parse(texto) : null;
    if (!res.ok) throw new Error(`Kommo ${res.status}: ${texto.slice(0, 300)}`);
    return datos;
};

/** Los pedidos del sábado y el lunes, con las mismas dos consultas que la hoja. */
export const pedidosDelCiclo = async (fechas) => {
    const plan = consultasParaFechas(fechas);
    const consultas = [
        ...plan.grupos.map(g => db.collection('pedidos').where('fechas_entrega', 'array-contains-any', g).get()),
        db.collection('pedidos').where('fecha_entrega', '>=', plan.desde).where('fecha_entrega', '<=', plan.hasta).get()
    ];
    const porId = new Map();
    (await Promise.all(consultas)).forEach(snap => snap.docs.forEach(d => porId.set(d.id, { id: d.id, ...d.data() })));
    return [...porId.values()];
};

/** El id del contacto en Kommo para un teléfono, o null. Una búsqueda por cliente. */
const contactoPorTelefono = async (telefono) => {
    const res = await kommo(`/api/v4/contacts?query=${encodeURIComponent(telefono)}&limit=10`);
    const candidatos = res?._embedded?.contacts || [];
    const suyo = candidatos.find(c => telefonosDeContacto(c).includes(soloDigitos(telefono)));
    return suyo ? suyo.id : null;
};

/**
 * @param {object} opciones  inyectables para probar sin red ni reloj
 * @returns {Promise<{ estado: string, detalle?: object }>}
 */
export const correr = async ({ ahora = new Date(), modo = process.env.CAMBIOS_ENVIO_AUTOMATICO } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['CAMBIOS_SECRETO', 'KOMMO_SUBDOMINIO', 'KOMMO_TOKEN', 'KOMMO_BOT_CAMBIOS', 'KOMMO_CAMPO_LINK_CAMBIOS']
        .filter(v => !process.env[v]);
    if (modo === 'prueba' && !process.env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const { sabado, lunes } = proximoCiclo(ahora);
    const constancia = db.collection('envios_cambios').doc(sabado);
    const previa = await constancia.get();
    if (previa.exists && previa.data()?.estado === 'enviado' && modo === 'si') {
        return { estado: 'ya-enviado', detalle: { sabado } };
    }

    const [pedidos, menusSnap, sustSnap] = await Promise.all([
        pedidosDelCiclo([sabado, lunes]),
        db.doc('menus_oficial/current').get(),
        db.doc('config/substitutions').get()
    ]);
    const lista = pedidosParaElLink(pedidos, [sabado, lunes], menusSnap.data(), sustSnap.data() || {});
    let destinatarios = lista
        .map(i => destinatarioKommo(i, `${SITIO}/cambios/${codigoPara(i.pedido.id, i.fecha)}`))
        .filter(Boolean);
    const sinTelefono = lista.length - destinatarios.length;

    if (modo === 'prueba') {
        const tel = soloDigitos(process.env.CAMBIOS_TELEFONO_PRUEBA);
        destinatarios = destinatarios.filter(d => d.telefono === tel).slice(0, 1);
    }
    if (destinatarios.length > TOPE) {
        await constancia.set({ estado: 'frenado-por-tope', cuantos: destinatarios.length, revisadoEn: ahora.toISOString() }, { merge: true });
        return { estado: 'frenado-por-tope', detalle: { cuantos: destinatarios.length } };
    }

    const camposIds = {
        linkCambios: process.env.KOMMO_CAMPO_LINK_CAMBIOS,
        avance: process.env.KOMMO_CAMPO_AVANCE,
        proximaEntrega: process.env.KOMMO_CAMPO_PROXIMA_ENTREGA,
        pack: process.env.KOMMO_CAMPO_PACK
    };

    // 1. Buscar cada contacto por teléfono
    const conId = [];
    const nuevos = [];
    for (const d of destinatarios) {
        const id = await contactoPorTelefono(d.telefono);
        if (id) conId.push({ d, id }); else nuevos.push(d);
        await dormir(ESPERA_MS);
    }

    // 2. Crear los que no están y escribirle el link a todos
    for (const lote of enLotes(nuevos, LOTE_CONTACTOS)) {
        const res = await kommo('/api/v4/contacts', { method: 'POST', body: lote.map(d => payloadContacto(d, { camposIds, segmentoId: 'cambios-semana' })) });
        (res?._embedded?.contacts || []).forEach((c, i) => conId.push({ d: lote[i], id: c.id }));
        await dormir(ESPERA_MS);
    }
    for (const lote of enLotes(conId.filter(x => !nuevos.includes(x.d)), LOTE_CONTACTOS)) {
        await kommo('/api/v4/contacts', {
            method: 'PATCH',
            body: lote.map(({ d, id }) => ({ id, ...payloadContacto(d, { camposIds, segmentoId: 'cambios-semana' }) }))
        });
        await dormir(ESPERA_MS);
    }

    // 3. Lanzar los bots: el de renovación a quien es su última entrega
    const botRenovacion = process.env.KOMMO_BOT_RENOVACION;
    const renovacion = conId.filter(x => x.d.ultima && botRenovacion);
    const cambios = conId.filter(x => !(x.d.ultima && botRenovacion));
    for (const [bot, grupo] of [[process.env.KOMMO_BOT_CAMBIOS, cambios], [botRenovacion, renovacion]]) {
        for (const lote of enLotes(grupo.map(x => x.id), LOTE_BOTS)) {
            await kommo('/api/v4/bots/run', { method: 'POST', body: payloadEjecutarBot(bot, lote) });
            await dormir(ESPERA_MS);
        }
    }

    const detalle = {
        sabado, lunes, modo,
        enviados: conId.length, renovacion: renovacion.length, nuevosEnKommo: nuevos.length, sinTelefono,
        clientes: conId.map(x => x.d.nombre)
    };
    await constancia.set({ estado: modo === 'si' ? 'enviado' : 'prueba', enviadoEn: ahora.toISOString(), ...detalle }, { merge: true });
    return { estado: modo === 'si' ? 'enviado' : 'prueba', detalle };
};

export default async () => {
    try {
        const r = await correr();
        console.log('[CambiosMiercoles]', JSON.stringify(r));
        return new Response(JSON.stringify(r), { status: 200 });
    } catch (err) {
        console.error('[CambiosMiercoles] Error:', err);
        return new Response(err.message, { status: 500 });
    }
};

// Miércoles 14:00 UTC = 8:00 a. m. en Costa Rica
export const config = {
    schedule: '0 14 * * 3'
};
