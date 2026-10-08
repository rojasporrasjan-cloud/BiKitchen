// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * La función del reloj: lo que más importa es que la hora la ponga el
 * servidor, que sin el link no se pueda marcar, que el panel sea solo del
 * dueño, y que la mala señal (reintentos, toques al mismo tiempo, marcas
 * guardadas sin internet) nunca duplique ni invente marcas.
 */
const estado = vi.hoisted(() => ({ tablas: {}, sig: 1 }));

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
    const tabla = (nombre) => (estado.tablas[nombre] ||= {});
    const docRef = (nombre, id) => ({
        id,
        get: async () => ({ id, exists: !!tabla(nombre)[id], data: () => ({ ...tabla(nombre)[id] }) }),
        set: async (d) => { tabla(nombre)[id] = { ...d }; },
        update: async (d) => { tabla(nombre)[id] = { ...tabla(nombre)[id], ...d }; },
        delete: async () => { delete tabla(nombre)[id]; },
        create: async (d) => {
            if (tabla(nombre)[id]) throw new Error('ALREADY_EXISTS');
            tabla(nombre)[id] = { ...d };
        }
    });
    const coleccion = (nombre) => {
        const consulta = (filtros) => ({
            where: (campo, op, valor) => consulta([...filtros, [campo, op, valor]]),
            get: async () => ({
                docs: Object.entries(tabla(nombre))
                    .filter(([, d]) => filtros.every(([c, op, v]) =>
                        op === '==' ? d[c] === v : op === '>=' ? d[c] >= v : d[c] <= v))
                    .map(([id, d]) => ({ id, data: () => ({ ...d }) }))
            })
        });
        return {
            ...consulta([]),
            doc: (id) => docRef(nombre, id ?? `auto${estado.sig++}`),
            add: async (d) => { const id = `id${estado.sig++}`; tabla(nombre)[id] = d; return { id }; }
        };
    };
    // Las transacciones de Firestore son serializables: se simulan una detrás de la otra,
    // y lo escrito se aplica todo junto al final (como en la de verdad)
    let cola = Promise.resolve();
    const runTransaction = (fn) => {
        const vuelta = cola.then(async () => {
            const escrituras = [];
            const t = {
                get: (x) => x.get(),
                set: (ref, d) => escrituras.push(() => ref.set(d)),
                create: (ref, d) => escrituras.push(() => ref.create(d)),
                delete: (ref) => escrituras.push(() => ref.delete())
            };
            const r = await fn(t);
            for (const w of escrituras) await w();
            return r;
        });
        cola = vuelta.catch(() => {});
        return vuelta;
    };
    return { getFirestore: () => ({ collection: coleccion, runTransaction }) };
});

Object.assign(process.env, { CAMBIOS_SECRETO: 'secreto-de-prueba' });
const { handler, codigoDelReloj } = await import('../../netlify/functions/planilla.js');

const llamar = (cuerpo, token) => handler({
    httpMethod: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(cuerpo)
}).then(r => ({ status: r.statusCode, ...JSON.parse(r.body) }));

const marcas = () => Object.values(estado.tablas.marcas_reloj || {});
const enReloj = (datos) => llamar({ accion: 'marcar', codigo: codigoDelReloj(), ...datos });
const fijarHora = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };

beforeEach(() => {
    vi.useRealTimers();
    estado.tablas = {
        empleados: {
            rosa: { nombre: 'Rosa', tarifaHora: 1500, activo: true, pin: '' },
            tannia: { nombre: 'Tannia', tarifaHora: 1600, activo: true, pin: '1234' },
            viejo: { nombre: 'Ya no trabaja', tarifaHora: 1000, activo: false, pin: '' }
        }
    };
});

describe('el reloj del iPad', () => {
    it('sin el link correcto no muestra ni marca nada', async () => {
        expect((await llamar({ accion: 'reloj', codigo: 'falso' })).status).toBe(404);
        expect((await llamar({ accion: 'marcar', codigo: 'falso', empleadoId: 'rosa' })).status).toBe(404);
        expect(marcas()).toHaveLength(0);
    });

    it('muestra solo a los activos, sin sus PIN, y la hora del servidor', async () => {
        const r = await llamar({ accion: 'reloj', codigo: codigoDelReloj() });
        expect(r.empleados.map(e => e.nombre)).toEqual(['Rosa', 'Tannia']);
        expect(r.empleados[1]).toMatchObject({ tienePin: true, adentro: false });
        expect(JSON.stringify(r)).not.toContain('1234');
        expect(Date.parse(r.ahora)).toBeGreaterThan(0);
    });

    it('la primera marca es entrada, con la hora del servidor; la siguiente, salida', async () => {
        fijarHora('2026-10-08T13:02:00Z');                                  // 7:02 a. m. CR
        const e = await enReloj({ empleadoId: 'rosa', en: '2020-01-01T00:00:00Z' });
        expect(e).toMatchObject({ status: 200, tipo: 'entrada', en: '2026-10-08T13:02:00.000Z' });
        expect(marcas()[0]).toMatchObject({ fecha: '2026-10-08', origen: 'reloj' });

        vi.setSystemTime(new Date('2026-10-08T21:00:00Z'));                 // 3:00 p. m.
        expect((await enReloj({ empleadoId: 'rosa' })).tipo).toBe('salida');
        const r = await llamar({ accion: 'reloj', codigo: codigoDelReloj() });
        expect(r.empleados[0].adentro).toBe(false);
    });

    it('un dedo doble no marca dos veces', async () => {
        await enReloj({ empleadoId: 'rosa' });
        expect((await enReloj({ empleadoId: 'rosa' })).status).toBe(409);
        expect(marcas()).toHaveLength(1);
    });

    it('con PIN, sin el PIN correcto no marca', async () => {
        expect((await enReloj({ empleadoId: 'tannia', pin: '0000' })).status).toBe(403);
        expect((await enReloj({ empleadoId: 'tannia', pin: '1234' })).status).toBe(200);
    });

    it('a alguien inactivo no lo deja marcar', async () => {
        expect((await enReloj({ empleadoId: 'viejo' })).status).toBe(404);
    });
});

describe('con mala señal', () => {
    it('un reintento con el mismo idMarca devuelve la misma marca, no hace otra', async () => {
        fijarHora('2026-10-08T13:02:00Z');
        const a = await enReloj({ empleadoId: 'rosa', idMarca: 'toque-0001', tipo: 'entrada' });
        vi.setSystemTime(new Date('2026-10-08T13:10:00Z'));                 // 8 min después, la respuesta se había perdido
        const b = await enReloj({ empleadoId: 'rosa', idMarca: 'toque-0001', tipo: 'entrada' });
        expect(b).toMatchObject({ status: 200, tipo: 'entrada', en: a.en });
        expect(marcas()).toHaveLength(1);
    });

    it('dos toques al mismo tiempo (dos iPads, dedo doble) dejan una sola marca', async () => {
        const [a, b] = await Promise.all([
            enReloj({ empleadoId: 'rosa', idMarca: 'toque-aaaa', tipo: 'entrada' }),
            enReloj({ empleadoId: 'rosa', idMarca: 'toque-bbbb', tipo: 'entrada' })
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 409]);
        expect(marcas()).toHaveLength(1);
    });

    it('si la pantalla estaba vieja (ya estaba adentro), no marca otra entrada y lo dice', async () => {
        fijarHora('2026-10-08T13:15:00Z');
        await enReloj({ empleadoId: 'rosa', tipo: 'entrada' });
        vi.setSystemTime(new Date('2026-10-08T16:00:00Z'));
        const r = await enReloj({ empleadoId: 'rosa', idMarca: 'toque-cccc', tipo: 'entrada' });
        expect(r).toMatchObject({ status: 409, error: 'Ya estabas adentro.', tipo: 'entrada', en: '2026-10-08T13:15:00.000Z' });
        expect(marcas()).toHaveLength(1);
    });

    it('salida sin entrada hoy: no se marca y se explica', async () => {
        const r = await enReloj({ empleadoId: 'rosa', idMarca: 'toque-dddd', tipo: 'salida' });
        expect(r).toMatchObject({ status: 409, error: 'Hoy no tenés la entrada marcada.' });
        expect(marcas()).toHaveLength(0);
    });

    it('las marcas guardadas sin internet llegan después con su hora real, en orden', async () => {
        fijarHora('2026-10-08T21:30:00Z');                                  // llega el internet a las 3:30 p. m.
        const ocho = 8 * 60 * 60 * 1000;
        const e = await enReloj({ empleadoId: 'rosa', idMarca: 'toque-eeee', tipo: 'entrada', hace: ocho + 15 * 60000 });
        const s = await enReloj({ empleadoId: 'rosa', idMarca: 'toque-ffff', tipo: 'salida', hace: 15 * 60000 });
        expect(e).toMatchObject({ status: 200, tipo: 'entrada', en: '2026-10-08T13:15:00.000Z' });   // 7:15 a. m.
        expect(s).toMatchObject({ status: 200, tipo: 'salida', en: '2026-10-08T21:15:00.000Z' });    // 3:15 p. m.
        expect(marcas().map(m => m.origen)).toEqual(['reloj-sin-internet', 'reloj-sin-internet']);
    });

    it('una marca guardada hace más de un día no se acepta', async () => {
        expect((await enReloj({ empleadoId: 'rosa', idMarca: 'toque-gggg', hace: 25 * 60 * 60 * 1000 })).status).toBe(400);
        expect((await enReloj({ empleadoId: 'rosa', idMarca: 'x' })).status).toBe(400);
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
        expect(estado.tablas.empleados[nuevo.id]).toMatchObject({ nombre: 'Isabel', tarifaHora: 1550, activo: true });
        await llamar({ accion: 'guardarEmpleado', empleado: { id: nuevo.id, nombre: 'Isabel', tarifaHora: 1650 } }, 'dueno');
        expect(estado.tablas.empleados[nuevo.id].tarifaHora).toBe(1650);
        expect((await llamar({ accion: 'guardarEmpleado', empleado: { id: 'noexiste', nombre: 'X', tarifaHora: 1 } }, 'dueno')).status).toBe(404);
        expect((await llamar({ accion: 'guardarEmpleado', empleado: { nombre: 'X', tarifaHora: 1, pin: '12' } }, 'dueno')).status).toBe(400);
    });

    it('no crea dos veces a la misma persona (dos pestañas cargando la lista)', async () => {
        const r = await llamar({ accion: 'guardarEmpleado', empleado: { nombre: ' rosa ', tarifaHora: 2000 } }, 'dueno');
        expect(r).toMatchObject({ status: 409, id: 'rosa' });
        expect(Object.keys(estado.tablas.empleados)).toHaveLength(3);
    });

    it('corrige: agrega una salida olvidada en hora de Costa Rica, y la borra', async () => {
        const r = await llamar({ accion: 'agregarMarca', marca: { empleadoId: 'rosa', fecha: '2026-10-08', hora: '15:30', tipo: 'salida' } }, 'dueno');
        expect(estado.tablas.marcas_reloj[r.id]).toMatchObject({ en: '2026-10-08T21:30:00.000Z', origen: 'panel', tipo: 'salida' });
        const lista = await llamar({ accion: 'marcas', desde: '2026-10-05', hasta: '2026-10-11' }, 'dueno');
        expect(lista.marcas).toHaveLength(1);
        await llamar({ accion: 'borrarMarca', id: r.id }, 'dueno');
        expect(estado.tablas.marcas_reloj[r.id]).toBeUndefined();
        expect((await llamar({ accion: 'borrarMarca', id: r.id }, 'dueno')).status).toBe(404);
    });

    it('una hora imposible no se guarda (25:00 sería el día siguiente)', async () => {
        const r = await llamar({ accion: 'agregarMarca', marca: { empleadoId: 'rosa', fecha: '2026-10-08', hora: '25:00', tipo: 'salida' } }, 'dueno');
        expect(r.status).toBe(400);
        expect(marcas()).toHaveLength(0);
    });

    it('da el link del reloj', async () => {
        const r = await llamar({ accion: 'link' }, 'dueno');
        expect(r.url).toBe(`https://bikitchencr.com/reloj/${codigoDelReloj()}`);
    });
});
