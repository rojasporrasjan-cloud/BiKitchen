// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resumirEventos, cambiosDeFicha, telefonoDelContacto, noMolestarVigente, ventanaAbierta } from '../utils/kommoSync';

/**
 * La conexión con Kommo (fase 1 de docs/PLAN_DIFUSIONES_AUTOMATICAS.md).
 * Lo que importa: que lea TODO (Kommo entrega lo más nuevo primero), que no
 * gaste lecturas de Firestore y que la ficha diga la verdad.
 */

const s = (isoFecha) => Math.floor(new Date(isoFecha).getTime() / 1000);
const chat = (tipo, contacto, cuando) => ({
    type: tipo, entity_type: 'lead', entity_id: 900 + contacto, created_at: s(cuando),
    _embedded: { entity: { id: 900 + contacto, linked_talk_contact_id: contacto } },
    value_after: [{ message: { talk_id: 1, origin: 'waba' } }]
});

describe('el resumen de los eventos', () => {
    it('se queda con el ÚLTIMO mensaje de cada lado, aunque Kommo los mande desordenados', () => {
        const r = resumirEventos([
            chat('incoming_chat_message', 1, '2026-10-05T15:00:00Z'),
            chat('outgoing_chat_message', 1, '2026-10-05T20:11:00Z'),
            chat('incoming_chat_message', 1, '2026-10-05T10:00:00Z')
        ]);
        expect(r.porContacto.get(1)).toEqual({ ultimoEntrante: '2026-10-05T15:00:00.000Z', ultimoSaliente: '2026-10-05T20:11:00.000Z' });
    });

    it('el cambio de etapa queda por lead, y la etiqueta no-molestar por contacto o por lead', () => {
        const r = resumirEventos([
            { type: 'lead_status_changed', entity_type: 'lead', entity_id: 7, created_at: s('2026-10-05T12:00:00Z'), value_after: [{ lead_status: { id: 106292691, pipeline_id: 13776399 } }] },
            { type: 'entity_tag_added', entity_type: 'contact', entity_id: 3, created_at: s('2026-10-05T13:00:00Z'), value_after: [{ tag: { name: 'no-molestar' } }] },
            { type: 'entity_tag_added', entity_type: 'lead', entity_id: 8, created_at: s('2026-10-05T13:00:00Z'), value_after: [{ tag: { name: 'No-Molestar' } }] },
            { type: 'entity_tag_added', entity_type: 'contact', entity_id: 4, created_at: s('2026-10-05T13:00:00Z'), value_after: [{ tag: { name: 'bk-cambios-semana' } }] }
        ]);
        expect(r.porLead.get(7)).toMatchObject({ estado: 106292691, pipeline: 13776399 });
        expect(r.porContacto.get(3).noMolestar.puesta).toBe(true);
        expect(r.etiquetasDeLead.get(8).puesta).toBe(true);
        expect(r.porContacto.has(4)).toBe(false);       // otras etiquetas no importan
    });
});

describe('la ficha', () => {
    it('un mensaje = chat vivo en el WhatsApp bueno, y ese es el contacto bueno', () => {
        const f = cambiosDeFicha('88110001', 21471156, { ultimoEntrante: '2026-10-05T15:00:00.000Z' });
        expect(f).toMatchObject({ tel: '88110001', contactoBueno: 21471156, chatVivo: true, whatsappViejo: false });
    });

    it('sacar la etiqueta borra el "no molestar"', () => {
        expect(cambiosDeFicha('88110001', 1, { noMolestar: { puesta: false, cuando: 'x' } }).noMolestarDesde).toBeNull();
    });

    it('"no me interesa" dura 30 días', () => {
        const f = { noMolestarDesde: '2026-10-05T12:00:00.000Z' };
        expect(noMolestarVigente(f, new Date('2026-11-03T12:00:00Z'))).toBe(true);
        expect(noMolestarVigente(f, new Date('2026-11-05T12:00:00Z'))).toBe(false);
    });

    it('la ventana de 24 h', () => {
        const f = { ultimoEntrante: '2026-10-05T15:00:00.000Z' };
        expect(ventanaAbierta(f, new Date('2026-10-06T14:00:00Z'))).toBe(true);
        expect(ventanaAbierta(f, new Date('2026-10-06T16:00:00Z'))).toBe(false);
    });

    it('teléfono: el primero que sirve, nunca uno de relleno', () => {
        const c = (...v) => ({ custom_fields_values: [{ field_code: 'PHONE', values: v.map(value => ({ value })) }] });
        expect(telefonoDelContacto(c('8888-8888', '+506 7275 2645'))).toBe('72752645');
        expect(telefonoDelContacto(c('123'))).toBe('');
    });
});

// ── La función programada ────────────────────────────────────────────────
const est = vi.hoisted(() => ({ docs: {}, escritos: {}, lotes: [], llamadas: [], eventos: [], contactos: {}, leads: {} }));
vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        ruta,
        get: async () => { est.lecturas = (est.lecturas || 0) + 1; return { exists: !!est.docs[ruta], data: () => est.docs[ruta] }; },
        set: async (datos) => { est.escritos[ruta] = datos; }
    });
    return {
        FieldValue: { arrayUnion: (...v) => ({ arrayUnion: v }) },
        getFirestore: () => ({
            collection: (c) => ({ doc: (id) => ref(`${c}/${id}`) }),
            batch: () => {
                const ops = [];
                return { set: (r, d) => ops.push([r.ruta, d]), commit: async () => { est.lotes.push(ops); ops.forEach(([r, d]) => { est.escritos[r] = d; }); } };
            }
        })
    };
});
Object.assign(process.env, { KOMMO_SUBDOMINIO: 'bk', KOMMO_TOKEN: 't', KOMMO_SYNC_ESPERA_MS: '0' });
globalThis.fetch = vi.fn(async (url) => {
    const u = new URL(url);
    est.llamadas.push(u.pathname + u.search);
    const responder = (cuerpo) => ({ ok: true, status: 200, text: async () => JSON.stringify(cuerpo) });
    if (u.pathname === '/api/v4/events') {
        const desde = Number(u.searchParams.get('filter[created_at][from]'));
        const hasta = Number(u.searchParams.get('filter[created_at][to]'));
        const pagina = Number(u.searchParams.get('page'));
        // Como Kommo: lo más nuevo primero
        const todos = est.eventos.filter(e => e.created_at >= desde && e.created_at <= hasta).sort((a, b) => b.created_at - a.created_at);
        const lote = todos.slice((pagina - 1) * 100, pagina * 100);
        return lote.length ? responder({ _embedded: { events: lote } }) : { ok: true, status: 204, text: async () => '' };
    }
    if (u.pathname === '/api/v4/contacts') {
        const ids = u.searchParams.getAll('filter[id][]').map(Number);
        return responder({ _embedded: { contacts: ids.filter(id => est.contactos[id]).map(id => ({ id, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: est.contactos[id] }] }] })) } });
    }
    if (u.pathname === '/api/v4/leads') {
        const ids = u.searchParams.getAll('filter[id][]').map(Number);
        return responder({ _embedded: { leads: ids.map(id => ({ id, _embedded: { contacts: [{ id: est.leads[id], is_main: true }] } })) } });
    }
    return { ok: true, status: 204, text: async () => '' };
});
const { correr, DIAS_ATRAS_LA_PRIMERA_VEZ } = await import('../../netlify/functions/kommo-sync.js');
const AHORA = new Date('2026-10-05T21:00:00Z');

/** Vueltas seguidas (como cada 10 min) hasta quedar al día. Devuelve cuántos eventos leyó en total. */
const hastaQuedarAlDia = async (ahora = AHORA, maximo = 60) => {
    let total = 0;
    for (let i = 0; i < maximo; i++) {
        const r = await correr({ ahora });
        total += r.detalle.eventos;
        est.docs['kommo_sync/estado'] = est.escritos['kommo_sync/estado'];
        est.docs['kommo_sync/indice'] = est.escritos['kommo_sync/indice'] || est.docs['kommo_sync/indice'];
        if (r.estado === 'al-dia') return { total, vueltas: i + 1 };
    }
    throw new Error('no quedó al día');
};

describe('la vuelta de cada 10 minutos', () => {
    beforeEach(() => {
        Object.assign(est, { docs: {}, escritos: {}, lotes: [], llamadas: [], lecturas: 0 });
        est.contactos = { 1: '+506 8811 0001', 2: '8811-0002', 5: '8888-8888' };
        est.leads = { 77: 2 };
        est.eventos = [
            chat('incoming_chat_message', 1, '2026-10-05T15:00:00Z'),
            chat('outgoing_chat_message', 1, '2026-10-05T20:11:00Z'),
            chat('incoming_chat_message', 5, '2026-10-05T16:00:00Z'),   // teléfono de relleno: sin ficha
            { type: 'lead_status_changed', entity_type: 'lead', entity_id: 77, created_at: s('2026-10-05T18:00:00Z'), value_after: [{ lead_status: { id: 106292691, pipeline_id: 13776399 } }] }
        ];
    });

    it('apagada con "no"', async () => {
        expect((await correr({ ahora: AHORA, modo: 'no' })).estado).toBe('apagado');
        expect(est.llamadas).toEqual([]);
    });

    it('la primera vez lee 30 días atrás por ventanas, arma las fichas y queda al día', async () => {
        const { total } = await hastaQuedarAlDia();
        expect(total).toBe(4);
        const f1 = est.escritos['kommo_contactos/88110001'];
        expect(f1).toMatchObject({ ultimoEntrante: '2026-10-05T15:00:00.000Z', ultimoSaliente: '2026-10-05T20:11:00.000Z', contactoBueno: 1, chatVivo: true });
        expect(est.escritos['kommo_contactos/88110002'].etapa).toMatchObject({ estado: 106292691, leadId: 77 });
        expect(Object.keys(est.escritos).some(k => k.includes('88888888'))).toBe(false);
        expect(est.escritos['kommo_sync/estado'].cursor).toBe(s(AHORA));
        // Empezó 30 días atrás
        const primera = est.llamadas.find(l => l.startsWith('/api/v4/events'));
        expect(Number(new URLSearchParams(primera.split('?')[1]).get('filter[created_at][from]'))).toBe(s(AHORA) - DIAS_ATRAS_LA_PRIMERA_VEZ * 86400 + 1);
    });

    it('Firestore: cada vuelta lee solo 2 documentos (estado e índice), nunca las fichas', async () => {
        const { vueltas } = await hastaQuedarAlDia();
        expect(est.lecturas).toBe(2 * vueltas);
    });

    it('la siguiente vuelta sigue desde donde quedó y no repite contactos ya conocidos', async () => {
        await hastaQuedarAlDia();
        est.llamadas = [];
        est.eventos.push(chat('incoming_chat_message', 1, '2026-10-05T21:05:00Z'));
        const r = await correr({ ahora: new Date('2026-10-05T21:10:00Z') });
        expect(r.detalle.eventos).toBe(1);
        expect(est.llamadas.some(l => l.startsWith('/api/v4/contacts'))).toBe(false);
        expect(est.escritos['kommo_contactos/88110001'].ultimoEntrante).toBe('2026-10-05T21:05:00.000Z');
    });

    it('con muchísimos eventos no se salta nada: avanza de a ventanas y sigue en la próxima vuelta', async () => {
        // 2.500 mensajes en un mismo día (más que una vuelta): Kommo los da del más nuevo al más viejo
        est.eventos = Array.from({ length: 2500 }, (_, i) => chat('incoming_chat_message', 1, new Date(s('2026-09-20T00:00:00Z') * 1000 + i * 30000).toISOString()));
        const r1 = await correr({ ahora: AHORA });
        expect(r1.estado).toBe('poniendose-al-dia');
        est.docs['kommo_sync/estado'] = est.escritos['kommo_sync/estado'];
        est.docs['kommo_sync/indice'] = est.escritos['kommo_sync/indice'];
        const { total } = await hastaQuedarAlDia();
        expect(total + r1.detalle.eventos).toBe(2500);           // ni uno de menos, ni repetidos
        expect(est.escritos['kommo_contactos/88110001'].ultimoEntrante).toBe(new Date(s('2026-09-20T00:00:00Z') * 1000 + 2499 * 30000).toISOString());
    });
});
