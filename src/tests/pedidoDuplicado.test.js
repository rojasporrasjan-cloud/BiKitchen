import { describe, it, expect } from 'vitest';
import { pedidosIguales, avisoDeDuplicado, fechasDelPedido } from '../utils/pedidoDuplicado';

/**
 * Los casos son reales, de la semana del 7 de setiembre de 2026.
 *
 * Edwin salio cobrado y cocinado dos veces. Hazel y Diana llevan dos pedidos el
 * mismo dia a proposito y NO se pueden avisar, o el aviso se vuelve ruido y
 * deja de leerse justo el dia que importa.
 */

const EXISTENTES = [
    {
        id: 'a1', numeroOrden: '#ORD-EDWIN-1', cliente: 'edwin perez alvarado',
        plan: 'Pack Sin Carbos', fechas_entrega: ['2026-09-09', '2026-09-16'],
        status: 'confirmed'
    },
    {
        id: 'b1', numeroOrden: '#ORD-HAZEL-REG', cliente: 'Hazel Jimenez',
        plan: 'Pack Regular Almuerzo y Cena Mensual', fechas_entrega: ['2026-09-09'],
        status: 'confirmed'
    },
    {
        id: 'c1', numeroOrden: '#ORD-VIEJO', cliente: 'Ana Solis',
        plan: 'Pack Bajo Calorias', fechas_entrega: ['2026-09-09'],
        status: 'cancelled'
    }
];

describe('las fechas de un pedido', () => {
    it('junta la lista y la suelta, sin repetir', () => {
        expect(fechasDelPedido({ fechas_entrega: ['2026-09-09'], fecha_entrega: '2026-09-09' }))
            .toEqual(['2026-09-09']);
    });

    it('sin fechas devuelve vacio', () => {
        expect(fechasDelPedido({})).toEqual([]);
        expect(fechasDelPedido(null)).toEqual([]);
    });
});

describe('avisar del repetido antes de guardarlo', () => {
    it('agarra a Edwin: mismo cliente, mismo plan, misma fecha', () => {
        const nuevo = {
            cliente: 'Edwin Perez Alvarado', plan: 'Pack Sin Carbos',
            fechas_entrega: ['2026-09-09']
        };
        expect(pedidosIguales(nuevo, EXISTENTES)).toHaveLength(1);
        expect(avisoDeDuplicado(nuevo, EXISTENTES)).toMatch(/#ORD-EDWIN-1/);
        expect(avisoDeDuplicado(nuevo, EXISTENTES)).toMatch(/dos veces/);
    });

    it('NO avisa del segundo pack de Hazel, que es otro plan', () => {
        expect(avisoDeDuplicado({
            cliente: 'Hazel Jimenez', plan: 'Pack Sin Carbos Almuerzo y Cena Mensual',
            fechas_entrega: ['2026-09-09']
        }, EXISTENTES)).toBe(null);
    });

    it('NO avisa del mismo plan en OTRA fecha', () => {
        expect(avisoDeDuplicado({
            cliente: 'Edwin Perez Alvarado', plan: 'Pack Sin Carbos',
            fechas_entrega: ['2026-09-23']
        }, EXISTENTES)).toBe(null);
    });

    it('un pedido cancelado no estorba: ese ya no se cocina', () => {
        expect(avisoDeDuplicado({
            cliente: 'Ana Solis', plan: 'Pack Bajo Calorias',
            fechas_entrega: ['2026-09-09']
        }, EXISTENTES)).toBe(null);
    });

    it('no se compara consigo mismo al editarlo', () => {
        expect(avisoDeDuplicado({
            id: 'a1', cliente: 'edwin perez alvarado', plan: 'Pack Sin Carbos',
            fechas_entrega: ['2026-09-09']
        }, EXISTENTES)).toBe(null);
    });

    it('con una fecha en comun de varias, ya alcanza', () => {
        // El pack nuevo comparte solo el 16 con el que ya existe
        expect(pedidosIguales({
            cliente: 'edwin perez alvarado', plan: 'Pack Sin Carbos',
            fechas_entrega: ['2026-09-16', '2026-09-30']
        }, EXISTENTES)).toHaveLength(1);
    });

    it('sin nombre o sin fecha no inventa un duplicado', () => {
        expect(avisoDeDuplicado({ plan: 'Pack Sin Carbos', fechas_entrega: ['2026-09-09'] }, EXISTENTES))
            .toBe(null);
        expect(avisoDeDuplicado({ cliente: 'Edwin Perez Alvarado', plan: 'Pack Sin Carbos' }, EXISTENTES))
            .toBe(null);
    });

    it('sin nada con que comparar, no revienta', () => {
        expect(pedidosIguales({ cliente: 'X', fechas_entrega: ['2026-09-09'] })).toEqual([]);
        expect(avisoDeDuplicado({ cliente: 'X', fechas_entrega: ['2026-09-09'] }, null)).toBe(null);
    });
});
