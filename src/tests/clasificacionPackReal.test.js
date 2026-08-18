import { describe, it, expect } from 'vitest';
import { isIndividualPack, mapPackNameToMenuKey, esIndividualEnLaHoja } from '../utils/packClassification';

/**
 * Casos REALES sacados de la base el 18 de agosto de 2026, revisando la hoja
 * del miércoles 19.
 *
 * El pedido de Glenda Artavia era un Pack Vegetariano de 5 platos y la hoja lo
 * imprimía como "1 porción" suelta: el nombre arrastraba la nota del cambio
 * ("cambiar tortas de espinaca por...") y la palabra "tortas" lo sacaba de su
 * menú. La cocina habría hecho una porción en vez de cinco platos.
 */

describe('El nombre del pack arrastra la nota del cambio', () => {
    const GLENDA = 'pack vegetariano cambiar tortas de espinaca por pollo en salsa hongos';

    it('sigue siendo un Pack Vegetariano, no una torta suelta', () => {
        expect(isIndividualPack(GLENDA)).toBe(false);
        expect(esIndividualEnLaHoja(GLENDA)).toBe(false);
    });

    it('encuentra su menú de la semana', () => {
        expect(mapPackNameToMenuKey(GLENDA)).toBe('vegetariano');
    });

    it('pasa igual con otras palabras que chocan', () => {
        expect(isIndividualPack('pack keto sin empanadas')).toBe(false);
        expect(isIndividualPack('Pack Regular cambiar wrap por ensalada')).toBe(false);
        expect(mapPackNameToMenuKey('pack keto sin empanadas')).toBe('keto');
    });
});

describe('Los platos sueltos de verdad no se rompen', () => {
    it('una torta suelta sigue siendo individual', () => {
        expect(isIndividualPack('Torta de huevo com espinaca')).toBe(true);
    });

    it('los packs de proteínas siguen siendo individuales', () => {
        expect(isIndividualPack('Pack 5 Proteínas (500g)')).toBe(true);
        expect(isIndividualPack('Pack 3 proteína de 250 g')).toBe(true);
    });

    it('"Individuales" sigue siendo individual', () => {
        expect(isIndividualPack('Individuales')).toBe(true);
    });

    it('el gallo pinto a granel llega a individuales por no tener menú', () => {
        // No lo agarra ninguna palabra clave: lo salva el respaldo de "sin menú"
        expect(isIndividualPack('gallo pinto (kg)')).toBe(false);
        expect(mapPackNameToMenuKey('gallo pinto (kg)')).toBeNull();
        expect(esIndividualEnLaHoja('gallo pinto (kg)')).toBe(true);
    });
});

describe('La revisión usa el mismo criterio que la hoja', () => {
    it('un nombre de plato suelto cuenta como individual, no como error', () => {
        // Rebeca lopez li: el plan quedó con el nombre del primer plato
        const PLAN = 'Picadillo chayote con maíz dulce';
        expect(mapPackNameToMenuKey(PLAN)).toBeNull();
        expect(esIndividualEnLaHoja(PLAN)).toBe(true);
    });

    it('los packs oficiales no se cuelan como individuales', () => {
        ['Pack Regular', 'PACK MENSUAL BAJO CALORIAS', 'Pack Casaditos', 'Pack Familiar']
            .forEach(p => expect(esIndividualEnLaHoja(p)).toBe(false));
    });
});
