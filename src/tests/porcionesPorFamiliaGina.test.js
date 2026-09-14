/**
 * Las porciones de cada familia, leídas de la hoja de Gina del lunes 14 de
 * setiembre de 2026 — plato por plato, no del encabezado.
 *
 * El encabezado miente en dos lados: en Regular dice 90 g (es un pedido suelto
 * de un cliente, no la familia) y en Keto dice 150 cuando los cinco platos
 * dicen 200. Los renglones de los platos son el dato bueno.
 *
 * Esto es lo que multiplica TODAS las cantidades de cocina. Si un número de acá
 * cambia sin querer, se cocina de más o de menos para toda la semana y no se ve
 * hasta que falta comida.
 */

import { describe, it, expect } from 'vitest';
import { PORCIONES_POR_FAMILIA } from '../utils/packClassification';

describe('lo que Gina ya había revisado — no se toca', () => {

    it('Bajo Calorías: 120 g, 1 taza de vegetal, 1/2 de harina', () => {
        expect(PORCIONES_POR_FAMILIA.bajoCalorias).toMatchObject({ proteina: 120, vegetal: 1, carbo: 0.5 });
    });

    it('Keto: 200 g y 1,5 taza de vegetal, sin harina', () => {
        // El encabezado de la hoja dice 150, pero los cinco platos dicen 200
        expect(PORCIONES_POR_FAMILIA.keto).toMatchObject({ proteina: 200, vegetal: 1.5, carbo: 0 });
    });

    it('Casaditos: la harina son arroz 1 + frijoles y maduros 0,5', () => {
        // En la hoja van en dos renglones; acá suman 1,5
        expect(PORCIONES_POR_FAMILIA.casaditos).toMatchObject({ proteina: 100, vegetal: 0.5, carbo: 1.5 });
    });
});

describe('las cuatro que nunca se habían revisado', () => {

    it('Sin Carbos lleva 1,5 taza de vegetal, no 1', () => {
        // Es lo que compensa que no lleve harina
        expect(PORCIONES_POR_FAMILIA.sinCarbos).toMatchObject({ proteina: 120, vegetal: 1.5, carbo: 0 });
    });

    it('Regular tenía el vegetal y la harina INVERTIDOS', () => {
        // Media taza de vegetal y una entera de harina, no al contrario
        expect(PORCIONES_POR_FAMILIA.regular).toMatchObject({ proteina: 100, vegetal: 0.5, carbo: 1 });
    });

    it('Vegetariano es de 120 g y una taza de harina', () => {
        expect(PORCIONES_POR_FAMILIA.vegetariano).toMatchObject({ proteina: 120, vegetal: 1, carbo: 1 });
    });

    it('Full Pack lleva DOS tazas de harina', () => {
        // Con 0,5 se cocinaba la cuarta parte de la harina de toda la familia
        expect(PORCIONES_POR_FAMILIA.fullPack).toMatchObject({ proteina: 150, vegetal: 1, carbo: 2 });
    });
});

describe('los familiares se miden por bandeja, no por persona', () => {
    it('la porción es 1 kg o 4 tazas por plato', () => {
        ['familiarDeluxe', 'familiarPremium'].forEach(k => {
            expect(PORCIONES_POR_FAMILIA[k].proteina).toBe(1000);
            expect(PORCIONES_POR_FAMILIA[k].textoPorcion).toMatch(/1 KG O 4 TAZAS/);
        });
    });
});
