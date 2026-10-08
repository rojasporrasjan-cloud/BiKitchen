// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * La función del reloj: lo que más importa es que la hora la ponga el
 * servidor, que sin el link no se pueda marcar, y que el panel sea solo del dueño.
 */
const estado = vi.hoisted(() => ({ empleados: {}, marcas: {}, sig: 1, tokenOk: true }));

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({
        verifyIdToken: async (t) => {
            if (t === 'dueno') return { email: 'rojasporrasjan@gmail.com' };
            if (t === 'otro') return { email: 'alguien@x.com' };
            throw new Error('mal');
        }
    })
}));
vi.mock('firebase-admin/firestore', () => {
    const coleccion = (nombre) => {
        const tabla = () => estado[nombre === 'empleados' ? 'empleados' : 'marcas'];
        const consulta = (filtros) => ({
            where: (campo, op, valor) => consulta([...filtros, [campo, op, valor]]),
            get: async () => ({
                docs: Object.entries(tabla())
                    .filter(([, d]) => filtros.every(([c, op, v]) =>
                        op === '==' ? d[c] === v : op === '>=' ? d[c] >= v : d[c] <= v))
                    .map(([id, d]) => ({ id, data: () => ({ ...d }) }))
            })
        });
        return {
            ...consulta([]),
            doc: (id) => ({
                id,
                get: async () => ({ id, exists: !!tabla()[id], data: () => ({ ...tabla()[id] }) }),
                update: async (d) => { tabla()[id] = { ...tabla()[id], ...d }; },
                delete: async () => { delete tabla()[id]; }
            }),
            add: async (d) => { const id = `id${estado.sig++}`; tabla()[id] = d; return { id }; }
        };
    };
    return { getFirestore: () => ({ collection: coleccion }) };
});

Object.assign(process.env, { CAMBIOS_SECRETO: 'secreto-de-prueba' });
const { handler, codigoDelReloj } = await import('../../netlify/functions/planilla.js');

const llamar = (cuerpo, token) => handler({
    httpMethod: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(cuerpo)
}).then(r => ({ status: r.statusCode, ...JSON.parse(r.body) }));

beforeEach(() => {
    vi.useRealTimers();
    estado.empleados = {
        rosa: { nombre: 'Rosa', tarifaHora: 1500, activo: true, pin: '' },
        tannia: { nombre: 'Tannia', tarifaHora: 1600, activo: true, pin: '1234' },
        viejo: { nombre: 'Ya no trabaja', tarifaHora: 1000, activo: false, pin: '' }
    };
    estado.marcas = {};
});

describe('el reloj del iPad', () => {
    it('sin el link correcto no muestra ni marca nada', async () => {
        expect((await llamar({ accion: 'reloj', codigo: 'falso' })).status).toBe(404);
        expect((await llamar({ accion: 'marcar', codigo: 'falso', empleadoId: 'rosa' })).status).toBe(404);
        expect(Object.keys(estado.marcas)).toHaveLength(0);
    });

    it('muestra solo a los activos, sin sus PIN', async () => {
        const r = await llamar({ accion: 'reloj', codigo: codigoDelReloj() });
        expect(r.empleados.map(e => e.nombre)).toEqual(['Rosa', 'Tannia']);
        expect(r.empleados[1]).toMatchObject({ tienePin: true, adentro: false });
        expect(JSON.stringify(r)).not.toContain('1234');
    });

    it('la primera marca es entrada, con la hora del servidor; la siguiente, salida', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-08T13:02:00Z'));          // 7:02 a. m. CR
        const e = await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'rosa', en: '2020-01-01T00:00:00Z' });
        expect(e).toMatchObject({ status: 200, tipo: 'entrada', en: '2026-10-08T13:02:00.000Z' });
        expect(Object.values(estado.marcas)[0]).toMatchObject({ fecha: '2026-10-08', origen: 'reloj' });

        vi.setSystemTime(new Date('2026-10-08T21:00:00Z'));          // 3:00 p. m.
        const s = await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'rosa' });
        expect(s.tipo).toBe('salida');
        const r = await llamar({ accion: 'reloj', codigo: codigoDelReloj() });
        expect(r.empleados[0].adentro).toBe(false);
    });

    it('un dedo doble no marca dos veces', async () => {
        await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'rosa' });
        const otra = await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'rosa' });
        expect(otra.status).toBe(409);
        expect(Object.keys(estado.marcas)).toHaveLength(1);
    });

    it('con PIN, sin el PIN correcto no marca', async () => {
        expect((await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'tannia', pin: '0000' })).status).toBe(403);
        expect((await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'tannia', pin: '1234' })).status).toBe(200);
    });

    it('a alguien inactivo no lo deja marcar', async () => {
        expect((await llamar({ accion: 'marcar', codigo: codigoDelReloj(), empleadoId: 'viejo' })).status).toBe(404);
    });
});

describe('el panel', () => {
    it('es solo del dueño', async () => {
        expect((await llamar({ accion: 'empleados' })).status).toBe(403);
        expect((await llamar({ accion: 'empleados' }, 'otro')).status).toBe(403);
        expect((await llamar({ accion: 'empleados' }, 'dueno')).empleados).toHaveLength(3);
    });

    it('agrega y edita empleados, y no inventa uno al editar un id que no existe', async () => {
        const nuevo = await llamar({ accion: 'guardarEmpleado', empleado: { nombre: 'Isabel', tarifaHora: '1550' } }, 'dueno');
        expect(estado.empleados[nuevo.id]).toMatchObject({ nombre: 'Isabel', tarifaHora: 1550, activo: true });
        await llamar({ accion: 'guardarEmpleado', empleado: { id: nuevo.id, nombre: 'Isabel', tarifaHora: 1650 } }, 'dueno');
        expect(estado.empleados[nuevo.id].tarifaHora).toBe(1650);
        expect((await llamar({ accion: 'guardarEmpleado', empleado: { id: 'noexiste', nombre: 'X', tarifaHora: 1 } }, 'dueno')).status).toBe(404);
        expect((await llamar({ accion: 'guardarEmpleado', empleado: { nombre: 'X', tarifaHora: 1, pin: '12' } }, 'dueno')).status).toBe(400);
    });

    it('corrige: agrega una salida olvidada en hora de Costa Rica, y la borra', async () => {
        const r = await llamar({ accion: 'agregarMarca', marca: { empleadoId: 'rosa', fecha: '2026-10-08', hora: '15:30', tipo: 'salida' } }, 'dueno');
        expect(estado.marcas[r.id]).toMatchObject({ en: '2026-10-08T21:30:00.000Z', origen: 'panel', tipo: 'salida' });
        const lista = await llamar({ accion: 'marcas', desde: '2026-10-05', hasta: '2026-10-11' }, 'dueno');
        expect(lista.marcas).toHaveLength(1);
        await llamar({ accion: 'borrarMarca', id: r.id }, 'dueno');
        expect(estado.marcas[r.id]).toBeUndefined();
    });

    it('da el link del reloj', async () => {
        const r = await llamar({ accion: 'link' }, 'dueno');
        expect(r.url).toBe(`https://bikitchencr.com/reloj/${codigoDelReloj()}`);
    });
});
