import { describe, it, expect } from 'vitest';
import { unidadesPosibles, convertir, textoEnUnidad, desdeUnidad } from '../utils/unidadesDeCocina.js';

/**
 * El caso que destapó esto: la hoja pedía 7670 g de lasaña y Gina cocinó 40
 * porciones. Faltaban 9 y nadie lo vio, porque comparar obligaba a dividir a
 * mano. La lasaña no es carne suelta: es un plato armado que se cuenta por
 * porción.
 */
const lasagna = { name: 'Lasagna de pollo', unit: 'g', totalQty: 7670, porciones: 49 };
const arroz = { name: 'Arroz blanco', unit: 'taza(s)', totalQty: 60, porciones: 60 };
const maduros = { name: 'Maduros', unit: 'unidades', totalQty: 60, porciones: 30 };
const sinPlatos = { name: 'Salsa de tomate', unit: 'g', totalQty: 2000, porciones: 0 };

describe('la lasaña se puede ver en porciones', () => {
    it('7670 g son 49 porciones, que es como las cuenta Gina', () => {
        expect(convertir(lasagna, 'porciones')).toBe(49);
        expect(textoEnUnidad(lasagna, 'porciones')).toBe('49 porción(es)');
    });

    it('y en kilos, que es como se pesa la carne', () => {
        expect(convertir(lasagna, 'kg')).toBe(7.67);
        expect(textoEnUnidad(lasagna, 'kg')).toBe('7.7 kg');
    });

    it('en su unidad no cambia nada', () => {
        expect(convertir(lasagna, 'g')).toBe(7670);
    });
});

describe('las porciones NO se calculan dividiendo', () => {
    /**
     * Un renglón puede sumar platos de distinto gramaje: 40 de 120 g y 5 de
     * 100 g. Dividir por un solo gramaje daría un número que no existe. Por eso
     * el renglón trae el conteo de platos.
     */
    it('usa los platos contados, no el total entre un gramaje', () => {
        const mezclado = { unit: 'g', totalQty: 5300, porciones: 45 };   // 40×120 + 5×100
        expect(convertir(mezclado, 'porciones')).toBe(45);
        expect(convertir(mezclado, 'porciones')).not.toBe(Math.round(5300 / 120));
    });

    it('sin platos contados, no inventa un número', () => {
        expect(convertir(sinPlatos, 'porciones')).toBeNull();
        expect(textoEnUnidad(sinPlatos, 'porciones')).toBeNull();
    });
});

describe('gramos y tazas NO se convierten entre sí', () => {
    it('una taza de arroz y una de carne no pesan lo mismo', () => {
        expect(convertir(lasagna, 'taza(s)')).toBeNull();
        expect(convertir(arroz, 'g')).toBeNull();
    });

    it('y por eso la opción ni siquiera aparece', () => {
        expect(unidadesPosibles(lasagna)).not.toContain('taza(s)');
        expect(unidadesPosibles(arroz)).not.toContain('g');
    });
});

describe('qué unidades ofrece cada renglón', () => {
    it('una proteína: gramos, kilos y porciones', () => {
        expect(unidadesPosibles(lasagna)).toEqual(['g', 'kg', 'porciones']);
    });

    it('un vegetal: tazas y porciones', () => {
        expect(unidadesPosibles(arroz)).toEqual(['taza(s)', 'porciones']);
    });

    it('los maduros: unidades y porciones', () => {
        expect(unidadesPosibles(maduros)).toEqual(['unidades', 'porciones']);
    });

    it('sin platos contados, solo la suya', () => {
        expect(unidadesPosibles(sinPlatos)).toEqual(['g', 'kg']);
    });

    it('no revienta con un renglón vacío', () => {
        expect(() => unidadesPosibles(null)).not.toThrow();
        expect(convertir(null, 'g')).toBeNull();
    });
});

describe('los maduros del casadito', () => {
    /**
     * Van de a DOS por plato. 60 unidades para 30 platos: en unidades es 60, en
     * porciones es 30. Gina los manda en "lonjas", que son unidades.
     */
    it('60 unidades son 30 porciones, no 60', () => {
        expect(convertir(maduros, 'unidades')).toBe(60);
        expect(convertir(maduros, 'porciones')).toBe(30);
    });
});

describe('como se escribe el número', () => {
    it('los kilos con un decimal', () => {
        expect(textoEnUnidad({ unit: 'g', totalQty: 9282, porciones: 60 }, 'kg')).toBe('9.3 kg');
    });

    it('lo demás entero y para arriba: no se cocina medio plato', () => {
        expect(textoEnUnidad({ unit: 'taza(s)', totalQty: 12.4, porciones: 12 }, 'taza(s)')).toBe('13 taza(s)');
    });

    it('un entero se queda entero', () => {
        expect(textoEnUnidad({ unit: 'taza(s)', totalQty: 30, porciones: 30 }, 'taza(s)')).toBe('30 taza(s)');
    });
});

describe('acepta como venga escrita la unidad', () => {
    it('"kg", "kilos", "gramos", "tazas", "lonjas"', () => {
        expect(convertir({ unit: 'kilos', totalQty: 8, porciones: 40 }, 'g')).toBe(8000);
        expect(convertir({ unit: 'gramos', totalQty: 8000, porciones: 40 }, 'kg')).toBe(8);
        expect(convertir({ unit: 'tazas', totalQty: 30, porciones: 30 }, 'porciones')).toBe(30);
        expect(convertir({ unit: 'lonjas', totalQty: 30, porciones: 15 }, 'porciones')).toBe(15);
    });
});

describe('el camino de vuelta: lo que Gina escribe se guarda en la unidad base', () => {
    /**
     * La correccion se guarda SIEMPRE en la unidad del renglon. Si ella mira
     * porciones y escribe 60, se guardan los gramos de esas 60 porciones, para
     * que el resto de la hoja lea una sola unidad.
     */
    const lasagna = { unit: 'g', totalQty: 7670, porciones: 49 };

    it('60 porciones de lasaña se guardan como gramos', () => {
        const g = desdeUnidad(lasagna, 60, 'porciones');
        expect(Math.round(g)).toBe(9392);          // 60 × (7670/49)
        // y al volver a mirarlo en porciones, son las 60 que escribió
        expect(Math.round(convertir({ ...lasagna, totalQty: g, porciones: 60 }, 'porciones'))).toBe(60);
    });

    it('8 kg se guardan como 8000 g', () => {
        expect(desdeUnidad(lasagna, 8, 'kg')).toBe(8000);
    });

    it('en su propia unidad no toca el número', () => {
        expect(desdeUnidad(lasagna, 7670, 'g')).toBe(7670);
    });

    it('los maduros: 40 porciones son 80 unidades, porque van de a dos', () => {
        const maduros = { unit: 'unidades', totalQty: 60, porciones: 30 };
        expect(desdeUnidad(maduros, 40, 'porciones')).toBe(80);
    });

    it('ida y vuelta no mueve el número', () => {
        const arroz = { unit: 'taza(s)', totalQty: 32, porciones: 49 };
        const enPorciones = convertir(arroz, 'porciones');
        expect(Math.round(desdeUnidad(arroz, enPorciones, 'porciones'))).toBe(32);
    });

    it('sin platos contados no inventa la vuelta', () => {
        expect(desdeUnidad({ unit: 'g', totalQty: 2000, porciones: 0 }, 5, 'porciones')).toBeNull();
    });

    it('no revienta con basura', () => {
        expect(desdeUnidad(lasagna, '', 'porciones')).toBeNull();
        expect(desdeUnidad(null, 5, 'g')).toBeNull();
    });
});
