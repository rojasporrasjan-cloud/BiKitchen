// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Los gastos que Gina anota con su link (9 oct 2026). Lo que importa: que el link
 * solo sirva para gastos, que un reintento no duplique, que no entren montos o
 * categorías raras, y que en el panel solo el dueño cambie.
 */
const estado = vi.hoisted(() => ({ tablas: {} }));

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({
        verifyIdToken: async (t) => {
            if (t === 'dueno') return { email: 'rojasporrasjan@gmail.com', uid: 'uJan' };
            if (t === 'gina') return { email: 'gina@x.com', uid: 'uGina' };
            throw new Error('mal');
        }
    })
}));
vi.mock('firebase-admin/firestore', () => {
    const tabla = (n) => (estado.tablas[n] ||= {});
    const coleccion = (n) => {
        const consulta = (filtros) => ({
            where: (c, op, v) => consulta([...filtros, [c, op, v]]),
            get: async () => ({
                docs: Object.entries(tabla(n))
                    .filter(([, d]) => filtros.every(([c, op, v]) => (op === '==' ? d[c] === v : op === '>=' ? d[c] >= v : d[c] <= v)))
                    .map(([id, d]) => ({ id, data: () => ({ ...d }) }))
            })
        });
        return {
            ...consulta([]),
            doc: (id) => ({
                id,
                get: async () => ({ id, exists: !!tabla(n)[id], data: () => ({ ...tabla(n)[id] }) }),
                set: async (d) => { tabla(n)[id] = { ...d }; },
                delete: async () => { delete tabla(n)[id]; }
            })
        };
    };
    return { getFirestore: () => ({ collection: coleccion }) };
});

Object.assign(process.env, { CAMBIOS_SECRETO: 'secreto-de-prueba' });
const { handler, codigoDeGastos } = await import('../../netlify/functions/gastos.js');
const { codigoDelReloj, codigoDeGina } = await import('../../netlify/functions/planilla.js');

const llamar = (cuerpo, token) => handler({
    httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(cuerpo)
}).then(r => ({ status: r.statusCode, ...JSON.parse(r.body) }));
const conLink = (cuerpo) => llamar({ codigo: codigoDeGastos(), ...cuerpo });
const pollo = { fecha: '2026-10-09', categoria: 'carnes', monto: 45000, que: 'Pollo 20 kg', proveedor: 'Avícola', pago: 'SINPE' };
const gastos = () => Object.values(estado.tablas.gastos || {});

beforeEach(() => { estado.tablas = { users: { uGina: { role: 'admin' } } }; });

describe('el link de gastos de Gina', () => {
    it('guarda un gasto y lo devuelve en la lista de la semana', async () => {
        const r = await conLink({ accion: 'guardar', idGasto: 'gasto-0001', gasto: pollo });
        expect(r.status).toBe(200);
        expect(gastos()[0]).toMatchObject({ ...pollo, origen: 'link-gina' });
        const l = await conLink({ accion: 'lista', desde: '2026-10-05', hasta: '2026-10-11' });
        expect(l.gastos).toHaveLength(1);
    });

    it('un reintento con el mismo id no duplica; corregir mantiene la fecha de creación', async () => {
        await conLink({ accion: 'guardar', idGasto: 'gasto-0002', gasto: pollo });
        const creado = gastos()[0].creado;
        await conLink({ accion: 'guardar', idGasto: 'gasto-0002', gasto: pollo });
        await conLink({ accion: 'guardar', idGasto: 'gasto-0002', gasto: { ...pollo, monto: 47000 } });
        expect(gastos()).toHaveLength(1);
        expect(gastos()[0]).toMatchObject({ monto: 47000, creado });
    });

    it('no acepta montos vacíos o con un cero de más, ni categorías raras, ni «Otros» sin decir qué fue', async () => {
        for (const [g, msg] of [
            [{ ...pollo, monto: 0 }, /monto/], [{ ...pollo, monto: 45000000 }, /cero/],
            [{ ...pollo, categoria: 'fiesta' }, /categoría/], [{ ...pollo, categoria: 'otros', que: ' ' }, /Otros/]
        ]) {
            const r = await conLink({ accion: 'guardar', idGasto: 'gasto-0003', gasto: g });
            expect(r.status).toBe(400);
            expect(r.error).toMatch(msg);
        }
        expect(gastos()).toHaveLength(0);
    });

    it('borra un gasto', async () => {
        await conLink({ accion: 'guardar', idGasto: 'gasto-0004', gasto: pollo });
        expect((await conLink({ accion: 'borrar', id: 'gasto-0004' })).status).toBe(200);
        expect(gastos()).toHaveLength(0);
        expect((await conLink({ accion: 'borrar', id: 'gasto-0004' })).status).toBe(404);
    });

    it('el link solo sirve para gastos: los del reloj y la planilla no abren esto', async () => {
        for (const codigo of ['falso', codigoDelReloj(), codigoDeGina()]) {
            expect((await llamar({ codigo, accion: 'lista', desde: '2026-10-05', hasta: '2026-10-11' })).status).toBe(404);
        }
        expect(codigoDeGastos()).not.toBe(codigoDeGina());
    });

    it('nunca más de dos meses de una vez (regla 17)', async () => {
        expect((await conLink({ accion: 'lista', desde: '2026-01-01', hasta: '2026-10-11' })).status).toBe(400);
    });
});

describe('en el panel', () => {
    it('el dueño anota, ve y saca el link', async () => {
        expect((await llamar({ accion: 'guardar', idGasto: 'gasto-0005', gasto: pollo }, 'dueno')).status).toBe(200);
        expect(gastos()[0].origen).toBe('panel-dueno');
        expect((await llamar({ accion: 'link' }, 'dueno')).url).toBe(`https://bikitchencr.com/gastos/${codigoDeGastos()}`);
    });

    it('Gina (admin) anota, corrige y borra en el panel; el link solo lo saca Jan; sin sesión no entra', async () => {
        expect((await llamar({ accion: 'lista', desde: '2026-10-05', hasta: '2026-10-11' }, 'gina')).status).toBe(200);
        expect((await llamar({ accion: 'guardar', idGasto: 'gasto-0006', gasto: pollo }, 'gina')).status).toBe(200);
        expect(gastos()[0].origen).toBe('panel-admin');
        expect((await llamar({ accion: 'borrar', id: 'gasto-0006' }, 'gina')).status).toBe(200);
        expect((await llamar({ accion: 'link' }, 'gina')).status).toBe(403);
        expect((await llamar({ accion: 'lista', desde: '2026-10-05', hasta: '2026-10-11' })).status).toBe(403);
    });
});
