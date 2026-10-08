import { describe, it, expect } from 'vitest';
import {
    leTocaSeguimiento, tienePedidoVivo, paraPasarseAlMensual, paraMenuDeLaSemana, familiaDelPedido
} from '../utils/enviosDeVentas';

/** Jan, 8 oct 2026: "si, deja todo listo" — seguimiento, pasate al mensual y menú por tipo. */

const HOY = '2026-10-13'; // martes
const AHORA = new Date('2026-10-13T16:00:00Z'); // 10 a. m. CR

const pedido = (extra = {}) => ({
    id: Math.random().toString(36).slice(2), cliente: 'Ana', telefono: '8888-4678', status: 'confirmed',
    paymentConfirmed: true, items: [{ nombre: 'Pack Semanal Bajo en Calorías' }], fechas_entrega: ['2026-10-10'], ...extra
});

describe('seguimiento a las 20 horas', () => {
    const hace = (h) => new Date(AHORA.getTime() - h * 3600000).toISOString();

    it('le toca a quien escribió hace 18 a 23,5 h, sin pedido ni "no molestar"', () => {
        expect(leTocaSeguimiento({ ultimoEntrante: hace(20) }, { ahora: AHORA })).toBe(true);
        expect(leTocaSeguimiento({ ultimoEntrante: hace(10) }, { ahora: AHORA })).toBe(false);   // muy pronto
        expect(leTocaSeguimiento({ ultimoEntrante: hace(24.5) }, { ahora: AHORA })).toBe(false); // ya cerró la ventana
        expect(leTocaSeguimiento({ ultimoEntrante: hace(20) }, { ahora: AHORA, tienePedido: true })).toBe(false);
        expect(leTocaSeguimiento({ ultimoEntrante: hace(20) }, { ahora: AHORA, noMolestar: true })).toBe(false);
    });

    it('una vez cada 7 días', () => {
        expect(leTocaSeguimiento({ ultimoEntrante: hace(20), seguimientoEn: hace(24 * 3) }, { ahora: AHORA })).toBe(false);
        expect(leTocaSeguimiento({ ultimoEntrante: hace(20), seguimientoEn: hace(24 * 8) }, { ahora: AHORA })).toBe(true);
    });

    it('pedido vivo = entrega de hoy en adelante o hecho en los últimos 3 días', () => {
        expect(tienePedidoVivo([pedido({ fechas_entrega: ['2026-10-17'] })], HOY, AHORA)).toBe(true);
        expect(tienePedidoVivo([pedido({ fechas_entrega: ['2026-09-01'], createdAt: '2026-10-12T15:00:00Z' })], HOY, AHORA)).toBe(true);
        expect(tienePedidoVivo([pedido({ fechas_entrega: ['2026-09-01'], createdAt: '2026-08-30T15:00:00Z' })], HOY, AHORA)).toBe(false);
        expect(tienePedidoVivo([pedido({ fechas_entrega: ['2026-10-17'], status: 'cancelled' })], HOY, AHORA)).toBe(false);
    });
});

describe('pasate al mensual', () => {
    it('a quien compra semanal con entrega reciente, no a quien ya tiene mensual', () => {
        const lista = paraPasarseAlMensual([
            pedido(),                                                                                   // Ana: semanal, entrega el 10
            pedido({ cliente: 'Beto', telefono: '87776655' }),
            pedido({ cliente: 'Beto', telefono: '87776655', items: [{ nombre: 'Pack mensual bajo en calorías' }], fechas_entrega: ['2026-10-17', '2026-10-24'] }),
            pedido({ cliente: 'Caro', telefono: '86665544', fechas_entrega: ['2026-09-19'] }),          // hace mucho
            pedido({ cliente: 'Dani', telefono: '85554433', items: [{ nombre: 'Pack 5 Proteínas de 500g' }] }) // proteínas, no pack semanal
        ], HOY);
        expect(lista.map(i => i.pedido.cliente)).toEqual(['Ana']);
    });
});

describe('menú de la semana por tipo de pack', () => {
    it('cada uno con la plantilla de su tipo; keto gana a "bajo"', () => {
        expect(familiaDelPedido(pedido({ items: [{ nombre: 'Pack Keto' }] }))).toBe('keto');
        expect(familiaDelPedido(pedido({ items: [{ nombre: 'Pack Mensual Casaditos' }] }))).toBe('casaditos');
        expect(familiaDelPedido(pedido({ items: [{ nombre: 'Pack Familiar Deluxe' }] }))).toBe('familiar');
        expect(familiaDelPedido(pedido({ items: [{ nombre: 'pack bajo en calorias mensual' }] }))).toBe('bajo-calorias');
        expect(familiaDelPedido(pedido({ items: [{ nombre: 'Lasagna vegetariana' }] }))).toBeNull();
    });

    it('a quien terminó hace 3 a 8 semanas sin volver; no a quien volvió', () => {
        const g = paraMenuDeLaSemana([
            pedido({ cliente: 'Keto', telefono: '81112222', items: [{ nombre: 'Pack Keto' }], fechas_entrega: ['2026-09-07'] }),     // 5 semanas
            pedido({ cliente: 'Reciente', telefono: '82223333', fechas_entrega: ['2026-10-03'] }),                                  // 10 días: volver a invitar
            pedido({ cliente: 'Volvió', telefono: '83334444', fechas_entrega: ['2026-09-07'] }),
            pedido({ cliente: 'Volvió', telefono: '83334444', fechas_entrega: ['2026-10-17'] }),
            pedido({ cliente: 'Viejo', telefono: '84445555', fechas_entrega: ['2026-07-01'] })                                      // > 8 semanas
        ], HOY);
        expect(g.keto.map(i => i.pedido.cliente)).toEqual(['Keto']);
        expect(g['bajo-calorias']).toEqual([]);
    });
});
