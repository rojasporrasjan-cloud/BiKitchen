import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildKitchenSheetData } from '../utils/logisticsUtils';

/**
 * Las cantidades tienen que llegar a la hoja de cocina.
 *
 * Si un cliente pide 3 platos iguales y la hoja cuenta 1, la cocina prepara de
 * menos y ese pedido sale incompleto. Es el error más caro posible en la hoja.
 */

const totalesDe = (pedidoDoc) => {
    const [normalizado] = mapPedidosFromLegacy([{ id: 'x', ...pedidoDoc }]);
    const hoja = buildKitchenSheetData([normalizado], {});
    // buildKitchenSheetData devuelve { porMenu, observacionesPorMenu, desayunos }
    const menu = Object.values(hoja.porMenu)[0];
    return { normalizado, hoja, menu };
};

describe('Cantidades en la hoja de cocina', () => {
    it('un individual pedido 3 veces cuenta como 3 platos, no como 1', () => {
        const { menu } = totalesDe({
            cliente: 'Luis Mora',
            plan: 'Individuales',
            fecha_entrega: '2026-08-12',
            items: [{
                nombre: 'Pollo Teriyaki (200g)',
                cantidad: 3,
                precio: 4500,
                proteina: 'Pollo Teriyaki'
            }]
        });

        const plato = Object.values(menu.platos)[0];
        expect(plato.totalPlatos).toBe(3);
        // 200g por porción × 3 porciones
        expect(plato.proteina.totalGramos).toBe(600);
    });

    it('un pack pedido 2 veces duplica los gramos de cada proteína', () => {
        const { menu } = totalesDe({
            cliente: 'Ana Rojas',
            plan: 'Pack 3 Proteínas',
            fecha_entrega: '2026-08-12',
            items: [{
                nombre: 'Pack 3 Proteínas (250g)',
                cantidad: 2,
                precio: 27000,
                proteinas: ['Pollo al pesto', 'Res en salsa', 'Cerdo']
            }]
        });

        const platos = Object.values(menu.platos);
        expect(platos).toHaveLength(3);
        platos.forEach(plato => {
            expect(plato.totalPlatos).toBe(2);
            expect(plato.proteina.totalGramos).toBe(500); // 250g × 2
        });
    });

    it('un pedido de cantidad 1 sigue contando 1 (no cambia lo de siempre)', () => {
        const { menu } = totalesDe({
            cliente: 'Marta Solano',
            plan: 'Pack 3 Proteínas',
            fecha_entrega: '2026-08-12',
            items: [{
                nombre: 'Pack 3 Proteínas (250g)',
                cantidad: 1,
                proteinas: ['Pollo', 'Res', 'Cerdo']
            }]
        });

        Object.values(menu.platos).forEach(plato => {
            expect(plato.totalPlatos).toBe(1);
            expect(plato.proteina.totalGramos).toBe(250);
        });
    });

    it('un ítem sin cantidad se cuenta como 1', () => {
        const { menu } = totalesDe({
            cliente: 'Sin Cantidad',
            plan: 'Individuales',
            fecha_entrega: '2026-08-12',
            items: [{ nombre: 'Lasaña (300g)', proteina: 'Lasaña' }]
        });

        const plato = Object.values(menu.platos)[0];
        expect(plato.totalPlatos).toBe(1);
        expect(plato.proteina.totalGramos).toBe(300);
    });

    it('varios individuales distintos salen como platos separados', () => {
        const { menu } = totalesDe({
            cliente: 'Pedido Mixto',
            plan: 'Individuales',
            fecha_entrega: '2026-08-12',
            items: [
                { nombre: 'Pollo Teriyaki (200g)', cantidad: 2, proteina: 'Pollo Teriyaki' },
                { nombre: 'Lasaña (300g)', cantidad: 1, proteina: 'Lasaña' }
            ]
        });

        const platos = Object.values(menu.platos);
        expect(platos).toHaveLength(2);
        expect(platos[0].totalPlatos).toBe(2);
        expect(platos[1].totalPlatos).toBe(1);
    });
});
