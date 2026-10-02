/* global process */
/**
 * Netlify Scheduled Function: cambios-miercoles
 *
 * Cada miércoles a las 8 a. m. (Costa Rica) le manda a cada cliente con
 * entrega el sábado o el lunes su link para elegir los cambios de la semana.
 * A TODOS, también a quien está en su última entrega: la renovación sale aparte,
 * el día de esa última entrega (renovacion-del-dia.js), porque la plantilla
 * de renovación no lleva el link y ese cliente se quedaba sin pedir cambios.
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
 *   KOMMO_CAMPO_LINK_CAMBIOS     → opcional: id del campo del contacto donde va el link
 *                                  personal. Sin él la plantilla usa los links fijos
 *                                  (bikitchencr.com/cambios y /menu) y el bot igual sale.
 *   (KOMMO_BOT_RENOVACION ya no se usa acá: la renovación la manda renovacion-del-dia.js)
 *   KOMMO_CAMPO_AVANCE, KOMMO_CAMPO_PROXIMA_ENTREGA, KOMMO_CAMPO_PACK → opcionales
 */

import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { getFirestore } from 'firebase-admin/firestore';
import { codigoPara } from './cambios-semana.js';
import { proximoCiclo, pedidosParaElLink, destinatarioKommo, destinatariosUnicos, leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import {
    payloadContacto, payloadEjecutarBot, telefonosDeContacto, soloDigitos, enLotes, LOTE_CONTACTOS, LOTE_BOTS
} from '../../src/utils/kommoPayload.js';

export const TOPE = 150;
const ESPERA_MS = 200;               // Kommo aguanta 7 por segundo
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const SITIO = (process.env.SITIO_URL || 'https://bikitchencr.com').replace(/\/+$/, '');

let db;
try {
    db = getFirestore(appDeAdmin());
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
export const pedidosDelCiclo = (fechas) => leerPedidosDelCiclo(db, fechas);

/** El id del contacto en Kommo para un teléfono, o null. Una búsqueda por cliente. */
export const contactoPorTelefono = async (telefono) => {
    const res = await kommo(`/api/v4/contacts?query=${encodeURIComponent(telefono)}&limit=10`);
    const candidatos = res?._embedded?.contacts || [];
    const suyo = candidatos.find(c => telefonosDeContacto(c).includes(soloDigitos(telefono)));
    return suyo ? suyo.id : null;
};

/**
 * En modo prueba solo se le escribe al número de prueba. Si ese número no tiene
 * pedido esa semana, igual le llega UNA muestra (con el link fijo, que no abre
 * el pedido de nadie), para poder ver el mensaje sin esperar a tener un pack.
 */
export const soloAlNumeroDePrueba = (destinatarios, linkDeMuestra = '') => {
    const tel = soloDigitos(process.env.CAMBIOS_TELEFONO_PRUEBA);
    const suyo = destinatarios.find(d => d.telefono === tel);
    if (suyo) return [suyo];
    return [{ nombre: 'Prueba BiKitchen', telefono: tel, telefonoOriginal: tel, planes: ['Pack de prueba'], linkCambios: linkDeMuestra, muestra: true }];
};

/**
 * Busca (o crea) a cada destinatario en Kommo, le escribe sus datos en la
 * ficha y lanza el bot. Lo usan el envío del miércoles y el de renovación.
 *
 * @returns {Promise<{ conId: Array<{d, id}>, nuevos: Array }>}
 */
export const enviarPorKommo = async (destinatarios, { bot, camposIds, segmentoId }) => {
    // 1. Buscar cada contacto por teléfono
    const conId = [];
    const nuevos = [];
    for (const d of destinatarios) {
        const id = await contactoPorTelefono(d.telefono);
        if (id) conId.push({ d, id }); else nuevos.push(d);
        await dormir(ESPERA_MS);
    }
    // 2. Crear los que no están y escribirle sus datos a todos
    for (const lote of enLotes(nuevos, LOTE_CONTACTOS)) {
        const res = await kommo('/api/v4/contacts', { method: 'POST', body: lote.map(d => payloadContacto(d, { camposIds, segmentoId })) });
        (res?._embedded?.contacts || []).forEach((c, i) => conId.push({ d: lote[i], id: c.id }));
        await dormir(ESPERA_MS);
    }
    for (const lote of enLotes(conId.filter(x => !nuevos.includes(x.d)), LOTE_CONTACTOS)) {
        await kommo('/api/v4/contacts', {
            method: 'PATCH',
            body: lote.map(({ d, id }) => ({ id, ...payloadContacto(d, { camposIds, segmentoId }) }))
        });
        await dormir(ESPERA_MS);
    }
    // 3. Lanzar el bot, que es el que manda el mensaje
    for (const lote of enLotes(conId.map(x => x.id), LOTE_BOTS)) {
        await kommo('/api/v4/bots/run', { method: 'POST', body: payloadEjecutarBot(bot, lote) });
        await dormir(ESPERA_MS);
    }
    return { conId, nuevos };
};

/**
 * @param {object} opciones  inyectables para probar sin red ni reloj
 * @returns {Promise<{ estado: string, detalle?: object }>}
 */
export const correr = async ({ ahora = new Date(), modo = process.env.CAMBIOS_ENVIO_AUTOMATICO } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['CAMBIOS_SECRETO', 'KOMMO_SUBDOMINIO', 'KOMMO_TOKEN', 'KOMMO_BOT_CAMBIOS']
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
    const conTelefono = lista
        .map(i => destinatarioKommo(i, `${SITIO}/cambios/${codigoPara(i.pedido.id, i.fecha)}`))
        .filter(Boolean);
    const sinTelefono = lista.length - conTelefono.length;     // sin número o con uno de relleno
    let destinatarios = destinatariosUnicos(conTelefono);      // un mensaje por persona

    if (modo === 'prueba') destinatarios = soloAlNumeroDePrueba(destinatarios, `${SITIO}/cambios`);
    if (destinatarios.length > TOPE) {
        await constancia.set({ estado: 'frenado-por-tope', cuantos: destinatarios.length, revisadoEn: ahora.toISOString() }, { merge: true });
        return { estado: 'frenado-por-tope', detalle: { cuantos: destinatarios.length } };
    }

    const camposIds = {
        linkCambios: process.env.KOMMO_CAMPO_LINK_CAMBIOS,
        avance: process.env.KOMMO_CAMPO_AVANCE,
        proximaEntrega: process.env.KOMMO_CAMPO_PROXIMA_ENTREGA,
        pack: process.env.KOMMO_CAMPO_PACK,
        // Las variables de la plantilla `cambios_personal` (docs/KOMMO_CONFIGURACION.md)
        entrega: process.env.KOMMO_CAMPO_ENTREGA,
        cierreCambios: process.env.KOMMO_CAMPO_CIERRE_CAMBIOS
    };
    const { conId, nuevos } = await enviarPorKommo(destinatarios, {
        bot: process.env.KOMMO_BOT_CAMBIOS, camposIds, segmentoId: 'cambios-semana'
    });

    const detalle = {
        sabado, lunes, modo,
        enviados: conId.length, nuevosEnKommo: nuevos.length, sinTelefono, muestra: !!destinatarios[0]?.muestra,
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
