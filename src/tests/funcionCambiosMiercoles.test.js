// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El envío automático del miércoles: manda WhatsApp reales solo, así que lo
 * que más importa es CUÁNDO NO manda.
 */

const estado = vi.hoisted(() => ({ docs: {}, pedidos: [], escritos: {}, llamadas: [], kommoContactos: {} }));

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        get: async () => ({ exists: !!estado.docs[ruta], data: () => estado.docs[ruta] }),
        set: async (datos) => { estado.escritos[ruta] = datos; },
        update: async () => {}
    });
    const consulta = () => ({ where: () => consulta(), get: async () => ({ docs: estado.pedidos.map(p => ({ id: p.id, data: () => p })) }) });
    return {
        getFirestore: () => ({
            doc: ref,
            collection: (c) => ({ doc: (id) => ref(`${c}/${id}`), where: () => consulta() })
        })
    };
});

Object.assign(process.env, {
    CAMBIOS_SECRETO: 's', KOMMO_SUBDOMINIO: 'bk', KOMMO_TOKEN: 't',
    KOMMO_BOT_CAMBIOS: '11', KOMMO_CAMPO_LINK_CAMBIOS: '900', KOMMO_BOT_RENOVACION: '22'
});

globalThis.fetch = vi.fn(async (url, { method = 'GET', body } = {}) => {
    estado.llamadas.push({ url, method, body: body ? JSON.parse(body) : null });
    const u = new URL(url);
    if (method === 'GET' && u.pathname === '/api/v4/contacts') {
        const tel = u.searchParams.get('query');
        const id = estado.kommoContactos[tel];
        const texto = id ? JSON.stringify({ _embedded: { contacts: [{ id, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: tel }] }] }] } }) : '';
        return { ok: true, status: id ? 200 : 204, text: async () => texto };
    }
    if (method === 'POST' && u.pathname === '/api/v4/contacts') {
        const creados = JSON.parse(body).map((_, i) => ({ id: 5000 + i }));
        return { ok: true, status: 200, text: async () => JSON.stringify({ _embedded: { contacts: creados } }) };
    }
    return { ok: true, status: 200, text: async () => '' };
});

const { correr, TOPE } = await import('../../netlify/functions/cambios-miercoles.js');

const MIERCOLES = new Date('2026-09-23T14:00:00Z');
const pedido = (id, tel, fechas) => ({
    id, cliente: `Cliente ${id}`, telefono: tel, status: 'confirmed',
    plan: 'Pack Mensual Bajo en Calorías', items: [{ nombre: 'Pack Mensual Bajo en Calorías', cantidad: 1 }],
    fechas_entrega: fechas
});

beforeEach(() => {
    estado.llamadas = [];
    estado.escritos = {};
    estado.kommoContactos = { 88110001: 101 };
    estado.docs = {
        'menus_oficial/current': { bajoCalorias: [{ numero: 1, proteina: 'Pollo mostaza miel', vegetal: 'Relish', carbo: 'Arroz' }] },
        'config/substitutions': { proteins: ['Estofado de res casero'] }
    };
    estado.pedidos = [
        pedido('a', '8811-0001', ['2026-09-19', '2026-09-26', '2026-10-03']),     // sigue: mensaje de cambios
        pedido('b', '8811-0002', ['2026-09-21', '2026-09-28'])                    // última: también recibe el menú
    ];
});

const bots = () => estado.llamadas.filter(l => l.url.endsWith('/api/v4/bots/run')).map(l => l.body);

describe('el envío automático del miércoles', () => {
    it('apagado (lo normal) no toca nada', async () => {
        expect((await correr({ ahora: MIERCOLES, modo: undefined })).estado).toBe('apagado');
        expect(estado.llamadas).toEqual([]);
    });

    it('prendido: le escribe el link a cada uno y a TODOS les lanza el bot del menú (la renovación va aparte)', async () => {
        const r = await correr({ ahora: MIERCOLES, modo: 'si' });
        expect(r.estado).toBe('enviado');
        expect(r.detalle).toMatchObject({ sabado: '2026-09-26', lunes: '2026-09-28', enviados: 2, nuevosEnKommo: 1 });
        expect(bots()).toEqual([
            [{ bot_id: 11, entity_id: 101, entity_type: 'contacts' }, { bot_id: 11, entity_id: 5000, entity_type: 'contacts' }]
        ]);
        const patch = estado.llamadas.find(l => l.method === 'PATCH').body[0];
        const link = patch.custom_fields_values.find(c => c.field_id === 900).values[0].value;
        expect(link).toMatch(/^https:\/\/bikitchencr\.com\/cambios\/a\.2026-09-26\./);
        expect(estado.escritos['envios_cambios/2026-09-26'].estado).toBe('enviado');
    });

    it('la misma semana no se manda dos veces', async () => {
        estado.docs['envios_cambios/2026-09-26'] = { estado: 'enviado' };
        expect((await correr({ ahora: MIERCOLES, modo: 'si' })).estado).toBe('ya-enviado');
        expect(bots()).toEqual([]);
    });

    it('en prueba, si el número de prueba no tiene pedido, le llega UNA muestra con el link fijo', async () => {
        process.env.CAMBIOS_TELEFONO_PRUEBA = '8899-0000';
        estado.kommoContactos = { 88990000: 777 };
        const r = await correr({ ahora: MIERCOLES, modo: 'prueba' });
        delete process.env.CAMBIOS_TELEFONO_PRUEBA;
        expect(r.detalle.muestra).toBe(true);
        expect(bots().flat().map(b => b.entity_id)).toEqual([777]);
        const link = estado.llamadas.find(l => l.method === 'PATCH').body[0].custom_fields_values.find(c => c.field_id === 900).values[0].value;
        expect(link).toBe('https://bikitchencr.com/cambios');
    });

    it('la muestra lleva la fecha y el cierre, para que la plantilla no salga con huecos', async () => {
        Object.assign(process.env, { CAMBIOS_TELEFONO_PRUEBA: '8899-0000', KOMMO_CAMPO_ENTREGA: '901', KOMMO_CAMPO_CIERRE_CAMBIOS: '902' });
        estado.kommoContactos = { 88990000: 777 };
        await correr({ ahora: MIERCOLES, modo: 'prueba' });
        delete process.env.CAMBIOS_TELEFONO_PRUEBA;
        delete process.env.KOMMO_CAMPO_ENTREGA;
        delete process.env.KOMMO_CAMPO_CIERRE_CAMBIOS;
        const campos = estado.llamadas.find(l => l.method === 'PATCH').body[0].custom_fields_values;
        const valor = (id) => campos.find(c => c.field_id === id)?.values[0].value;
        expect(valor(901)).toBe('sábado 26 de setiembre');
        expect(valor(902)).toMatch(/^jueves 24 de setiembre, 7 p\. m\.$/);
    });

    it('en prueba le manda SOLO al número de prueba', async () => {
        process.env.CAMBIOS_TELEFONO_PRUEBA = '8811-0001';
        const r = await correr({ ahora: MIERCOLES, modo: 'prueba' });
        delete process.env.CAMBIOS_TELEFONO_PRUEBA;
        expect(r.estado).toBe('prueba');
        expect(bots().flat().map(b => b.entity_id)).toEqual([101]);
    });

    it(`con más de ${TOPE} destinatarios no manda NADA`, async () => {
        estado.pedidos = Array.from({ length: TOPE + 1 }, (_, i) => pedido(`p${i}`, `8800${String(i).padStart(4, '0')}`, ['2026-09-26']));
        expect((await correr({ ahora: MIERCOLES, modo: 'si' })).estado).toBe('frenado-por-tope');
        expect(bots()).toEqual([]);
        expect(estado.escritos['envios_cambios/2026-09-26'].estado).toBe('frenado-por-tope');
    });

    it('sin configurar el bot no arranca', async () => {
        const bot = process.env.KOMMO_BOT_CAMBIOS;
        delete process.env.KOMMO_BOT_CAMBIOS;
        const r = await correr({ ahora: MIERCOLES, modo: 'si' });
        process.env.KOMMO_BOT_CAMBIOS = bot;
        expect(r).toEqual({ estado: 'sin-configurar', detalle: { faltan: ['KOMMO_BOT_CAMBIOS'] } });
    });

    it('sin el campo del link igual lanza el bot: la plantilla usa los links fijos', async () => {
        const campo = process.env.KOMMO_CAMPO_LINK_CAMBIOS;
        delete process.env.KOMMO_CAMPO_LINK_CAMBIOS;
        const r = await correr({ ahora: MIERCOLES, modo: 'si' });
        process.env.KOMMO_CAMPO_LINK_CAMBIOS = campo;
        expect(r.estado).toBe('enviado');
        expect(bots().length).toBeGreaterThan(0);
    });
});
