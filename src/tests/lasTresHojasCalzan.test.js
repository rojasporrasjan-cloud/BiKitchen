/**
 * Las etiquetas, la hoja de cocina y el consolidado tienen que dar el MISMO
 * número sobre el mismo pedido.
 *
 * Los tres cuelgan de una sola pregunta —cuántas porciones de este plato salen
 * de este pedido— y cada uno la respondía por su cuenta:
 *
 *   etiquetas            Math.max(packs, cantidad) * vecesPorPack   ← el bueno
 *   buildKitchenSheetData    cantidadMenus * cantidad               ← multiplicaba
 *   consolidarCocina         packs * cantidad * vecesPorPack        ← multiplicaba
 *
 * Con eso, a quien lleva 3 packs se le imprimían 3 etiquetas y se le cocinaban
 * 9; y a un PERSONALIZADO que repite una receta 4 veces se le cocinaba 1.
 *
 * Este archivo existe para que no se vuelvan a separar: si alguien cambia la
 * cuenta en un lado y no en los otros, revienta acá y no en la cocina.
 */

import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildKitchenSheetData } from '../utils/logisticsUtils';
import { consolidarCocina } from '../utils/cocinaConsolidada';
import { buildLabelBatch } from '../utils/labels/labelDomain';

const FECHA = '2026-08-29';

// Un pack saca sus platos del menu de la semana, no del pedido. Sin esto las
// etiquetas no tienen de donde leer el nombre del plato.
const MENUS = {
    bajoCalorias: {
        platos: [{ numero: 1, proteina: 'Milanesa de pollo', vegetal: 'Vegetales', carbo: 'Arroz' }]
    }
};

/** Gramos de proteína por plato, según la hoja de cocina. */
const segunHojaDeCocina = (pedidos) => {
    const hoja = buildKitchenSheetData(pedidos, {}, { marginPercent: 0 });
    const salida = {};
    Object.values(hoja.porMenu || {}).forEach(menu => {
        Object.values(menu.platos || {}).forEach(p => {
            if (!p.proteina?.nombre) return;
            salida[p.proteina.nombre] = (salida[p.proteina.nombre] || 0) + p.proteina.totalGramos;
        });
    });
    return salida;
};

/** Lo mismo, según el consolidado de "qué se cocina junto". */
const segunConsolidado = (pedidos) => {
    const salida = {};
    consolidarCocina(pedidos, { marginPercent: 0 })
        .preparaciones
        .filter(p => p.tipo === 'Proteína')
        .forEach(p => { salida[p.nombre] = (salida[p.nombre] || 0) + p.total; });
    return salida;
};

/** Cuántas etiquetas se imprimen de cada plato. */
const segunEtiquetas = (crudos) => {
    const batch = buildLabelBatch(crudos, FECHA, MENUS);
    const salida = {};
    (batch.groups || []).forEach(g => {
        salida[g.dishName] = (salida[g.dishName] || 0) + (g.cantidad || 0);
    });
    return salida;
};

const pedidoCrudo = (extra) => ({
    id: 'ORD-1', cliente: 'Cliente Prueba', telefono: '88880000',
    estado: 'confirmed', fechas_entrega: [FECHA], fecha_entrega: FECHA,
    ...extra
});

describe('las tres hojas dan el mismo número', () => {

    const casos = [
        {
            nombre: '1 pack',
            crudo: pedidoCrudo({
                plan: 'Pack Bajo Calorías', tipoMenu: 'Bajo Calorías', cantidadMenus: 1,
                items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1, size: '120 g', proteinas: ['Milanesa de pollo'] }]
            }),
            porciones: 1
        },
        {
            nombre: '3 packs escritos en cantidadMenus',
            crudo: pedidoCrudo({
                plan: 'Pack Bajo Calorías', tipoMenu: 'Bajo Calorías', cantidadMenus: 3,
                items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1, size: '120 g', proteinas: ['Milanesa de pollo'] }]
            }),
            porciones: 3
        },
        {
            nombre: '3 packs escritos en la cantidad del ítem',
            // El mismo pedido escrito como llega por WhatsApp. Multiplicando los
            // dos campos salían 9 porciones en vez de 3.
            crudo: pedidoCrudo({
                plan: 'Pack Bajo Calorías', tipoMenu: 'Bajo Calorías', cantidadMenus: 1,
                items: [{ nombre: 'Pack Bajo Calorías', cantidad: 3, size: '120 g', proteinas: ['Milanesa de pollo'] }]
            }),
            porciones: 3
        },
        {
            nombre: 'Two Pack que además trae cantidad 2',
            // "Two Pack" ya significa dos packs. Si además viene cantidad 2, es
            // el mismo dato escrito de otra forma: son 2, no 4.
            crudo: pedidoCrudo({
                plan: 'Pack Bajo Calorías', tipoMenu: 'Bajo Calorías', cantidadMenus: 1,
                items: [{
                    nombre: 'Pack Bajo Calorías', categoryLabel: 'Two Pack',
                    cantidad: 2, size: '120 g', proteinas: ['Milanesa de pollo']
                }]
            }),
            porciones: 2
        }
    ];

    casos.forEach(({ nombre, crudo, porciones }) => {
        it(`${nombre}: cocina y consolidado coinciden`, () => {
            const pedidos = mapPedidosFromLegacy([crudo]);
            const cocina = segunHojaDeCocina(pedidos);
            const consolidado = segunConsolidado(pedidos);

            expect(cocina).toEqual(consolidado);
            // 120 g por porción
            expect(cocina['Milanesa de pollo']).toBe(120 * porciones);
        });

        it(`${nombre}: se imprimen ${porciones} etiquetas`, () => {
            expect(segunEtiquetas([crudo])['Milanesa de pollo']).toBe(porciones);
        });
    });

    it('un PERSONALIZADO que repite una receta la cuenta todas las veces', () => {
        // Christopher Ulloa lleva 4 milanesas y 2 albóndigas en UN pack.
        // La hoja de cocina ignoraba `vecesPorPack` y cocinaba una de cada una.
        const crudo = pedidoCrudo({
            plan: 'PERSONALIZADO — Chris', tipoMenu: 'Personalizado', cantidadMenus: 1,
            items: [{
                nombre: 'PERSONALIZADO — Chris', cantidad: 1, size: '120 g',
                proteinas: ['Albóndigas', 'Milanesa de pollo'],
                cantidades: [2, 4]
            }]
        });

        const pedidos = mapPedidosFromLegacy([crudo]);
        const cocina = segunHojaDeCocina(pedidos);

        expect(cocina).toEqual(segunConsolidado(pedidos));
        expect(cocina['Albóndigas']).toBe(240);        // 120 g × 2
        expect(cocina['Milanesa de pollo']).toBe(480); // 120 g × 4

        const etiquetas = segunEtiquetas([crudo]);
        expect(etiquetas['Albóndigas']).toBe(2);
        expect(etiquetas['Milanesa de pollo']).toBe(4);
    });

    it('en un suelto manda la cantidad del plato, no la del pedido', () => {
        // "1× salsa y 5× pollo" no lleva 5 de cada cosa
        const pedidos = mapPedidosFromLegacy([pedidoCrudo({
            plan: 'Individuales', tipoMenu: 'Individuales', cantidadMenus: 1,
            items: [
                { nombre: 'Pollo al ajillo', cantidad: 5, proteina: 'Pollo al ajillo', size: '250 g' },
                { nombre: 'Salsa criolla', cantidad: 1, proteina: 'Salsa criolla', size: '250 g' }
            ]
        })]);

        const cocina = segunHojaDeCocina(pedidos);
        expect(cocina).toEqual(segunConsolidado(pedidos));
        expect(cocina['Pollo al ajillo']).toBe(250 * 5);
        expect(cocina['Salsa criolla']).toBe(250);
    });
});
