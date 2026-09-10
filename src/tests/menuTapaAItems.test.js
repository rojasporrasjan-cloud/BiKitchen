/**
 * Un pedido puede traer DOS listas: `menu` (el formato viejo) e `items`.
 *
 * Xiomara Vílchez tenía `menu` con una sola línea —"pack mensual proteínas
 * 250 g", sin platos— e `items` con sus 5 proteínas de verdad. Como se leía
 * `p.menu || p.items`, ganaba el resumen: la hoja de empaque le imprimía UNA
 * fila con el nombre del pack y a cocina no le llegaba nada que preparar.
 */

import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';

const PROTES = ['Pollo a la toscana', 'Pollo caribeño', 'Milanesa de pollo',
                'Pollo en salsa BBQ', 'Tortas de carne molida en salsa criolla'];

const base = (over = {}) => ({
    id: 'x1', cliente: 'Xiomara Vilchez', telefono: '60407078',
    plan: 'pack mensual proteínas 250 g', status: 'confirmed',
    fecha_entrega: '2026-09-07', fechas_entrega: ['2026-09-07'],
    ...over
});

const detallado = {
    nombre: 'pack mensual proteínas 250 g', cantidad: 1, size: '250g',
    proteinas: PROTES, medidas: PROTES.map(() => '250 g')
};
const resumen = { nombre: 'pack mensual proteínas 250 g', cantidad: 1, precio: 75600 };

describe('gana la lista que trae los platos', () => {
    it('el resumen de `menu` ya no tapa a `items`', () => {
        const [p] = mapPedidosFromLegacy([base({ menu: [resumen], items: [detallado] })]);
        expect(p.platos).toHaveLength(5);
        expect(p.platos.map(x => x.proteina.nombre)).toEqual(PROTES);
    });

    it('cada proteína conserva la medida escrita en el pedido', () => {
        const [p] = mapPedidosFromLegacy([base({ menu: [resumen], items: [detallado] })]);
        expect(p.platos.every(x => x.medida === '250 g')).toBe(true);
        expect(p.platos.every(x => x.proteina.gramosPorPorcion === 250)).toBe(true);
    });
});

describe('lo que no debe cambiar', () => {
    it('si `menu` es el que trae el detalle, sigue mandando `menu`', () => {
        const [p] = mapPedidosFromLegacy([base({ menu: [detallado], items: [resumen] })]);
        expect(p.platos).toHaveLength(5);
    });

    it('con una sola lista se comporta igual que siempre', () => {
        const soloItems = mapPedidosFromLegacy([base({ items: [detallado] })])[0];
        expect(soloItems.platos).toHaveLength(5);
        const soloMenu = mapPedidosFromLegacy([base({ menu: [detallado] })])[0];
        expect(soloMenu.platos).toHaveLength(5);
    });

    it('si ninguna trae platos, se respeta el orden de siempre', () => {
        const [p] = mapPedidosFromLegacy([base({ menu: [resumen], items: [{ nombre: 'otra cosa' }] })]);
        // Gana `menu`, como antes: una línea con el nombre del pack.
        expect(p.platos).toHaveLength(1);
        expect(p.platos[0].proteina.nombre).toBe('pack mensual proteínas 250 g');
    });
});
