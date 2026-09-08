/**
 * "pack mensual proteínas 250 g" — el pack de Xiomara Vílchez.
 *
 * No es un pack con menú: son 5 proteínas sueltas que ella escoge cada semana
 * por chat, de 250 g cada una. Pero la palabra "mensual" lo mandaba al menú
 * Regular, y la hoja le ponía los platos de la semana a 100 g por porción.
 *
 * La regla de proteínas pedía un número entre "pack" y "proteína" ("Pack 5
 * Proteínas"), así que este nombre se le escapaba entero.
 */

import { describe, it, expect } from 'vitest';
import { mapPackNameToMenuKey, isIndividualPack, porcionesDelPack } from '../utils/packClassification';

describe('un pack que solo dice proteínas no es un pack con menú', () => {
    it('el de Xiomara', () => {
        const n = 'pack mensual proteínas 250 g';
        expect(mapPackNameToMenuKey(n)).toBeNull();
        expect(isIndividualPack(n)).toBe(true);
    });

    it('escrito de otras maneras', () => {
        ['Pack de Proteínas mensual',
         'PACK PROTEINAS 250G',
         'pack semanal proteinas',
         'Pack 5 Proteínas'].forEach((n) => {
            expect(mapPackNameToMenuKey(n)).toBeNull();
            expect(isIndividualPack(n)).toBe(true);
        });
    });
});

describe('lo que NO se debe llevar por delante', () => {
    it('un pack de familia que menciona la proteína sigue siendo de esa familia', () => {
        // La familia se decide ANTES, así que la palabra "proteína" no manda acá.
        expect(mapPackNameToMenuKey('Pack Bajo Calorías 120g proteína')).toBe('bajoCalorias');
        expect(mapPackNameToMenuKey('Pack Keto 200 g proteína')).toBe('keto');
        expect(mapPackNameToMenuKey('Full Pack 150g proteína + 3 carbos')).toBe('fullPack');
        expect(mapPackNameToMenuKey('Pack Sin Carbos con proteína extra')).toBe('sinCarbos');
    });

    it('un mensual de verdad, sin proteínas en el nombre, sigue siendo regular', () => {
        expect(mapPackNameToMenuKey('Pack Mensual')).toBe('regular');
        expect(mapPackNameToMenuKey('Pack Quincenal')).toBe('regular');
        expect(mapPackNameToMenuKey('Two Pack Promocional')).toBe('regular');
    });

    it('la porción deja de ser la del menú Regular', () => {
        // Antes daba 100 g (Regular). Ahora cae al por defecto y la medida
        // escrita en el pedido es la que manda — ver medidas_individuales.
        expect(porcionesDelPack('pack mensual proteínas 250 g').proteina).not.toBe(100);
    });
});
