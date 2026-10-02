// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sinPagarConEntregaCerca, pagosPorRecordar } from '../utils/avisosDePago';

/**
 * Recordatorio de pago: a quien tiene el pedido sin pagar y la entrega en los
 * próximos 3 días. "Sin pagar" es lo que dice el sistema, así que lo que más
 * importa es que no le escriba a quien ya está confirmado, ni dos veces.
 */

const HOY = '2026-10-01';
const pedido = (id, tel, fechas, extra = {}) => ({
    id, cliente: `Cliente ${id}`, telefono: tel, status: 'pending_payment',
    plan: 'Pack Semanal Keto', items: [{ nombre: 'Pack Semanal Keto', cantidad: 1 }],
    fecha_entrega: fechas[0], fechas_entrega: fechas, calendarioFijo: true, ...extra
});

describe('a quién le toca el recordatorio', () => {
    const ids = (lista) => lista.map(x => x.pedido.id);

    it('sin pagar y con entrega en los próximos 3 días; los más cercanos primero', () => {
        expect(ids(sinPagarConEntregaCerca([
            pedido('lunes', '8811-0001', ['2026-10-05']),       // 4 días → todavía no
            pedido('sabado', '8811-0002', ['2026-10-03']),
            pedido('hoy', '8811-0003', ['2026-10-01'])
        ], HOY))).toEqual(['hoy', 'sabado']);
    });

    it('no a confirmados, ni a los que ya entregaron, ni a cancelados', () => {
        expect(ids(sinPagarConEntregaCerca([
            pedido('a', '8811-0001', ['2026-10-03'], { status: 'confirmed' }),
            pedido('b', '8811-0002', ['2026-10-03'], { paymentConfirmed: true }),
            pedido('c', '8811-0003', ['2026-09-30']),
            pedido('d', '8811-0004', ['2026-10-03'], { status: 'cancelled' })
        ], HOY))).toEqual([]);
    });

    it('una sola vez: el que ya tuvo su recordatorio no vuelve a salir', () => {
        const recordado = pedido('a', '8811-0001', ['2026-10-03'], { avisoRecordatorioPago: '2026-09-30T16:00:00Z' });
        expect(ids(pagosPorRecordar([recordado], HOY))).toEqual([]);
    });
});

// ── La función programada ────────────────────────────────────────────────
const estado = vi.hoisted(() => ({ pedidos: [], actualizados: {}, llamadas: [], kommoContactos: {}, filtro: null, registro: [] }));
vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        get: async () => ({ exists: false, data: () => undefined }),
        set: async () => {},
        update: async (datos) => { estado.actualizados[ruta] = datos; }
    });
    const consulta = () => ({
        where: (...filtro) => { estado.filtro = filtro; return consulta(); },
        get: async () => ({ docs: estado.pedidos.map(p => ({ id: p.id, data: () => p })) })
    });
    return {
        getFirestore: () => ({
            doc: ref,
            collection: (c) => ({
                doc: (id) => ref(`${c}/${id}`),
                where: (...a) => consulta().where(...a),
                add: async (datos) => { estado.registro.push(datos); }
            })
        })
    };
});
Object.assign(process.env, { CAMBIOS_SECRETO: 's', KOMMO_SUBDOMINIO: 'bk', KOMMO_TOKEN: 't', KOMMO_BOT_RECORDATORIO_PAGO: '117000' });
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
const { correr, TOPE } = await import('../../netlify/functions/recordatorio-pago.js');
const JUEVES_10AM = new Date('2026-10-01T16:00:00Z');
const bots = () => estado.llamadas.filter(l => l.url.endsWith('/api/v4/bots/run')).map(l => l.body).flat();

describe('el envío del recordatorio de pago', () => {
    beforeEach(() => {
        estado.llamadas = [];
        estado.actualizados = {};
        estado.registro = [];
        estado.filtro = null;
        estado.kommoContactos = { 88110001: 301, 88990000: 999 };
        estado.pedidos = [
            pedido('a', '8811-0001', ['2026-10-03']),
            pedido('r', '8888-8888', ['2026-10-03'])            // relleno → nunca
        ];
    });

    it('apagado (lo normal) no toca nada', async () => {
        expect((await correr({ ahora: JUEVES_10AM, modo: undefined })).estado).toBe('apagado');
        expect(estado.llamadas).toEqual([]);
    });

    it('lee solo los pedidos sin pagar (regla 17)', async () => {
        await correr({ ahora: JUEVES_10AM, modo: 'si' });
        expect(estado.filtro).toEqual(['status', 'in', ['pending_payment', 'payment_failed']]);
    });

    it('prendido: le escribe al que debe, nunca al relleno, y lo marca en su pedido', async () => {
        const r = await correr({ ahora: JUEVES_10AM, modo: 'si' });
        expect(r.estado).toBe('enviado');
        expect(bots()).toEqual([{ bot_id: 117000, entity_id: 301, entity_type: 'contacts' }]);
        expect(Object.keys(estado.actualizados)).toEqual(['pedidos/a']);
        expect(estado.actualizados['pedidos/a']).toHaveProperty('avisoRecordatorioPago');
        expect(estado.registro[0]).toMatchObject({ tipo: 'recordatorio-pago', modo: 'si', estado: 'enviado' });
    });

    it('en prueba: al cliente NO le llega; a vos una muestra y la lista queda en el registro', async () => {
        process.env.CAMBIOS_TELEFONO_PRUEBA = '8899-0000';
        const r = await correr({ ahora: JUEVES_10AM, modo: 'prueba' });
        delete process.env.CAMBIOS_TELEFONO_PRUEBA;
        expect(r.estado).toBe('prueba');
        expect(bots()).toEqual([{ bot_id: 117000, entity_id: 999, entity_type: 'contacts' }]);
        expect(estado.actualizados['pedidos/a']).toHaveProperty('avisoRecordatorioPagoPrueba');
        expect(estado.registro[0].lesHabriaLlegado.map(p => p.nombre)).toEqual(['Cliente a']);
    });

    it(`con más de ${TOPE} no manda NADA y lo anota`, async () => {
        estado.pedidos = Array.from({ length: TOPE + 1 }, (_, i) => pedido(`p${i}`, `8800${String(i).padStart(4, '0')}`, ['2026-10-03']));
        expect((await correr({ ahora: JUEVES_10AM, modo: 'si' })).estado).toBe('frenado-por-tope');
        expect(bots()).toEqual([]);
        expect(estado.registro[0].estado).toBe('frenado-por-tope');
    });
});
