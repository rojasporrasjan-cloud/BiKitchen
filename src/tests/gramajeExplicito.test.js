import { describe, it, expect } from 'vitest';
import { getDefaultGrams, mapPackNameToMenuKey, esIndividualEnLaHoja } from '../utils/packClassification';

/**
 * Un pedido PERSONALIZADO lleva los platos que el cliente pidio, no los del
 * menu oficial. Para eso su nombre no puede calzar con ningun pack — si calza,
 * la hoja le pone los platos del catalogo y se pierde lo suyo.
 *
 * Pero al no calzar, getDefaultGrams caia al valor por defecto de 150 g:
 * a Sonia Oreamuno (Pack Regular, 100 g) le subia la porcion un 50% y a
 * Christopher Ulloa (Bajo Calorias, 120 g) un 25%.
 *
 * La salida es escribir el gramaje en el nombre. Es explicito, sale impreso en
 * la hoja, y no arrastra ningun menu.
 */
describe('gramaje escrito en el nombre', () => {

    it('respeta el gramaje del personalizado de Sonia', () => {
        expect(getDefaultGrams('PERSONALIZADO — Sonia Oreamuno (100 g)')).toBe(100);
    });

    it('respeta el gramaje del personalizado de Christopher', () => {
        expect(getDefaultGrams('PERSONALIZADO — Christopher Ulloa (120 g)')).toBe(120);
    });

    it('el personalizado con gramaje NO arrastra ningun menu oficial', () => {
        expect(mapPackNameToMenuKey('PERSONALIZADO — Christopher Ulloa (120 g)')).toBeNull();
        expect(esIndividualEnLaHoja('PERSONALIZADO — Christopher Ulloa (120 g)')).toBe(true);
    });

    it('lee tambien "gramos" escrito completo', () => {
        expect(getDefaultGrams('PERSONALIZADO — Prueba (200 gramos)')).toBe(200);
    });

    // --- lo de siempre sigue igual ---

    it('los packs conocidos no cambian', () => {
        expect(getDefaultGrams('Pack Bajo Calorías')).toBe(120);
        expect(getDefaultGrams('Pack Sin Carbos')).toBe(120);
        expect(getDefaultGrams('Pack Keto')).toBe(200);
        expect(getDefaultGrams('Pack Regular')).toBe(100);
        expect(getDefaultGrams('Pack Casaditos')).toBe(100);
        expect(getDefaultGrams('Full Pack')).toBe(150);
    });

    it('un nombre sin gramaje sigue cayendo en 150', () => {
        expect(getDefaultGrams('PERSONALIZADO — Alguien')).toBe(150);
        expect(getDefaultGrams('')).toBe(150);
    });

    it('no confunde un numero que no es gramaje', () => {
        expect(getDefaultGrams('pack bajo calorías 80 comidas al mes')).toBe(120);
        expect(getDefaultGrams('5 Comidas a la Semana - Pack Regular')).toBe(100);
    });
});
