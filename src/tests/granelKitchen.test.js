import { describe, it, expect } from 'vitest';
import { sumarAGranel, normalizarNombrePlato, claveGranel } from '../utils/granelKitchen';

/**
 * Caso REAL de la hoja del 19 de agosto de 2026:
 *
 *   Picadillo de vainica y zanahoria ... 207 TAZA(S)
 *
 * cuando los demás vegetales iban en 12. El plato es vegetal en un menú y
 * proteína en otro, y los gramos caían en la casilla de las tazas.
 */

describe('Gramos y tazas nunca se suman entre sí', () => {
    it('el caso de las 207 tazas: quedan separados', () => {
        const m = {};
        sumarAGranel(m, 'Picadillo de vainica y zanahoria', 12, 'taza(s)');
        sumarAGranel(m, 'Picadillo de vainica y zanahoria', 195, 'g');

        const lineas = Object.values(m);
        expect(lineas).toHaveLength(2);
        expect(lineas.find(l => l.unit === 'taza(s)').totalQty).toBe(12);
        expect(lineas.find(l => l.unit === 'g').totalQty).toBe(195);
        // Lo que salía antes
        expect(lineas.some(l => l.totalQty === 207)).toBe(false);
    });

    it('lo de la misma unidad sí se suma', () => {
        const m = {};
        sumarAGranel(m, 'Vegetales salteados', 5, 'taza(s)');
        sumarAGranel(m, 'Vegetales salteados', 7, 'taza(s)');
        expect(Object.values(m)).toHaveLength(1);
        expect(Object.values(m)[0].totalQty).toBe(12);
    });
});

describe('No se duplican renglones por espacios', () => {
    it('"Yuca al ajillo" y "Yuca al ajillo " son lo mismo', () => {
        const m = {};
        sumarAGranel(m, 'Yuca al ajillo', 5, 'taza(s)');
        sumarAGranel(m, 'Yuca al ajillo ', 1, 'taza(s)');
        expect(Object.values(m)).toHaveLength(1);
        expect(Object.values(m)[0].totalQty).toBe(6);
        expect(Object.values(m)[0].name).toBe('Yuca al ajillo');
    });

    it('los espacios de más adentro tampoco cuentan', () => {
        expect(normalizarNombrePlato('  Arroz   al  perejil  ')).toBe('Arroz al perejil');
    });

    it('la mayúscula no separa el renglón', () => {
        expect(claveGranel('Yuca Al Ajillo', 'g')).toBe(claveGranel('yuca al ajillo', 'g'));
    });
});

describe('Entradas que no deben ensuciar la hoja', () => {
    it('un guion de menú vacío no genera línea', () => {
        const m = {};
        sumarAGranel(m, '—', 5, 'taza(s)');
        sumarAGranel(m, '', 5, 'g');
        sumarAGranel(m, null, 5, 'g');
        expect(Object.keys(m)).toHaveLength(0);
    });

    it('una cantidad inválida cuenta como cero, no como NaN', () => {
        const m = {};
        sumarAGranel(m, 'Pollo asado', undefined, 'g');
        expect(Object.values(m)[0].totalQty).toBe(0);
    });
});

describe('Categoría para la estación de cocina', () => {
    it('usa la función que se le pase', () => {
        const m = {};
        sumarAGranel(m, 'Tilapia al ajillo', 100, 'g', () => 'Aves y Pescados');
        expect(Object.values(m)[0].category).toBe('Aves y Pescados');
    });
});
