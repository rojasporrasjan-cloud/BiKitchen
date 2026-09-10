import { describe, it, expect } from 'vitest';
import { inicioDeVentana, ventanaAUsar, pedidosDeLaHoja } from './ventanaDeLaHoja';

const IMPRIMEN = ['confirmed', 'delivered', 'in_transit'];
const calendario = (p) => p?.fechas_entrega || [];

describe('inicioDeVentana', () => {
    it('resta los 40 dias', () => {
        expect(inicioDeVentana('2026-09-12')).toBe('2026-08-03');
    });
    it('acepta otra cantidad de dias', () => {
        expect(inicioDeVentana('2026-09-12', 7)).toBe('2026-09-05');
    });
    it('no revienta con basura', () => {
        expect(inicioDeVentana('')).toBe('');
        expect(inicioDeVentana(null)).toBe('');
        expect(inicioDeVentana('no es fecha')).toBe('');
    });
});

describe('ventanaAUsar', () => {
    it('la primera vez usa la que se necesita', () => {
        expect(ventanaAUsar('', '2026-08-03')).toBe('2026-08-03');
    });

    it('avanzar en la semana NO amplia la ventana: ya esta todo cargado', () => {
        // El sabado 12 cargo desde el 3 de agosto; el lunes 14 pediria el 5.
        // Como el 5 es DESPUES del 3, lo que ya esta cargado alcanza.
        expect(ventanaAUsar('2026-08-03', '2026-08-05')).toBe('2026-08-03');
    });

    it('retroceder si la amplia, porque hay pedidos mas viejos', () => {
        expect(ventanaAUsar('2026-08-03', '2026-07-20')).toBe('2026-07-20');
    });

    it('sin fecha necesaria se queda con la que tenia', () => {
        expect(ventanaAUsar('2026-08-03', '')).toBe('2026-08-03');
        expect(ventanaAUsar('', '')).toBe('');
    });
});

describe('pedidosDeLaHoja', () => {
    const base = [
        { id: '1', cliente: 'Zulema', status: 'confirmed', fechas_entrega: ['2026-09-12'] },
        { id: '2', cliente: 'Ana', status: 'confirmed', fechas_entrega: ['2026-09-14'] },
        { id: '3', cliente: 'Beto', status: 'pending_payment', fechas_entrega: ['2026-09-12'] },
        { id: '4', cliente: 'Caro', status: 'confirmed', fechas_entrega: ['2026-10-01'] },
        { id: '5', cliente: 'Dani', status: 'in_transit', fechas_entrega: ['2026-09-07', '2026-09-14'] }
    ];

    it('trae solo los del dia y en estado que imprime', () => {
        const r = pedidosDeLaHoja(base, ['2026-09-12'], { estadosQueImprimen: IMPRIMEN, calendario });
        expect(r.map(x => x.id)).toEqual(['1']);
    });

    it('un mensual entra por cualquiera de sus fechas', () => {
        const r = pedidosDeLaHoja(base, ['2026-09-14'], { estadosQueImprimen: IMPRIMEN, calendario });
        expect(r.map(x => x.cliente).sort()).toEqual(['Ana', 'Dani']);
    });

    it('deja fuera los que no estan pagados', () => {
        const r = pedidosDeLaHoja(base, ['2026-09-12'], { estadosQueImprimen: IMPRIMEN, calendario });
        expect(r.some(x => x.cliente === 'Beto')).toBe(false);
    });

    it('sale ordenado por cliente, como antes', () => {
        const r = pedidosDeLaHoja(base, ['2026-09-12', '2026-09-14'], { estadosQueImprimen: IMPRIMEN, calendario });
        expect(r.map(x => x.cliente)).toEqual(['Ana', 'Dani', 'Zulema']);
    });

    it('cambiar de fecha da OTRO resultado sobre la MISMA lista: eso es lo que evita reconsultar', () => {
        const sab = pedidosDeLaHoja(base, ['2026-09-12'], { estadosQueImprimen: IMPRIMEN, calendario });
        const lun = pedidosDeLaHoja(base, ['2026-09-14'], { estadosQueImprimen: IMPRIMEN, calendario });
        expect(sab.map(x => x.id)).toEqual(['1']);
        expect(lun.map(x => x.id).sort()).toEqual(['2', '5']);
    });

    it('no revienta sin datos', () => {
        expect(pedidosDeLaHoja([], ['2026-09-12'], { estadosQueImprimen: IMPRIMEN, calendario })).toEqual([]);
        expect(pedidosDeLaHoja(null, ['2026-09-12'], { estadosQueImprimen: IMPRIMEN, calendario })).toEqual([]);
        expect(pedidosDeLaHoja(base, [], { estadosQueImprimen: IMPRIMEN, calendario })).toEqual([]);
        expect(pedidosDeLaHoja(base, ['2026-09-12'], { estadosQueImprimen: IMPRIMEN })).toEqual([]);
    });
});
