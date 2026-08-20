import { describe, it, expect } from 'vitest';
import { huellaPedido, detectarDuplicados, auditarPuntos, resumenAuditoria } from '../utils/auditarPuntos';

const pedido = (over = {}) => ({
    cliente: 'Alexandra Mora',
    correo: 'mtabm20@gmail.com',
    total: 114480,
    plan: 'Full Pack',
    fecha_entrega: '2026-04-03',
    fechas_entrega: ['2026-04-03'],
    pointsAwarded: true,
    pointsToAward: 2289,
    ...over
});

describe('Solo cuentan los pedidos que otorgaron puntos', () => {
    it('uno sin otorgar no suma', () => {
        const r = auditarPuntos([pedido({ pointsAwarded: false })], {});
        expect(r).toEqual([]);
    });

    it('sin correo no se puede acreditar a nadie', () => {
        const r = auditarPuntos([pedido({ correo: '', correoPuntos: '' })], {});
        expect(r).toEqual([]);
    });

    it('correoPuntos manda sobre correo', () => {
        const r = auditarPuntos([pedido({ correo: 'contacto@x.com', correoPuntos: 'Real@Gmail.COM' })], {});
        expect(r[0].correo).toBe('real@gmail.com');
    });
});

describe('Duplicados exactos', () => {
    it('dos pedidos identicos son el mismo', () => {
        const a = pedido(), b = pedido();
        expect(huellaPedido(a)).toBe(huellaPedido(b));
        const dups = detectarDuplicados([a, b]);
        expect(dups).toHaveLength(1);
        expect(dups[0].repetidos).toBe(1);
        expect(dups[0].puntosDeMas).toBe(2289);
    });

    it('distinta fecha de entrega NO es duplicado', () => {
        const dups = detectarDuplicados([
            pedido({ fecha_entrega: '2026-04-03', fechas_entrega: ['2026-04-03'] }),
            pedido({ fecha_entrega: '2026-04-30', fechas_entrega: ['2026-04-30'] })
        ]);
        expect(dups).toEqual([]);
    });

    it('distinto monto NO es duplicado', () => {
        expect(detectarDuplicados([pedido(), pedido({ total: 90000 })])).toEqual([]);
    });

    it('el orden de las fechas no importa', () => {
        const a = pedido({ fechas_entrega: ['2026-04-03', '2026-04-10'] });
        const b = pedido({ fechas_entrega: ['2026-04-10', '2026-04-03'] });
        expect(huellaPedido(a)).toBe(huellaPedido(b));
    });

    it('tres veces el mismo pedido son dos repetidos', () => {
        const dups = detectarDuplicados([pedido(), pedido(), pedido()]);
        expect(dups[0].repetidos).toBe(2);
        expect(dups[0].puntosDeMas).toBe(4578);
    });
});

describe('El duplicado se cuenta UNA vez, no se regalan puntos', () => {
    it('dos pedidos iguales acreditan 2289, no 4578', () => {
        const [c] = auditarPuntos([pedido(), pedido()], {});
        expect(c.pedidosContados).toBe(1);
        expect(c.duplicadosIgnorados).toBe(1);
        expect(c.puntosPorPedidos).toBe(2289);
        expect(c.puntosIgnorados).toBe(2289);
    });
});

describe('Caso real: Alexandra Mora', () => {
    // 3 pedidos distintos, mismo monto, fechas distintas
    const suyos = [
        pedido({ fecha_entrega: '2026-04-03', fechas_entrega: ['2026-04-03'] }),
        pedido({ fecha_entrega: '2026-04-30', fechas_entrega: ['2026-04-30'] }),
        pedido({ fecha_entrega: '2026-08-24', fechas_entrega: ['2026-08-24'] })
    ];

    it('no son duplicados: cambian las fechas', () => {
        expect(detectarDuplicados(suyos)).toEqual([]);
    });

    it('le corresponden 6867 puntos y tiene 0', () => {
        const doc = { currentPoints: 0, totalEarned: 6867, totalRedeemed: 0 };
        const [c] = auditarPuntos(suyos, { 'mtabm20@gmail.com': doc });
        expect(c.puntosPorPedidos).toBe(6867);
        expect(c.saldoActual).toBe(0);
        expect(c.saldoCorrecto).toBe(6867);
        expect(c.faltante).toBe(6867);
    });
});

describe('No se pisan los puntos que no vienen de pedidos', () => {
    it('el bono de bienvenida se conserva', () => {
        // totalEarned 2789 = 2289 del pedido + 500 de bienvenida
        const doc = { currentPoints: 500, totalEarned: 2789, totalRedeemed: 0 };
        const [c] = auditarPuntos([pedido()], { 'mtabm20@gmail.com': doc });
        expect(c.otrosPuntos).toBe(500);
        expect(c.saldoCorrecto).toBe(2789);
        expect(c.faltante).toBe(2289);
    });

    it('lo canjeado se descuenta', () => {
        const doc = { currentPoints: 0, totalEarned: 2289, totalRedeemed: 1000 };
        const [c] = auditarPuntos([pedido()], { 'mtabm20@gmail.com': doc });
        expect(c.saldoCorrecto).toBe(1289);
    });

    it('un saldo ya correcto no aparece como faltante', () => {
        const doc = { currentPoints: 2289, totalEarned: 2289, totalRedeemed: 0 };
        const [c] = auditarPuntos([pedido()], { 'mtabm20@gmail.com': doc });
        expect(c.faltante).toBe(0);
    });

    it('nunca da un saldo negativo', () => {
        const doc = { currentPoints: 0, totalEarned: 100, totalRedeemed: 99999 };
        const [c] = auditarPuntos([pedido()], { 'mtabm20@gmail.com': doc });
        expect(c.saldoCorrecto).toBe(0);
    });
});

describe('Resumen', () => {
    it('cuenta clientes, faltantes y puntos evitados por duplicados', () => {
        const pedidos = [pedido(), pedido(), pedido({ correo: 'otro@x.com', cliente: 'Otro' })];
        const informe = auditarPuntos(pedidos, {});
        const dups = detectarDuplicados(pedidos);
        const r = resumenAuditoria(informe, dups);

        expect(r.clientes).toBe(2);
        expect(r.pedidosDuplicados).toBe(1);
        expect(r.puntosEvitadosPorDuplicados).toBe(2289);
        expect(r.puntosADevolver).toBe(2289 + 2289);
    });

    it('sin datos no revienta', () => {
        expect(resumenAuditoria([], []).clientes).toBe(0);
        expect(auditarPuntos([], {})).toEqual([]);
    });
});
