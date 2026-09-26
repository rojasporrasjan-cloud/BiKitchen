// @vitest-environment node
/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * La función del link de cambios: que nadie pueda falsificar un link, que se
 * cierre a la hora, y que guarde en el pedido por su id real (sin fantasmas).
 */

const estado = vi.hoisted(() => ({ docs: {}, actualizados: [], ahora: null }));

vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({ verifyIdToken: async (t) => ({ email: t === 'dueno' ? 'rojasporrasjan@gmail.com' : 'otro@x.com' }) })
}));
vi.mock('firebase-admin/firestore', () => {
    const ref = (ruta) => ({
        get: async () => ({ exists: !!estado.docs[ruta], data: () => estado.docs[ruta] }),
        update: async (datos) => {
            if (!estado.docs[ruta]) throw new Error('NOT_FOUND');
            estado.actualizados.push({ ruta, datos });
        }
    });
    return {
        getFirestore: () => ({
            doc: (ruta) => ref(ruta),
            collection: (c) => ({ doc: (id) => ref(`${c}/${id}`) })
        })
    };
});

process.env.CAMBIOS_SECRETO = 'secreto-de-prueba';
const { handler, codigoPara } = await import('../../netlify/functions/cambios-semana.js');

const llamar = async (cuerpo, headers = {}) => {
    const r = await handler({ httpMethod: 'POST', body: JSON.stringify(cuerpo), headers });
    return { status: r.statusCode, ...JSON.parse(r.body) };
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T15:00:00Z'));   // miércoles 9 a. m. en CR
    estado.actualizados = [];
    estado.docs = {
        'pedidos/abc123XYZ': {
            cliente: 'Ana Mora Solís', telefono: '88112233', direccion: 'Escazú',
            plan: 'Pack Mensual Bajo en Calorías', status: 'confirmed',
            items: [{ nombre: 'Pack Mensual Bajo en Calorías', cantidad: 1 }],
            fechas_entrega: ['2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03']
        },
        'menus_oficial/current': {
            bajoCalorias: [
                { numero: 1, proteina: 'Filet de tilapia empanizado', vegetal: 'Relish de vegetales', carbo: 'Arroz con peregil' },
                { numero: 2, proteina: 'Pollo mostaza miel', vegetal: 'Guiso de ayote y maiz', carbo: 'Papitas salteadas' }
            ]
        },
        'config/substitutions': { proteins: ['Filet de pollo encebollado'], vegetables: ['Vegetales mixtos'], carbos: ['Arroz blanco'] }
    };
});

describe('la función del link de cambios', () => {
    const codigo = () => codigoPara('abc123XYZ', '2026-09-26');

    it('con el link bueno muestra su menú y SOLO su primer nombre', async () => {
        const r = await llamar({ accion: 'ver', codigo: codigo() });
        expect(r.status).toBe(200);
        expect(r.nombre).toBe('Ana');
        expect(r.cerrada).toBe(false);
        expect(r.permitido.almuerzos).toHaveLength(2);
        expect(JSON.stringify(r)).not.toMatch(/88112233|Escazú|Solís/);
    });

    it('un link con la firma cambiada o de otra semana no abre nada', async () => {
        const [id, fecha, firma] = codigo().split('.');
        expect((await llamar({ accion: 'ver', codigo: `${id}.${fecha}.${firma.slice(0, -1)}A` })).status).toBe(404);
        expect((await llamar({ accion: 'ver', codigo: `${id}.2026-10-03.${firma}` })).status).toBe(404);
        expect((await llamar({ accion: 'ver', codigo: 'cualquier-cosa' })).status).toBe(404);
    });

    it('guarda el cambio en SU pedido, por fecha', async () => {
        const r = await llamar({
            accion: 'guardar', codigo: codigo(),
            cambios: [{ plato: 1, parte: 'proteina', a: 'Filet de pollo encebollado' }], notas: 'sin cebolla'
        });
        expect(r.status).toBe(200);
        expect(estado.actualizados).toHaveLength(1);
        expect(estado.actualizados[0].ruta).toBe('pedidos/abc123XYZ');
        const { datos } = estado.actualizados[0];
        expect(datos.cambiosPorEntrega['2026-09-26'])
            .toBe('Cambiar Filet de tilapia empanizado por Filet de pollo encebollado · Nota del cliente: sin cebolla');
        expect(datos.cambiosDelLink['2026-09-26'].cambios[0]).toMatchObject({ de: 'Filet de tilapia empanizado', a: 'Filet de pollo encebollado' });
        expect(datos.cambiosDelLink['2026-09-26'].notas).toBe('sin cebolla');
    });

    it('algo fuera de la lista de Gina no se guarda', async () => {
        const r = await llamar({ accion: 'guardar', codigo: codigo(), cambios: [{ plato: 1, parte: 'proteina', a: 'Langosta' }] });
        expect(r.status).toBe(422);
        expect(estado.actualizados).toHaveLength(0);
    });

    it('después del miércoles 8 p. m. ya no se guarda', async () => {
        vi.setSystemTime(new Date('2026-09-24T02:30:00Z'));   // miércoles 8:30 p. m. en CR
        const r = await llamar({ accion: 'guardar', codigo: codigo(), cambios: [{ plato: 1, parte: 'carbo', a: 'Arroz blanco' }] });
        expect(r.status).toBe(409);
        expect(r.error).toMatch(/se cerraron/);
        expect(estado.actualizados).toHaveLength(0);
    });

    it('un pedido cancelado no se cambia', async () => {
        estado.docs['pedidos/abc123XYZ'].status = 'cancelled';
        expect((await llamar({ accion: 'ver', codigo: codigo() })).status).toBe(410);
    });

    it('generar links es solo para el dueño', async () => {
        const pedidos = [{ id: 'abc123XYZ', fecha: '2026-09-26' }];
        expect((await llamar({ accion: 'generar', pedidos }, { authorization: 'Bearer otro' })).status).toBe(403);
        const r = await llamar({ accion: 'generar', pedidos }, { authorization: 'Bearer dueno' });
        expect(r.links[0].url).toBe(`https://bikitchencr.com/cambios/${codigo()}`);
    });
});
