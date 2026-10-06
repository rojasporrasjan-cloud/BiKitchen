// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El cierre de pedidos automático (Jan, 6 oct 2026): marketing que sale solo
 * tres veces por semana. Lo que más importa es a quién NO le llega y cuándo
 * NO manda.
 */

const estado = vi.hoisted(() => ({ docs: {}, pedidos: [], escritos: {}, registro: [], enviados: [] }));

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        ruta,
        get: async () => ({ id: ruta.split('/').pop(), exists: !!estado.docs[ruta], data: () => estado.docs[ruta] }),
        set: async (datos) => { estado.escritos[ruta] = datos; estado.docs[ruta] = { ...(estado.docs[ruta] || {}), ...datos }; }
    });
    const consulta = () => ({ where: () => consulta(), get: async () => ({ docs: estado.pedidos.map(p => ({ id: p.id, data: () => p })) }) });
    return {
        FieldValue: { increment: (n) => ({ incremento: n }) },
        getFirestore: () => ({
            collection: (c) => ({ doc: (id) => ref(`${c}/${id}`), where: () => consulta(), add: async (datos) => { estado.registro.push(datos); } }),
            getAll: async (...refs) => Promise.all(refs.map(r => r.get())),
            batch: () => {
                const ops = [];
                return { set: (r, d) => ops.push([r, d]), commit: async () => ops.forEach(([r, d]) => { estado.escritos[r.ruta] = d; }) };
            }
        })
    };
});
vi.mock('../../netlify/functions/cambios-miercoles.js', () => ({
    enviarPorKommo: async (dest) => { estado.enviados.push(dest); return { conId: dest.map((d, i) => ({ d, id: i + 1 })), nuevos: [] }; },
    soloAlNumeroDePrueba: () => [{ nombre: 'Prueba', telefono: '87776666', muestra: true }]
}));

Object.assign(process.env, { KOMMO_SUBDOMINIO: 'bk', KOMMO_TOKEN: 't', CAMBIOS_TELEFONO_PRUEBA: '87776666' });

const { correr } = await import('../../netlify/functions/cierre-de-pedidos.js');
const {
    cierreDeHoy, clientesSinEntrega, conReglasDeMarketing, presupuestoDelMes, semanaIso
} = await import('../utils/cierresDePedidos.js');

const ENV = { ...process.env, KOMMO_BOT_CIERRE_MIERCOLES: '117463' };
// Lunes 12 oct 2026, 2 p. m. de Costa Rica → cierre del miércoles 14
const LUNES = new Date('2026-10-12T20:00:00Z');
const pedido = (id, tel, fechas, extra = {}) => ({
    id, cliente: `Cliente ${id}`, telefono: tel, status: 'confirmed',
    plan: 'Pack Bajo Calorías', items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1 }],
    fecha_entrega: fechas[0], fechas_entrega: fechas, ...extra
});
const tels = (lista) => lista.map(x => x.pedido.telefono);

beforeEach(() => {
    estado.docs = {}; estado.pedidos = []; estado.escritos = {}; estado.registro = []; estado.enviados = [];
});

describe('qué cierre sale cada día', () => {
    it('lunes → miércoles, jueves → sábado, viernes → lunes; los demás días nada', () => {
        expect(cierreDeHoy('2026-10-12')).toMatchObject({ dia: 'miercoles', fechaEntrega: '2026-10-14' });
        expect(cierreDeHoy('2026-10-15')).toMatchObject({ dia: 'sabado', fechaEntrega: '2026-10-17' });
        expect(cierreDeHoy('2026-10-16')).toMatchObject({ dia: 'lunes', fechaEntrega: '2026-10-19' });
        expect(cierreDeHoy('2026-10-13')).toBeNull();
        expect(cierreDeHoy('2026-10-18')).toBeNull();
    });
});

describe('a quién le toca el cierre del miércoles', () => {
    const MIE = '2026-10-14';
    it('a quien compró para un miércoles de las últimas 8 semanas y no tiene entrega este', () => {
        expect(tels(clientesSinEntrega([
            pedido('a', '88110001', ['2026-10-07']),                    // compró el miércoles pasado → sí
            pedido('b', '88110002', ['2026-10-07', MIE]),               // ya tiene el 14 → no
            pedido('c', '88110003', ['2026-10-10']),                    // es de sábado → no
            pedido('d', '88110004', ['2026-08-05'])                     // hace más de 8 semanas → no
        ], MIE))).toEqual(['88110001']);
    });

    it('si ya pidió para el 14 con OTRO pedido, aunque no esté pagado, no se le escribe', () => {
        expect(clientesSinEntrega([
            pedido('a', '88110001', ['2026-09-30']),
            pedido('a2', '8811-0001', [MIE], { status: 'pending_payment' })
        ], MIE)).toEqual([]);
    });

    it('ni cancelados, ni teléfonos de relleno; uno por teléfono', () => {
        expect(tels(clientesSinEntrega([
            pedido('a', '88110001', ['2026-09-30']),
            pedido('a2', '88110001', ['2026-10-07']),
            pedido('b', '88888888', ['2026-10-07']),
            pedido('c', '88110003', ['2026-10-07'], { status: 'cancelled' })
        ], MIE))).toEqual(['88110001']);
    });
});

describe('las reglas de marketing', () => {
    const HOY = '2026-10-12';
    const AHORA = new Date('2026-10-12T20:00:00Z');
    const d = (telefono) => ({ telefono, nombre: telefono });

    it('fuera: "no molestar" vigente, 2 de marketing esta semana, o ya le llegó una hoy', () => {
        const fichas = new Map([
            ['88110001', { noMolestarDesde: '2026-10-01T00:00:00Z' }],
            ['88110002', { marketing: { [semanaIso(HOY)]: 2 } }],
            ['88110003', { ultimaDifusion: '2026-10-12T15:00:00Z' }],
            ['88110004', { marketing: { [semanaIso(HOY)]: 1 }, noMolestarDesde: '2026-08-01T00:00:00Z' }]
        ]);
        const r = conReglasDeMarketing(['88110001', '88110002', '88110003', '88110004', '88110005'].map(d), { fichas, hoy: HOY, ahora: AHORA });
        expect(r.quedan.map(x => x.telefono)).toEqual(['88110004', '88110005']);
        expect(r.fuera.map(x => x.motivo)).toEqual(['no-molestar', 'ya-2-esta-semana', 'ya-le-llego-hoy']);
    });

    it('el presupuesto: US$200 al mes a US$0,074 por mensaje', () => {
        expect(presupuestoDelMes({ mensajesDelMes: 2600, cuantos: 100 }).alcanza).toBe(true);   // US$199,80
        expect(presupuestoDelMes({ mensajesDelMes: 2600, cuantos: 103 }).alcanza).toBe(false);  // US$200,02
    });

    it('la semana ISO cambia el lunes', () => {
        expect(semanaIso('2026-10-11')).not.toBe(semanaIso('2026-10-12'));
        expect(semanaIso('2026-10-12')).toBe(semanaIso('2026-10-18'));
    });
});

describe('la función programada', () => {
    const conClientes = () => {
        estado.pedidos = [
            pedido('a', '88110001', ['2026-10-07']),
            pedido('b', '88110002', ['2026-09-30']),
            pedido('c', '88110003', ['2026-10-07', '2026-10-14'])
        ];
    };

    it('viene apagada: sin interruptor no manda nada', async () => {
        conClientes();
        expect((await correr({ ahora: LUNES, modo: undefined, env: ENV })).estado).toBe('apagado');
        expect(estado.enviados).toHaveLength(0);
    });

    it('un martes no toca ningún cierre', async () => {
        conClientes();
        const r = await correr({ ahora: new Date('2026-10-13T20:00:00Z'), modo: 'si', env: ENV });
        expect(r.estado).toBe('hoy-no-toca');
    });

    it('sin el bot de ese día no manda y dice cuál falta', async () => {
        conClientes();
        const r = await correr({ ahora: new Date('2026-10-15T20:00:00Z'), modo: 'si', env: ENV });
        expect(r.estado).toBe('sin-configurar');
        expect(r.detalle.faltan).toContain('KOMMO_BOT_CIERRE_SABADO');
    });

    it('en prueba solo le llega la muestra a Jan y anota la lista real', async () => {
        conClientes();
        const r = await correr({ ahora: LUNES, modo: 'prueba', env: ENV });
        expect(r.estado).toBe('prueba');
        expect(estado.enviados[0]).toHaveLength(1);
        expect(estado.registro[0].lesHabriaLlegado.map(x => x.telefono).sort()).toEqual(['88110001', '88110002']);
        // la prueba no cuenta como marketing ni gasta presupuesto
        expect(Object.keys(estado.escritos).some(k => k.startsWith('kommo_presupuesto'))).toBe(false);
    });

    it('con "si" manda UNA vez por reparto, cuenta el marketing y el gasto', async () => {
        conClientes();
        expect((await correr({ ahora: LUNES, modo: 'si', env: ENV })).estado).toBe('enviado');
        expect(estado.enviados[0].map(x => x.telefono).sort()).toEqual(['88110001', '88110002']);
        expect(estado.escritos['kommo_contactos/88110001'].marketing).toEqual({ [semanaIso('2026-10-12')]: { incremento: 1 } });
        expect(estado.escritos['kommo_presupuesto/2026-10'].mensajes).toEqual({ incremento: 2 });
        expect((await correr({ ahora: LUNES, modo: 'si', env: ENV })).estado).toBe('ya-enviado');
        expect(estado.enviados).toHaveLength(1);
    });

    it('a quien tiene "no molestar" no le llega', async () => {
        conClientes();
        estado.docs['kommo_contactos/88110002'] = { noMolestarDesde: '2026-10-10T00:00:00Z' };
        await correr({ ahora: LUNES, modo: 'si', env: ENV });
        expect(estado.enviados[0].map(x => x.telefono)).toEqual(['88110001']);
    });

    it('sin presupuesto no manda NADA', async () => {
        conClientes();
        estado.docs['kommo_presupuesto/2026-10'] = { mensajes: 2702 };   // US$199,95
        const r = await correr({ ahora: LUNES, modo: 'si', env: ENV });
        expect(r.estado).toBe('frenado-por-presupuesto');
        expect(estado.enviados).toHaveLength(0);
    });
});
