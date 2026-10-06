/* global process */
/**
 * Netlify Scheduled Function: kommo-sync — la conexión con Kommo.
 *
 * Cada 10 minutos lee de Kommo lo que pasó desde la última vuelta (mensajes que
 * entraron y salieron, cambios de etapa, la etiqueta `no-molestar`) y lo deja en
 * una ficha por cliente: `kommo_contactos/{8 dígitos}`. Ver src/utils/kommoSync.js
 * y docs/PLAN_DIFUSIONES_AUTOMATICAS.md (fase 1).
 *
 * NO le manda nada a nadie: solo lee de Kommo y escribe en Firestore.
 *
 * Firestore (regla 17): por vuelta lee 2 documentos (`kommo_sync/estado` y
 * `kommo_sync/indice`) y escribe solo las fichas que cambiaron. Nunca baja
 * `kommo_contactos` entero.
 *
 * La primera vez arranca 30 días atrás y avanza de a MAX_PAGINAS por vuelta
 * hasta ponerse al día (unas 2–3 horas).
 *
 * KOMMO_SYNC_AUTOMATICO: (sin poner) / "si" → corre · "no" → apagado.
 * Variables: KOMMO_SUBDOMINIO, KOMMO_TOKEN.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import {
    TIPOS_DE_EVENTO, resumirEventos, cambiosDeFicha, telefonoDelContacto
} from '../../src/utils/kommoSync.js';

export const MAX_PAGINAS = 20;            // 2.000 eventos por vuelta
export const DIAS_ATRAS_LA_PRIMERA_VEZ = 30;
// Kommo aguanta 7 consultas por segundo (en las pruebas, 0)
const ESPERA_MS = Number(process.env.KOMMO_SYNC_ESPERA_MS ?? 160);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[KommoSync] Firebase init:', err.message);
}

const kommo = async (ruta) => {
    const res = await fetch(`https://${process.env.KOMMO_SUBDOMINIO}.kommo.com${ruta}`, {
        headers: { Authorization: `Bearer ${process.env.KOMMO_TOKEN}` }
    });
    if (res.status === 204) return {};
    const texto = await res.text();
    if (!res.ok) throw new Error(`Kommo ${res.status}: ${texto.slice(0, 200)}`);
    return texto ? JSON.parse(texto) : {};
};

/**
 * Todos los eventos de UNA ventana [desde, hasta] (segundos, ambos incluidos).
 * Devuelve null si la ventana tiene más de lo que se puede leer en `paginas`.
 *
 * Kommo entrega SIEMPRE lo más nuevo primero (ignora el orden que se le pida),
 * así que no se puede "leer desde X y cortar": se saltaría lo viejo. Por eso se
 * lee por ventanas de tiempo cerradas, completas, de atrás hacia adelante.
 */
const traerVentana = async (desde, hasta, paginas) => {
    const tipos = TIPOS_DE_EVENTO.map(t => `filter[type][]=${t}`).join('&');
    const eventos = [];
    for (let pagina = 1; pagina <= paginas; pagina++) {
        const d = await kommo(`/api/v4/events?${tipos}&filter[created_at][from]=${desde}&filter[created_at][to]=${hasta}&limit=100&page=${pagina}`);
        const lote = d?._embedded?.events || [];
        eventos.push(...lote);
        await dormir(ESPERA_MS);
        if (lote.length < 100) return { eventos, paginas: pagina };
    }
    return null;
};

/** Ventana de lectura: 12 h mientras se pone al día; si una no cabe, se parte a la mitad. */
export const VENTANA_INICIAL_S = 12 * 3600;
const VENTANA_MINIMA_S = 10 * 60;

/**
 * Lee ventanas seguidas desde el cursor hasta ahora, sin pasarse de MAX_PAGINAS
 * en total. Devuelve los eventos y hasta dónde quedó leído.
 */
const traerEventos = async (cursor, ahoraS, ventanaS) => {
    const eventos = [];
    let desde = cursor;
    let ventana = ventanaS;
    let paginasUsadas = 0;
    while (desde <= ahoraS && paginasUsadas < MAX_PAGINAS) {
        const hasta = Math.min(ahoraS, desde + ventana - 1);
        const r = await traerVentana(desde, hasta, MAX_PAGINAS - paginasUsadas);
        if (!r) {
            // No cupo en lo que QUEDABA de la vuelta: se sigue en la próxima con
            // la misma ventana. Solo se achica si no cupo ni con la vuelta entera
            // (6 oct 2026: se achicaba por falta de páginas y ponerse al día con
            // 30 días tomaba horas, un día de eventos por vuelta).
            if (paginasUsadas === 0 && ventana > VENTANA_MINIMA_S) {
                ventana = Math.max(VENTANA_MINIMA_S, Math.floor(ventana / 2));
            }
            break;
        }
        eventos.push(...r.eventos);
        paginasUsadas += r.paginas;
        desde = hasta + 1;
        // Una ventana que cupo holgada: la próxima puede ser más grande
        if (r.paginas <= MAX_PAGINAS / 4) ventana = Math.min(VENTANA_INICIAL_S, ventana * 2);
    }
    return { eventos, leidoHasta: desde - 1, alDia: desde > ahoraS, ventana };
};

/** De a 200 ids por consulta. */
const porLotes = async (ids, ruta, clave, extra = '') => {
    const salida = [];
    for (let i = 0; i < ids.length; i += 200) {
        const filtro = ids.slice(i, i + 200).map(id => `filter[id][]=${id}`).join('&');
        const d = await kommo(`${ruta}?${filtro}&limit=250${extra}`);
        salida.push(...(d?._embedded?.[clave] || []));
        await dormir(ESPERA_MS);
    }
    return salida;
};

export const correr = async ({ ahora = new Date(), modo = process.env.KOMMO_SYNC_AUTOMATICO } = {}) => {
    if (modo === 'no') return { estado: 'apagado' };
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN'].filter(v => !process.env[v]);
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const refEstado = db.collection('kommo_sync').doc('estado');
    const refIndice = db.collection('kommo_sync').doc('indice');
    const [snapEstado, snapIndice] = await Promise.all([refEstado.get(), refIndice.get()]);
    const estadoPrevio = snapEstado.exists ? snapEstado.data() : {};
    // contacto de Kommo → teléfono. Así no se pregunta dos veces por el mismo contacto.
    const indice = snapIndice.exists ? (snapIndice.data()?.contactos || {}) : {};

    const ahoraS = Math.floor(ahora.getTime() / 1000);
    // `cursor` = el último segundo ya leído completo
    const cursor = Number(estadoPrevio.cursor) || ahoraS - DIAS_ATRAS_LA_PRIMERA_VEZ * 86400;
    const ventanaPrevia = Number(estadoPrevio.ventana) || VENTANA_INICIAL_S;
    const { eventos, leidoHasta, alDia, ventana } = await traerEventos(cursor + 1, ahoraS, ventanaPrevia);
    const r = resumirEventos(eventos);

    // Los leads con cambio de etapa o etiqueta → su contacto principal
    const leadsNuevos = [...new Set([...r.porLead.keys(), ...r.etiquetasDeLead.keys()])];
    const contactoDeLead = new Map();
    if (leadsNuevos.length) {
        const leads = await porLotes(leadsNuevos, '/api/v4/leads', 'leads', '&with=contacts').catch(() => []);
        for (const l of leads) {
            const principal = (l?._embedded?.contacts || []).find(c => c.is_main) || l?._embedded?.contacts?.[0];
            if (principal?.id) contactoDeLead.set(Number(l.id), Number(principal.id));
        }
    }
    r.porLead.forEach((etapa, leadId) => {
        const c = contactoDeLead.get(leadId);
        if (!c) return;
        const actual = r.porContacto.get(c) || {};
        r.porContacto.set(c, { ...actual, etapa: { ...etapa, leadId } });
    });
    r.etiquetasDeLead.forEach((marca, leadId) => {
        const c = contactoDeLead.get(leadId);
        if (!c) return;
        r.porContacto.set(c, { ...(r.porContacto.get(c) || {}), noMolestar: marca });
    });

    // Teléfonos de los contactos que todavía no están en el índice
    const sinTelefono = [...r.porContacto.keys()].filter(id => !(String(id) in indice));
    let indiceCambio = false;
    if (sinTelefono.length) {
        const contactos = await porLotes(sinTelefono, '/api/v4/contacts', 'contacts');
        contactos.forEach((c) => { indice[String(c.id)] = telefonoDelContacto(c); });
        sinTelefono.forEach((id) => { if (!(String(id) in indice)) indice[String(id)] = ''; });   // borrado o sin número
        indiceCambio = true;
    }

    // Una escritura por teléfono, en tandas de 400
    const porTelefono = new Map();
    r.porContacto.forEach((cambio, id) => {
        const tel = indice[String(id)];
        if (!tel) return;
        const ficha = cambiosDeFicha(tel, id, cambio, ahora);
        porTelefono.set(tel, { ...(porTelefono.get(tel) || {}), ...ficha, contactoId: id });
    });
    const fichas = [...porTelefono.entries()];
    for (let i = 0; i < fichas.length; i += 400) {
        const tanda = db.batch();
        fichas.slice(i, i + 400).forEach(([tel, f]) => {
            const { contactoId, ...resto } = f;
            tanda.set(db.collection('kommo_contactos').doc(tel), {
                ...resto,
                contactos: FieldValue.arrayUnion(contactoId)
            }, { merge: true });
        });
        await tanda.commit();
    }
    if (indiceCambio) await refIndice.set({ contactos: indice, actualizado: ahora.toISOString() });

    const nuevoCursor = Math.max(cursor, leidoHasta);
    const detalle = {
        eventos: eventos.length, fichas: fichas.length, contactosNuevos: sinTelefono.length,
        alDia, leidoHasta: new Date(nuevoCursor * 1000).toISOString()
    };
    await refEstado.set({
        cursor: nuevoCursor,
        // Al día, la ventana vuelve a la grande; si se tuvo que partir, se recuerda
        ventana: alDia ? VENTANA_INICIAL_S : ventana,
        ultimaVuelta: ahora.toISOString(), ...detalle,
        totalEventos: (Number(estadoPrevio.totalEventos) || 0) + eventos.length
    }, { merge: true });
    return { estado: alDia ? 'al-dia' : 'poniendose-al-dia', detalle };
};

export default async () => {
    try {
        const r = await correr();
        console.log('[KommoSync]', JSON.stringify(r));
        return new Response(JSON.stringify(r), { status: 200 });
    } catch (err) {
        console.error('[KommoSync] Error:', err);
        return new Response(err.message, { status: 500 });
    }
};

// Cada 10 minutos
export const config = {
    schedule: '*/10 * * * *'
};
