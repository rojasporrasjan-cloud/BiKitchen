/**
 * "4 porciones" es una medida que Gina escribe seguido —los pasteles, las
 * guarniciones que se cortan— y el lector no la conocía. Al no leerla, el
 * parser adivinaba por el tipo de plato: "Pastel de maduro (4 porciones)"
 * salía como 1 TAZA, y las guarniciones adicionales de Patrick Santamaría
 * como "4 tazas".
 *
 * Una porción no es una taza, y quien empaca no tiene cómo saber cuál de las
 * dos le tocó.
 */

import { describe, it, expect } from 'vitest';
import { textoDeCantidad, parseQuantityAndUnit } from '../utils/granelKitchen';

describe('la medida escrita en porciones se respeta', () => {
    it('"4 porciones" son 4 porciones, no 4 tazas', () => {
        expect(textoDeCantidad('Picadillo de chayote con maíz dulce', '4 porciones', 1, null))
            .toBe('4 porciones');
        expect(textoDeCantidad('Croquetas de papa con jamón y queso', '4 porciones', 1, null))
            .toBe('4 porciones');
    });

    it('una sola porción va en singular', () => {
        expect(textoDeCantidad('Pastel de maduro', '1 porción', 1, null)).toBe('1 porción');
    });

    it('el bug que la motivó: el pastel de maduro', () => {
        // Antes daba "1 taza".
        expect(textoDeCantidad('Pastel de maduro', '4 porciones', 1, null)).toBe('4 porciones');
    });

    it('la unidad que sale es una que el resto del sistema ya conoce', () => {
        // `unidadesDeCocina.js` tiene 'porciones' entre sus UNIDADES.
        expect(parseQuantityAndUnit('Pastel de maduro', '4 porciones', 1).unit).toBe('porciones');
    });

    it('cuando la porción trae su gramaje, manda el gramaje', () => {
        expect(textoDeCantidad('Lasagna', '2 porciones de 250 g', 1, null))
            .toBe('500g (2 porciones de 250g)');
    });
});

describe('lo que no debe cambiar', () => {
    it('los gramos siguen igual', () => {
        expect(textoDeCantidad('Pollo en salsa BBQ', '500 g', 2, null))
            .toBe('1000g (2 porciones de 500g)');
        expect(textoDeCantidad('Crema de vegetales', '500 g', 1, null)).toBe('500g (500g)');
    });

    it('las tazas siguen siendo tazas', () => {
        expect(textoDeCantidad('Gallo pinto', '4 tazas', 1, null)).toBe('4 tazas');
    });

    it('"2 de 250" sigue siendo dos porciones de 250 g', () => {
        expect(textoDeCantidad('Fajitas de lomo', '2 de 250', 1, null))
            .toBe('500g (2 porciones de 250g)');
    });

    it('las unidades y los kilos no se tocan', () => {
        expect(textoDeCantidad('Tortillas', '6 unidades', 1, null)).toBe('6 unidades');
        expect(textoDeCantidad('Arroz con pollo', '1 kg', 1, null)).toBe('1 kg');
    });
});

/**
 * El pedido de Patrick Santamaría (lunes 7 set) tiene las tres cosas juntas:
 * un pack de 5 proteínas de 500 g repartido en 3 recetas, 2 guarniciones
 * incluidas y 2 guarniciones adicionales que se cobran aparte.
 *
 * La tabla de individuales arma UNA FILA POR ÍTEM, no por proteína dentro del
 * ítem, así que cada plato tiene que ser su propio ítem o se pierden.
 */
describe('el pedido de Patrick, de punta a punta', () => {
    const item = (nombre, plato, cantidad, medida, etiqueta, precio) => ({
        nombre, cantidad, precio, total: precio,
        category: 'individuales', categoryLabel: etiqueta,
        proteinas: [plato], medidas: [medida]
    });

    const PEDIDO = {
        id: 'p1', cliente: 'Patrick Santamaria', telefono: '72959002',
        plan: 'Pack de Proteinas de 500 g', status: 'confirmed',
        fecha_entrega: '2026-09-07', fechas_entrega: ['2026-09-07'],
        items: [
            item('Individuales — Pollo en salsa BBQ 500 g', 'Pollo en salsa BBQ', 2, '500 g', 'Proteínas', 39950),
            item('Individuales — Carne de res en salsa 500 g', 'Carne de res en salsa', 2, '500 g', 'Proteínas', 0),
            item('Individuales — Tortas de carne molida en salsa criolla 500 g', 'Tortas de carne molida en salsa criolla', 1, '500 g', 'Proteínas', 0),
            item('Guarnición — Crema de vegetales 500 g', 'Crema de vegetales', 1, '500 g', 'Guarniciones', 0),
            item('Guarnición — Tomates asados 500 g', 'Tomates asados', 1, '500 g', 'Guarniciones', 0),
            item('Guarnición adicional — Picadillo de chayote con maíz dulce', 'Picadillo de chayote con maíz dulce', 1, '4 porciones', 'Guarniciones', 5850),
            item('Guarnición adicional — Croquetas de papa con jamón y queso', 'Croquetas de papa con jamón y queso', 1, '4 porciones', 'Guarniciones', 7850)
        ]
    };

    it('salen los 7 platos, ninguno se pierde', async () => {
        const { mapPedidosFromLegacy } = await import('../utils/logisticsUtils');
        const [p] = mapPedidosFromLegacy([PEDIDO]);
        expect(p.platos).toHaveLength(7);
    });

    it('cada uno con la medida que escribió Gina', async () => {
        const { mapPedidosFromLegacy } = await import('../utils/logisticsUtils');
        const [p] = mapPedidosFromLegacy([PEDIDO]);
        const linea = (i) => textoDeCantidad(
            p.platos[i].proteina.nombre, p.platos[i].medida, p.platos[i].cantidad, null);

        expect(linea(0)).toBe('1000g (2 porciones de 500g)');  // 2 × Pollo BBQ
        expect(linea(1)).toBe('1000g (2 porciones de 500g)');  // 2 × Carne de res
        expect(linea(2)).toBe('500g (500g)');                  // 1 × Tortas
        expect(linea(3)).toBe('500g (500g)');                  // Crema de vegetales
        expect(linea(4)).toBe('500g (500g)');                  // Tomates asados
        expect(linea(5)).toBe('4 porciones');                  // Picadillo, adicional
        expect(linea(6)).toBe('4 porciones');                  // Croquetas, adicional
    });

    it('el pack son 5 porciones de proteína en total', async () => {
        const { mapPedidosFromLegacy } = await import('../utils/logisticsUtils');
        const [p] = mapPedidosFromLegacy([PEDIDO]);
        const proteinas = p.platos.slice(0, 3).reduce((n, x) => n + x.cantidad, 0);
        expect(proteinas).toBe(5);
    });

    it('la plata cuadra: 39.950 + 5.850 + 7.850 = 53.650', () => {
        expect(PEDIDO.items.reduce((n, i) => n + i.precio, 0)).toBe(53650);
    });
});
