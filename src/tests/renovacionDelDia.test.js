// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renovacionesDelDia } from '../utils/envioDeCambios';

/**
 * La renovación sale el día de la ÚLTIMA entrega (decisión de Jan, 29 set 2026).
 * Lo que más importa: a quién NO le escribe.
 */

const HOY = '2026-10-03';
const pedido = (id, tel, fechas, extra = {}) => ({
    id, cliente: `Cliente ${id}`, telefono: tel, status: 'confirmed',
    plan: 'Pack Mensual Bajo en Calorías', items: [{ nombre: 'Pack Mensual Bajo en Calorías', cantidad: 1 }],
    fecha_entrega: fechas[0], fechas_entrega: fechas, calendarioFijo: true, ...extra
});

describe('a quién le toca la renovación hoy', () => {
    const lista = (pedidos) => renovacionesDelDia(pedidos, HOY).map(x => x.pedido.id);

    it('al que HOY recibe la última entrega de su pack', () => {
        expect(lista([pedido('a', '8811-0001', ['2026-09-26', HOY])])).toEqual(['a']);
    });

    it('no al que todavía tiene entregas, ni al de un pedido de una sola entrega', () => {
        expect(lista([pedido('b', '8811-0002', [HOY, '2026-10-10']), pedido('c', '8811-0003', [HOY])])).toEqual([]);
    });

    it('no al que ya renovó (mismo teléfono con otro pedido que sigue)', () => {
        expect(lista([
            pedido('a', '8811-0001', ['2026-09-26', HOY]),
            pedido('a2', '+506 8811 0001', ['2026-10-10', '2026-10-17'])
        ])).toEqual([]);
    });

    it('no a cancelados', () => {
        expect(lista([pedido('a', '8811-0001', ['2026-09-26', HOY], { status: 'cancelled' })])).toEqual([]);
    });
});

// ── La función programada ────────────────────────────────────────────────
const estado = vi.hoisted(() => ({ docs: {}, pedidos: [], escritos: {}, llamadas: [], kommoContactos: {}, registro: [] }));
vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        get: async () => ({ exists: !!estado.docs[ruta], data: () => estado.docs[ruta] }),
        set: async (datos) => { estado.escritos[ruta] = datos; }
    });
    const consulta = () => ({ where: () => consulta(), get: async () => ({ docs: estado.pedidos.map(p => ({ id: p.id, data: () => p })) }) });
    return { getFirestore: () => ({ doc: ref, collection: (c) => ({ doc: (id) => ref(`${c}/${id}`), where: () => consulta(), add: async (datos) => { estado.registro.push(datos); } }) }) };
});
Object.assign(process.env, { CAMBIOS_SECRETO: 's', KOMMO_SUBDOMINIO: 'bk', KOMMO_TOKEN: 't', KOMMO_BOT_RENOVACION: '115998' });
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
const { correr } = await import('../../netlify/functions/renovacion-del-dia.js');
const SABADO_10AM = new Date('2026-10-03T16:00:00Z');
const bots = () => estado.llamadas.filter(l => l.url.endsWith('/api/v4/bots/run')).map(l => l.body).flat();

describe('el envío de la renovación', () => {
    beforeEach(() => {
        estado.llamadas = [];
        estado.escritos = {};
        estado.registro = [];
        estado.docs = {};
        estado.kommoContactos = { 88110001: 201, 88990000: 999 };
        estado.pedidos = [
            pedido('a', '8811-0001', ['2026-09-26', HOY]),     // última hoy → sí
            pedido('b', '8811-0002', [HOY, '2026-10-10']),     // sigue → no
            pedido('r', '8888-8888', ['2026-09-26', HOY])      // relleno → nunca
        ];
    });

    it('apagado (lo normal) no toca nada', async () => {
        expect((await correr({ ahora: SABADO_10AM, modo: undefined })).estado).toBe('apagado');
        expect(estado.llamadas).toEqual([]);
    });

    it('prendido: solo al que termina hoy, con el bot de renovación, y deja constancia', async () => {
        const r = await correr({ ahora: SABADO_10AM, modo: 'si' });
        expect(r.estado).toBe('enviado');
        expect(bots()).toEqual([{ bot_id: 115998, entity_id: 201, entity_type: 'contacts' }]);
        expect(estado.escritos[`envios_renovacion/${HOY}`].estado).toBe('enviado');
        expect(estado.registro).toHaveLength(1);
        expect(estado.registro[0]).toMatchObject({ tipo: 'renovacion', modo: 'si', estado: 'enviado' });
        expect(estado.registro[0].enviados).toEqual([{ nombre: 'Cliente a', telefono: '88110001', fecha: HOY, muestra: false }]);
    });

    it('el mismo día no se manda dos veces', async () => {
        estado.docs[`envios_renovacion/${HOY}`] = { estado: 'enviado' };
        expect((await correr({ ahora: SABADO_10AM, modo: 'si' })).estado).toBe('ya-enviado');
        expect(bots()).toEqual([]);
    });

    it('en prueba: UNA muestra al número de prueba y la lista de a quién le habría llegado', async () => {
        process.env.CAMBIOS_TELEFONO_PRUEBA = '8899-0000';
        const r = await correr({ ahora: SABADO_10AM, modo: 'prueba' });
        delete process.env.CAMBIOS_TELEFONO_PRUEBA;
        expect(bots()).toEqual([{ bot_id: 115998, entity_id: 999, entity_type: 'contacts' }]);
        expect(r.detalle.lesHabriaLlegado).toEqual(['Cliente a']);
        expect(estado.registro[0].lesHabriaLlegado.map(p => p.nombre)).toEqual(['Cliente a']);
    });

    it('si nadie termina hoy, no manda nada', async () => {
        estado.pedidos = [pedido('b', '8811-0002', [HOY, '2026-10-10'])];
        expect((await correr({ ahora: SABADO_10AM, modo: 'si' })).estado).toBe('nadie');
        expect(bots()).toEqual([]);
    });
});
