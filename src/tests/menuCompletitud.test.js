import { describe, it, expect } from 'vitest';
import { camposLlenos, camposQuePide, platoCompleto } from '../utils/menuCompletitud';

/**
 * El editor de menus decia "0 / 5 platos completos" con los quince campos
 * escritos, porque el carbohidrato se sumaba DOS veces y un plato completo daba
 * 4 cuando el contador exigia 3.
 *
 * No es cosmetico: es la unica senal de que el menu quedo cargado. La semana del
 * 8 de setiembre el menu de cena quedo con el de la semana anterior y nadie se
 * entero hasta que la comida se estaba cocinando.
 */

const PLATO = { proteina: 'Fajitas mixtas encebolladas', vegetal: 'Picadillo mixto', carbo: 'Arroz y frijoles' };

describe('un plato de menu normal', () => {
    it('completo cuenta TRES campos, no cuatro', () => {
        expect(camposLlenos(PLATO)).toBe(3);
    });

    it('y por lo tanto se da por completo', () => {
        expect(platoCompleto(PLATO)).toBe(true);
        expect(camposQuePide({})).toBe(3);
    });

    it('sin el carbo todavia no esta completo', () => {
        expect(camposLlenos({ ...PLATO, carbo: '' })).toBe(2);
        expect(platoCompleto({ ...PLATO, carbo: '' })).toBe(false);
    });

    it('un campo con solo espacios no cuenta como lleno', () => {
        expect(camposLlenos({ ...PLATO, vegetal: '   ' })).toBe(2);
    });
});

describe('sin carbos', () => {
    const tipo = { isSinCarbos: true };

    it('se completa con proteina y vegetal', () => {
        expect(camposLlenos({ proteina: 'Pollo al pesto', vegetal: 'Mix de vegetales' }, tipo)).toBe(2);
        expect(platoCompleto({ proteina: 'Pollo al pesto', vegetal: 'Mix de vegetales' }, tipo)).toBe(true);
        expect(camposQuePide(tipo)).toBe(2);
    });

    it('el carbo no suma aunque venga escrito', () => {
        expect(camposLlenos(PLATO, tipo)).toBe(2);
        expect(platoCompleto(PLATO, tipo)).toBe(true);
    });
});

describe('familiares y desayunos', () => {
    const tipo = { isSingleField: true };

    it('basta el nombre del platillo', () => {
        expect(camposLlenos({ proteina: 'Lasagna de pollo' }, tipo)).toBe(1);
        expect(platoCompleto({ proteina: 'Lasagna de pollo' }, tipo)).toBe(true);
        expect(camposQuePide(tipo)).toBe(1);
    });

    it('vacio no cuenta', () => {
        expect(camposLlenos({ proteina: '' }, tipo)).toBe(0);
        expect(platoCompleto({ proteina: '' }, tipo)).toBe(false);
    });
});

describe('sin datos', () => {
    it('no revienta', () => {
        expect(camposLlenos(null)).toBe(0);
        expect(camposLlenos(undefined, {})).toBe(0);
        expect(platoCompleto({})).toBe(false);
    });
});
