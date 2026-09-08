import { describe, it, expect } from 'vitest';
import { agruparArroces, esArroz, ETIQUETA_GRUPO_ARROZ } from '../utils/agruparArroces.js';

/**
 * "El arroz todo se cocine junto y se divida en los arroces" — Jan.
 * La hoja los listaba sueltos y habia que sumarlos de cabeza.
 */
const arroz = (name, qty) => ({ name, qty, unit: 'taza(s)' });

describe('el arroz va junto, con su desglose debajo', () => {

    const items = [
        { name: 'Pollo al ajillo', qty: 598, unit: 'g' },
        arroz('Arroz blanco', 6),
        arroz('Arroz frito', 2),
        { name: 'Vegetales mixtos', qty: 22, unit: 'taza(s)' },
        arroz('Arroz jardinero', 5)
    ];
    const filas = agruparArroces(items);

    it('pone una cabecera con el total de todos los arroces', () => {
        const grupo = filas.find(f => f.tipo === 'grupo');
        expect(grupo.nombre).toBe(ETIQUETA_GRUPO_ARROZ);
        expect(grupo.total).toBe(13);      // 6 + 2 + 5
        expect(grupo.cuantos).toBe(3);
        expect(grupo.unit).toBe('taza(s)');
    });

    it('los arroces quedan debajo, como desglose', () => {
        expect(filas.filter(f => f.tipo === 'hijo').map(f => f.item.name))
            .toEqual(['Arroz blanco', 'Arroz frito', 'Arroz jardinero']);
    });

    it('el grupo aparece donde estaba el primer arroz', () => {
        expect(filas[0].item.name).toBe('Pollo al ajillo');
        expect(filas[1].tipo).toBe('grupo');
        expect(filas[2].item.name).toBe('Arroz blanco');
    });

    it('lo que no es arroz no se toca', () => {
        expect(filas.filter(f => f.tipo === 'suelto').map(f => f.item.name))
            .toEqual(['Pollo al ajillo', 'Vegetales mixtos']);
    });

    it('ningun renglon se pierde ni se repite', () => {
        const nombres = filas.filter(f => f.tipo !== 'grupo').map(f => f.item.name);
        expect(nombres).toHaveLength(items.length);
        expect(new Set(nombres).size).toBe(items.length);
    });
});

describe('cuando no hay que agrupar', () => {
    it('un solo arroz no lleva cabecera: seria un titulo con una linea', () => {
        const filas = agruparArroces([arroz('Arroz blanco', 6), { name: 'Pollo', qty: 1, unit: 'g' }]);
        expect(filas.every(f => f.tipo === 'suelto')).toBe(true);
    });

    it('no suma tazas con gramos', () => {
        const filas = agruparArroces([
            arroz('Arroz blanco', 6),
            { name: 'Arroz con leche', qty: 500, unit: 'g' }
        ]);
        expect(filas.every(f => f.tipo === 'suelto')).toBe(true);
    });

    it('una lista vacia no rompe nada', () => {
        expect(agruparArroces([])).toEqual([]);
        expect(agruparArroces(null)).toEqual([]);
    });
});

describe('que cuenta como arroz', () => {
    it('reconoce los arroces', () => {
        expect(esArroz('Arroz blanco')).toBe(true);
        expect(esArroz('Arroz estilo cantones')).toBe(true);
        expect(esArroz('  arroz jardinero ')).toBe(true);
    });
    it('no agarra lo que solo lo menciona', () => {
        expect(esArroz('Pollo con arroz')).toBe(false);
        expect(esArroz('Arrocito')).toBe(false);
        expect(esArroz('')).toBe(false);
    });
});

/**
 * En el menú el arroz viene escrito de las dos formas. "Arros con maiz dulce"
 * —con S— es como lo manda Gina cada semana, y por esa letra se quedaba fuera
 * de la olla común: 12 tazas del sábado cocinándose aparte cuando todos los
 * arroces salen del mismo arroz blanco.
 */
describe('el arroz escrito con S es el mismo arroz', () => {
    it('"Arros" entra a la familia igual que "Arroz"', () => {
        expect(esArroz('Arros con maiz dulce')).toBe(true);
        expect(esArroz('Arroz con maíz dulce')).toBe(true);
        expect(esArroz('Arroz blanco')).toBe(true);
        expect(esArroz('Arroz con pollo')).toBe(true);
    });

    it('no se lleva por delante lo que solo empieza parecido', () => {
        expect(esArroz('Arrocito')).toBe(false);
        expect(esArroz('Arrosito')).toBe(false);
        expect(esArroz('Ensalada de arroz')).toBe(false);
    });

    it('los dos se juntan en una sola olla', () => {
        const items = [
            { name: 'Arros con maiz dulce', unit: 'taza(s)', totalQty: 12 },
            { name: 'Arroz blanco', unit: 'taza(s)', totalQty: 2 },
            { name: 'Arroz con maíz dulce', unit: 'taza(s)', totalQty: 2 }
        ];
        const filas = agruparArroces(items, (i) => i.totalQty);
        const grupo = filas.find(f => f.tipo === 'grupo');
        expect(grupo).toBeDefined();
        expect(grupo.total).toBe(16);
        expect(filas.filter(f => f.tipo === 'hijo')).toHaveLength(3);
        expect(filas.filter(f => f.tipo === 'suelto')).toHaveLength(0);
    });
});
