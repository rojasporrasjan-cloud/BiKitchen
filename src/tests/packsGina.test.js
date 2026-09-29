// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resumenDePacks, fechasParaConsultar } from '../utils/packsParaGina';
import { getSubscriptionProgress } from '../utils/subscriptionProgress';

/**
 * El link de Gina con los packs mensuales: la misma semana que el panel, a
 * quién se le acaba, y nunca un dato de contacto.
 */

const HOY = new Date(2026, 8, 29, 10, 0);   // martes 29 de setiembre de 2026
const mensual = (id, cliente, fechas, extra = {}) => ({
    id, cliente, telefono: '8811-2233', direccion: 'Del Walmart 200 m norte', correo: 'x@y.com',
    zona_envio: 'Heredia', plan: 'Pack Mensual Bajo en Calorías', status: 'confirmed', total: 98000,
    fecha_entrega: fechas[0], fechas_entrega: fechas, calendarioFijo: true, ...extra
});

const PEDIDOS = [
    mensual('a', 'Ana Mora', ['2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10']),       // semana 3 de 4
    mensual('b', 'Beto Solís', ['2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03']),     // le queda la última
    mensual('c', 'Caro Vega', ['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26']),      // terminó el sábado
    mensual('d', 'Dani Ruiz', ['2026-10-03', '2026-10-10'], { status: 'cancelled' }),          // cancelado
    mensual('e', 'Eli Paz', ['2026-10-03'], { plan: 'Pack Semanal' })                            // una sola entrega
];

describe('lo que ve Gina', () => {
    const r = resumenDePacks(PEDIDOS, HOY);

    it('en curso: la misma semana que Packs Mensuales del panel, sin cancelados ni packs de una entrega', () => {
        expect(r.enCurso.map(p => p.cliente)).toEqual(['Ana Mora', 'Beto Solís']);
        const ana = r.enCurso.find(p => p.id === 'a');
        expect(ana.semanaActual).toBe(getSubscriptionProgress(PEDIDOS[0], HOY).semanaActual);
        expect(ana).toMatchObject({ semanaActual: 3, total: 4, proxima: '2026-10-03', ultima: '2026-10-10' });
    });

    it('por renovar: al que le queda una entrega, y el que termina pronto', () => {
        expect(r.porRenovar.map(p => p.cliente)).toContain('Beto Solís');
        expect(r.porRenovar.find(p => p.id === 'b').leQuedan).toBe(1);
    });

    it('terminados: el que acabó hace poco, para llamarlo', () => {
        expect(r.terminados.map(p => p.cliente)).toEqual(['Caro Vega']);
    });

    it('NUNCA teléfono, dirección, correo ni montos', () => {
        const texto = JSON.stringify(r);
        expect(texto).not.toMatch(/8811|Walmart|x@y\.com|98000/);
    });

    it('consulta de hace 2 semanas a 5 semanas adelante', () => {
        const f = fechasParaConsultar(HOY);
        expect(f[0]).toBe('2026-09-15');
        expect(f[f.length - 1]).toBe('2026-11-03');
    });
});

// ── La función del servidor ──────────────────────────────────────────────
const estado = vi.hoisted(() => ({ docs: {} }));
vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({ verifyIdToken: async (t) => ({ email: t === 'dueno' ? 'rojasporrasjan@gmail.com' : 'otro@x.com' }) })
}));
vi.mock('firebase-admin/firestore', () => {
    const consulta = () => ({
        where: () => consulta(),
        get: async () => ({ docs: Object.entries(estado.docs).map(([id, d]) => ({ id, data: () => d })) })
    });
    return { getFirestore: () => ({ collection: () => consulta() }) };
});
process.env.CAMBIOS_SECRETO = 'secreto-de-prueba';
const { handler, codigoDeGina } = await import('../../netlify/functions/packs-gina.js');
const llamar = async (cuerpo, headers = {}) => {
    const r = await handler({ httpMethod: 'POST', body: JSON.stringify(cuerpo), headers });
    return { status: r.statusCode, ...JSON.parse(r.body) };
};

describe('la función del link de Gina', () => {
    beforeEach(() => { estado.docs = Object.fromEntries(PEDIDOS.map(p => [p.id, p])); });

    it('con el código bueno trae la lista, sin datos de contacto', async () => {
        const r = await llamar({ accion: 'ver', codigo: codigoDeGina() });
        expect(r.status).toBe(200);
        expect(r.enCurso.length).toBeGreaterThan(0);
        expect(JSON.stringify(r)).not.toMatch(/8811|Walmart|x@y\.com/);
    });

    it('un código inventado no abre nada', async () => {
        expect((await llamar({ accion: 'ver', codigo: 'cualquier-cosa' })).status).toBe(404);
        expect((await llamar({ accion: 'ver', codigo: codigoDeGina().slice(0, -1) + 'A' })).status).toBe(404);
    });

    it('el link solo se lo da al dueño', async () => {
        expect((await llamar({ accion: 'generar' }, { authorization: 'Bearer otro' })).status).toBe(403);
        const r = await llamar({ accion: 'generar' }, { authorization: 'Bearer dueno' });
        expect(r.url).toBe(`https://bikitchencr.com/packs-mensuales/${codigoDeGina()}`);
    });
});
