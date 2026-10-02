// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * "Recibimos tu pago": sale solo, a quien le acaban de confirmar el pago.
 * Reemplaza las confirmaciones que Gina pegaba a mano (auditoría del 2 oct 2026).
 * Lo que más importa: a quién NO le escribe y que nunca sale dos veces.
 */

const HOY = '2026-10-01';
const pedido = (id, tel, fechas, extra = {}) => ({
    id, cliente: `Cliente ${id}`, telefono: tel, status: 'confirmed',
    plan: 'Pack Semanal Keto', items: [{ nombre: 'Pack Semanal Keto', cantidad: 1 }],
    fecha_entrega: fechas[0], fechas_entrega: fechas, calendarioFijo: true,
    pointsAwarded: true, pointsAwardedAt: '2026-10-01T15:55:00.000Z', ...extra
});

const estado = vi.hoisted(() => ({ pedidos: [], actualizados: {}, llamadas: [], kommoContactos: {}, desde: null }));
vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        get: async () => ({ exists: false, data: () => undefined }),
        set: async () => {},
        update: async (datos) => { estado.actualizados[ruta] = datos; }
    });
    const consulta = () => ({
        where: (_campo, _op, valor) => { estado.desde = valor; return consulta(); },
        get: async () => ({ docs: estado.pedidos.map(p => ({ id: p.id, data: () => p })) })
    });
    return {
        getFirestore: () => ({
            doc: ref,
            collection: (c) => ({ doc: (id) => ref(`${c}/${id}`), where: (...a) => consulta().where(...a) })
        })
    };
});
Object.assign(process.env, { CAMBIOS_SECRETO: 's', KOMMO_SUBDOMINIO: 'bk', KOMMO_TOKEN: 't', KOMMO_BOT_PAGO_RECIBIDO: '116000' });
globalThis.fetch = vi.fn(async (url, { method = 'GET', body } = {}) => {
    estado.llamadas.push({ url, method, body: body ? JSON.parse(body) : null });
    const u = new URL(url);
    if (method === 'GET' && u.pathname === '/api/v4/contacts') {
        const tel = u.searchParams.get('query');
        const id = estado.kommoContactos[tel];
        const texto = id ? JSON.stringify({ _embedded: { contacts: [{ id, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: tel }] }] }] } }) : '';
        return { ok: true, status: id ? 200 : 204, text: async () => texto };
    }
    return { ok: true, status: 200, text: async () => '' };
});
const { correr, pagosParaAvisar } = await import('../../netlify/functions/pago-recibido.js');
const JUEVES_10AM = new Date('2026-10-01T16:00:00Z');
const bots = () => estado.llamadas.filter(l => l.url.endsWith('/api/v4/bots/run')).map(l => l.body).flat();

describe('a quién le toca el aviso de pago', () => {
    const lista = (pedidos) => pagosParaAvisar(pedidos, HOY).map(x => x.pedido.id);

    it('al confirmado con una entrega de hoy en adelante, y le dice la próxima', () => {
        const [x] = pagosParaAvisar([pedido('a', '8811-0001', ['2026-09-26', '2026-10-03'])], HOY);
        expect(x.fecha).toBe('2026-10-03');
    });

    it('no al que ya se avisó, ni al que no está confirmado, ni al que ya recibió todo', () => {
        expect(lista([
            pedido('b', '8811-0002', ['2026-10-03'], { avisoPagoRecibido: '2026-10-01T15:56:00.000Z' }),
            pedido('c', '8811-0003', ['2026-10-03'], { status: 'pending' }),
            pedido('d', '8811-0004', ['2026-09-26'])
        ])).toEqual([]);
    });
});

describe('el envío del aviso de pago', () => {
    beforeEach(() => {
        estado.llamadas = [];
        estado.actualizados = {};
        estado.desde = null;
        estado.kommoContactos = { 88110001: 201, 88990000: 999 };
        estado.pedidos = [
            pedido('a', '8811-0001', ['2026-10-03']),
            pedido('r', '8888-8888', ['2026-10-03'])            // relleno → nunca
        ];
    });

    it('apagado (lo normal) no toca nada', async () => {
        expect((await correr({ ahora: JUEVES_10AM, modo: undefined })).estado).toBe('apagado');
        expect(estado.llamadas).toEqual([]);
    });

    it('lee solo la última media hora de confirmaciones (regla 17)', async () => {
        await correr({ ahora: JUEVES_10AM, modo: 'si' });
        expect(estado.desde).toBe('2026-10-01T15:30:00.000Z');
    });

    it('prendido: al confirmado, nunca al relleno, y lo marca en SU pedido para no repetir', async () => {
        const r = await correr({ ahora: JUEVES_10AM, modo: 'si' });
        expect(r.estado).toBe('enviado');
        expect(bots()).toEqual([{ bot_id: 116000, entity_id: 201, entity_type: 'contacts' }]);
        expect(Object.keys(estado.actualizados)).toEqual(['pedidos/a']);
    });

    it('en prueba: solo si el pedido es del número de prueba', async () => {
        process.env.CAMBIOS_TELEFONO_PRUEBA = '8899-0000';
        const r = await correr({ ahora: JUEVES_10AM, modo: 'prueba' });
        expect(r.estado).toBe('nadie');
        expect(bots()).toEqual([]);

        estado.pedidos.push(pedido('j', '8899-0000', ['2026-10-03']));
        await correr({ ahora: JUEVES_10AM, modo: 'prueba' });
        delete process.env.CAMBIOS_TELEFONO_PRUEBA;
        expect(bots()).toEqual([{ bot_id: 116000, entity_id: 999, entity_type: 'contacts' }]);
        expect(Object.keys(estado.actualizados)).toEqual(['pedidos/j']);
    });

    it('sin el bot configurado no manda', async () => {
        const bot = process.env.KOMMO_BOT_PAGO_RECIBIDO;
        delete process.env.KOMMO_BOT_PAGO_RECIBIDO;
        expect((await correr({ ahora: JUEVES_10AM, modo: 'si' })).estado).toBe('sin-configurar');
        process.env.KOMMO_BOT_PAGO_RECIBIDO = bot;
        expect(bots()).toEqual([]);
    });
});
