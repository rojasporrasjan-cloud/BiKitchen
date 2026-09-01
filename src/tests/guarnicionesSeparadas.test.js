import { describe, it, expect } from 'vitest';
import { separarPorY, cantidadDeGuarnicion } from '../utils/guarnicionesSeparadas.js';

/**
 * "Se cocina arroz frijoles y maduros juntos, tiene que ser todo por aparte, y
 * si en caso sea 1 taza se cocina 1 taza de cada uno. Los maduros para el
 * casadito son 2 unidades." — Gina.
 */
describe('guarniciones escritas con "y", sin coma', () => {

    it('parte "Arroz y frijoles" en dos ollas', () => {
        expect(separarPorY('Arroz y frijoles')).toEqual(['Arroz', 'Frijoles']);
    });

    it('NO parte el nombre de un plato que lleva "y" adentro', () => {
        // Este es el caso que obligaba a pedir coma para partir.
        expect(separarPorY('Canelones rellenos con queso y envueltos en huevo'))
            .toEqual(['Canelones rellenos con queso y envueltos en huevo']);
        expect(separarPorY('Zuchinnis salteados con hongos y cebollas carmelizadas'))
            .toEqual(['Zuchinnis salteados con hongos y cebollas carmelizadas']);
        expect(separarPorY('Filet de tilapia con peregil y ajo'))
            .toEqual(['Filet de tilapia con peregil y ajo']);
    });

    it('un nombre sin "y" se queda igual', () => {
        expect(separarPorY('Arroz blanco')).toEqual(['Arroz blanco']);
    });
});

describe('cada guarnicion con su unidad', () => {

    it('los maduros van de a dos por plato, en unidades', () => {
        expect(cantidadDeGuarnicion('Maduros', 1.5, 'taza(s)', 5))
            .toEqual({ cantidad: 10, unidad: 'unidad(es)' });
    });

    it('el arroz y los frijoles conservan la cantidad del renglon', () => {
        expect(cantidadDeGuarnicion('Arroz', 1.5, 'taza(s)', 5))
            .toEqual({ cantidad: 1.5, unidad: 'taza(s)' });
        expect(cantidadDeGuarnicion('Frijoles', 1, 'taza(s)', 3))
            .toEqual({ cantidad: 1, unidad: 'taza(s)' });
    });

    it('sin saber cuantos platos son, no se inventa la cuenta', () => {
        expect(cantidadDeGuarnicion('Maduros', 3, 'taza(s)', 0))
            .toEqual({ cantidad: 3, unidad: 'taza(s)' });
    });
});
