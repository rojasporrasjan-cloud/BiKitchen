// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
    entreganHoy, primeraEntregaHoy, esClienteNuevo, nuevosQueRecibieronAyer,
    paraVolverAInvitar, variantesDeTelefono
} from '../utils/avisosDeEntrega';
import { correrAviso } from '../utils/avisoDelDia';

/**
 * Los avisos alrededor de la entrega (Jan, 4 oct 2026). Lo que más importa:
 * a quién NO le escriben.
 */

const SAB = '2026-10-03';
const pedido = (id, tel, fechas, extra = {}) => ({
    id, cliente: `Cliente ${id}`, telefono: tel, status: 'confirmed',
    plan: 'Pack Mensual Bajo en Calorías', items: [{ nombre: 'Pack Mensual Bajo en Calorías', cantidad: 1 }],
    fecha_entrega: fechas[0], fechas_entrega: fechas, calendarioFijo: true, ...extra
});
const ids = (lista) => lista.map(x => x.pedido.id);

describe('hoy te llega', () => {
    it('a todos los que reciben hoy, sea la primera entrega o no', () => {
        expect(ids(entreganHoy([
            pedido('a', '8811-0001', [SAB]),
            pedido('b', '8811-0002', ['2026-09-26', SAB, '2026-10-10']),
            pedido('c', '8811-0003', ['2026-10-05'])
        ], SAB))).toEqual(['a', 'b']);
    });

    it('no a los que no pagaron ni a los cancelados', () => {
        expect(ids(entreganHoy([
            pedido('a', '8811-0001', [SAB], { status: 'pending_payment' }),
            pedido('b', '8811-0002', [SAB], { status: 'cancelled' })
        ], SAB))).toEqual([]);
    });
});

describe('guía de congelado', () => {
    it('solo cuando hoy es la PRIMERA entrega del pedido', () => {
        expect(ids(primeraEntregaHoy([
            pedido('nuevo', '8811-0001', [SAB, '2026-10-10']),
            pedido('semana2', '8811-0002', ['2026-09-26', SAB])
        ], SAB))).toEqual(['nuevo']);
    });
});

describe('¿qué tal todo?', () => {
    const DOM = '2026-10-04';

    it('al cliente nuevo, el día después de su primera entrega', () => {
        expect(ids(nuevosQueRecibieronAyer([pedido('a', '8811-0001', [SAB, '2026-10-10'])], DOM))).toEqual(['a']);
    });

    it('no al que ya había recibido antes con otro pedido (aunque el número esté escrito distinto)', () => {
        const nuevo = pedido('a', '8811-0001', [SAB]);
        const viejo = pedido('v', '+506 8811 0001', ['2026-08-01']);
        expect(esClienteNuevo(nuevo, [nuevo, viejo])).toBe(false);
        expect(ids(nuevosQueRecibieronAyer([nuevo], DOM, [nuevo, viejo]))).toEqual([]);
    });

    it('un pedido viejo CANCELADO no le quita lo de nuevo', () => {
        const nuevo = pedido('a', '8811-0001', [SAB]);
        expect(esClienteNuevo(nuevo, [pedido('v', '88110001', ['2026-08-01'], { status: 'cancelled' })])).toBe(true);
    });

    it('nunca a un teléfono de relleno', () => {
        expect(ids(nuevosQueRecibieronAyer([pedido('a', '8888-8888', [SAB])], DOM))).toEqual([]);
    });
});

describe('volver a invitar', () => {
    const MAR = '2026-10-20';   // ventana: última entrega entre el 29 set y el 6 oct

    it('a quien terminó hace 2 a 3 semanas y no volvió', () => {
        expect(ids(paraVolverAInvitar([pedido('a', '8811-0001', ['2026-09-26', SAB])], MAR))).toEqual(['a']);
    });

    it('no al que ya volvió a pedir (mismo número, otro pedido después)', () => {
        expect(ids(paraVolverAInvitar([
            pedido('a', '8811-0001', ['2026-09-26', SAB]),
            pedido('a2', '8811 0001', ['2026-10-24'], { status: 'pending_payment' })
        ], MAR))).toEqual([]);
    });

    it('no al que terminó hace menos de 2 semanas ni hace más de 3', () => {
        expect(ids(paraVolverAInvitar([
            pedido('reciente', '8811-0001', ['2026-10-10']),
            pedido('viejo', '8811-0002', ['2026-09-19'])
        ], MAR))).toEqual([]);
    });

    it('uno por persona aunque tenga dos pedidos que terminaron', () => {
        expect(paraVolverAInvitar([
            pedido('a', '8811-0001', ['2026-09-30']),
            pedido('b', '+50688110001', [SAB])
        ], MAR)).toHaveLength(1);
    });
});

describe('variantes del teléfono para buscar sus pedidos', () => {
    it('las formas comunes del mismo número, máximo 10 (límite de Firestore)', () => {
        const v = variantesDeTelefono('+506 8811-0001');
        expect(v).toContain('88110001');
        expect(v).toContain('8811 0001');
        expect(v).toContain('8811-0001');
        expect(v.length).toBeLessThanOrEqual(10);
        expect(variantesDeTelefono('123')).toEqual([]);
    });
});

describe('el recorrido común de los avisos', () => {
    const ENV = { KOMMO_SUBDOMINIO: 'x', KOMMO_TOKEN: 't', CAMBIOS_TELEFONO_PRUEBA: '87776666' };
    const dbFalsa = () => {
        const docs = {};
        const registro = [];
        return {
            docs, registro,
            collection: (c) => ({
                doc: (id) => ({
                    get: async () => ({ exists: !!docs[`${c}/${id}`], data: () => docs[`${c}/${id}`] }),
                    set: async (v) => { docs[`${c}/${id}`] = { ...(docs[`${c}/${id}`] || {}), ...v }; }
                }),
                add: async (v) => { registro.push(v); }
            })
        };
    };
    const base = (extra = {}) => {
        const db = dbFalsa();
        const enviarPorKommo = vi.fn(async (dest) => ({ conId: dest.map((d, i) => ({ d, id: i + 1 })), nuevos: [] }));
        const soloAlNumeroDePrueba = vi.fn(() => [{ nombre: 'Prueba', telefono: '87776666', muestra: true }]);
        const lista = async () => [
            { pedido: pedido('a', '8811-0001', [SAB]), fecha: SAB },
            { pedido: pedido('b', '8811-0002', [SAB]), fecha: SAB }
        ];
        return { db, enviarPorKommo, args: { tipo: 'hoy-te-llega', clave: SAB, bot: '1', tope: 10, lista, db, enviarPorKommo, soloAlNumeroDePrueba, env: ENV, ...extra } };
    };

    it('apagado no hace nada', async () => {
        const { args, enviarPorKommo } = base();
        expect((await correrAviso({ ...args, modo: undefined })).estado).toBe('apagado');
        expect(enviarPorKommo).not.toHaveBeenCalled();
    });

    it('sin bot no manda y dice qué falta', async () => {
        const { args } = base({ bot: '', variableBot: 'KOMMO_BOT_HOY_TE_LLEGA' });
        const r = await correrAviso({ ...args, modo: 'si' });
        expect(r.estado).toBe('sin-configurar');
        expect(r.detalle.faltan).toContain('KOMMO_BOT_HOY_TE_LLEGA');
    });

    it('en prueba solo le llega la muestra al número de prueba, y anota la lista real', async () => {
        const { args, enviarPorKommo, db } = base();
        const r = await correrAviso({ ...args, modo: 'prueba' });
        expect(r.estado).toBe('prueba');
        expect(enviarPorKommo.mock.calls[0][0]).toHaveLength(1);
        expect(db.registro[0].lesHabriaLlegado).toHaveLength(2);
    });

    it('con "si" manda a todos UNA vez: la segunda vuelta del mismo día no manda', async () => {
        const { args, enviarPorKommo } = base();
        expect((await correrAviso({ ...args, modo: 'si' })).estado).toBe('enviado');
        expect((await correrAviso({ ...args, modo: 'si' })).estado).toBe('ya-enviado');
        expect(enviarPorKommo).toHaveBeenCalledTimes(1);
    });

    it('con más del tope no manda NADA', async () => {
        const { args, enviarPorKommo } = base({ tope: 1 });
        expect((await correrAviso({ ...args, modo: 'si' })).estado).toBe('frenado-por-tope');
        expect(enviarPorKommo).not.toHaveBeenCalled();
    });
});
