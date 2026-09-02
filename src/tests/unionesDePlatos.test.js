/**
 * Las carnes mechadas del 29 de agosto: tres renglones, una sola olla.
 *
 * El emparejador automático no las junta a propósito —"Carne mechada en salsa"
 * calza igual con "de res en salsa" que con "en salsa criolla", y elegir mal es
 * peor que dejarlas separadas—. Esto guarda lo que decidió quien cocina.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    destinosDeUnion,
    agregarUnion,
    quitarUnion,
    claveDeNombre,
    leerUniones,
    guardarUniones
} from '../utils/unionesDePlatos';

const MECHADAS = [
    'Carne mechada de res en salsa',
    'Carne mechada en salsa',
    'Carne mechada en salsa criolla'
];

describe('agregarUnion', () => {

    it('junta un grupo nuevo', () => {
        const uniones = agregarUnion([], MECHADAS);
        expect(uniones).toHaveLength(1);
        expect(uniones[0]).toEqual(MECHADAS);
    });

    it('si A es lo mismo que B, y B lo mismo que C, los tres van juntos', () => {
        let uniones = agregarUnion([], ['Carne mechada de res en salsa', 'Carne mechada en salsa']);
        uniones = agregarUnion(uniones, ['Carne mechada en salsa', 'Carne mechada en salsa criolla']);

        expect(uniones).toHaveLength(1);
        expect(uniones[0]).toHaveLength(3);
        expect(uniones[0]).toContain('Carne mechada en salsa criolla');
    });

    it('no mezcla grupos que no se tocan', () => {
        let uniones = agregarUnion([], MECHADAS);
        uniones = agregarUnion(uniones, ['Arroz blanco', 'Arroz cocido']);

        expect(uniones).toHaveLength(2);
    });

    it('un grupo de uno solo no es una unión', () => {
        expect(agregarUnion([], ['Carne mechada'])).toEqual([]);
        expect(agregarUnion([], [])).toEqual([]);
    });

    it('no repite el mismo nombre', () => {
        const uniones = agregarUnion([], ['Carne mechada', 'Carne mechada', 'Carne mechada en salsa']);
        expect(uniones[0]).toHaveLength(2);
    });
});

describe('destinosDeUnion', () => {

    it('todos los nombres del grupo apuntan al primero', () => {
        const destinos = destinosDeUnion(agregarUnion([], MECHADAS));

        MECHADAS.forEach(n => {
            expect(destinos.get(claveDeNombre(n))).toBe('Carne mechada de res en salsa');
        });
    });

    it('las mayúsculas y los espacios de más dan igual', () => {
        const destinos = destinosDeUnion([['Carne mechada de res en salsa', 'Carne mechada en salsa']]);
        expect(destinos.get(claveDeNombre('  CARNE   MECHADA EN SALSA '))).toBe('Carne mechada de res en salsa');
    });

    it('un plato que nadie unió no tiene destino', () => {
        const destinos = destinosDeUnion(agregarUnion([], MECHADAS));
        expect(destinos.get(claveDeNombre('Arroz blanco'))).toBeUndefined();
    });
});

describe('quitarUnion', () => {
    it('deshace el grupo que contiene ese nombre', () => {
        let uniones = agregarUnion([], MECHADAS);
        uniones = agregarUnion(uniones, ['Arroz blanco', 'Arroz cocido']);

        const quedan = quitarUnion(uniones, 'Carne mechada en salsa');
        expect(quedan).toHaveLength(1);
        expect(quedan[0]).toContain('Arroz blanco');
    });
});

describe('lo guardado sobrevive, y si se rompe no tumba la hoja', () => {

    beforeEach(() => {
        const guardado = {};
        vi.stubGlobal('window', {
            localStorage: {
                getItem: (k) => (k in guardado ? guardado[k] : null),
                setItem: (k, v) => { guardado[k] = v; }
            }
        });
    });

    it('lo que se guarda se vuelve a leer', () => {
        guardarUniones(agregarUnion([], MECHADAS));
        expect(leerUniones()[0]).toEqual(MECHADAS);
    });

    it('sin nada guardado, no hay uniones', () => {
        expect(leerUniones()).toEqual([]);
    });

    it('un dato corrupto no rompe: se arranca de cero', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: () => 'esto no es json', setItem: () => {} }
        });
        expect(leerUniones()).toEqual([]);
    });

    it('si el navegador no deja guardar, la hoja sigue', () => {
        vi.stubGlobal('window', {
            localStorage: {
                getItem: () => null,
                setItem: () => { throw new Error('modo privado'); }
            }
        });
        expect(() => guardarUniones([['a', 'b']])).not.toThrow();
    });
});
