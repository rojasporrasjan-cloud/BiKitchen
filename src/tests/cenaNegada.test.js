/**
 * "No lleva cena" significa que NO lleva cena.
 *
 * La regla buscaba la palabra "cena" sin mirar si venía negada. A Marlon Camacho
 * lo mandaba a la hoja de cenas justo por decir que no las lleva, y a Sofía
 * Gutiérrez le desarmaba el two pack por lo mismo (Gina, 11 de setiembre 2026).
 */

import { describe, it, expect } from 'vitest';
import { textoLlevaCena } from '../utils/labels/labelDomain';

describe('cuando el pedido dice que NO lleva cena', () => {

    it('el caso de Marlon: la especificación dice que no la lleva', () => {
        expect(textoLlevaCena('Two pack sin carbos mensual con Regalia desayuno / no lleva cena')).toBe(false);
    });

    it('aguanta las formas de decirlo', () => {
        ['no lleva cena', 'NO LLEVA CENA', 'sin cena', 'no come cenas',
         'no incluye cena', 'no tiene cena', 'sin cenas'
        ].forEach(t => expect(textoLlevaCena(t)).toBe(false));
    });

    it('el two pack de Sofía no se parte en cenas', () => {
        expect(textoLlevaCena('two pack bajo en calorias REGALIA DESAYUNOS')).toBe(false);
    });
});

describe('los que SÍ llevan cena siguen llevándola', () => {

    it('cuando lo dice el nombre del pack', () => {
        ['Pack almuerzo y cena mensual',
         'Pack Quincenal Almuerzo y Cena con regalia de Desayunos CASADITOS',
         'CENAS - Pack Bajo Calorias'
        ].forEach(t => expect(textoLlevaCena(t)).toBe(true));
    });

    it('la promo de dos semanas y el quincenal con desayunos', () => {
        expect(textoLlevaCena('PACK DOS SEMANAS CON DESAYUNOS GRATIS')).toBe(true);
        expect(textoLlevaCena('pack quincenal con regalia de desayunos')).toBe(true);
    });

    it('una negación de OTRA cosa no le quita la cena', () => {
        // "no mariscos" no tiene por qué tocar la cena
        expect(textoLlevaCena('no mariscos, lleva cena')).toBe(true);
        expect(textoLlevaCena('Pack almuerzo y cena / no cerdo')).toBe(true);
    });
});
