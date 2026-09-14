/**
 * Familias que la cocina dejó hechas ENTERAS.
 *
 * "Hicieron todo el pack bajo calorías y el pack bajo calorías cena, o sea 1er
 * y 2do menú" (Jan, 11 de setiembre de 2026). Eso no es un sobrante suelto de un
 * plato: es una familia completa que no hay que volver a cocinar.
 *
 * Lo que NUNCA puede pasar: que esos packs salgan también del empaque. La comida
 * existe, pero no está en las bolsas — sacarlos del empaque dejaría a esos
 * clientes sin pedido.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    alternarFamilia,
    leerFamiliasCocinadas,
    guardarFamiliasCocinadas,
    NOMBRE_DE_FAMILIA
} from '../utils/familiasYaCocinadas';
import { mapPackNameToMenuKey } from '../utils/packClassification';

describe('alternarFamilia', () => {

    it('marca y desmarca', () => {
        let lista = alternarFamilia([], 'bajoCalorias');
        expect(lista).toEqual(['bajoCalorias']);

        // Desmarcar hace falta: si se marcó por error hay que poder volver
        lista = alternarFamilia(lista, 'bajoCalorias');
        expect(lista).toEqual([]);
    });

    it('aguanta varias familias', () => {
        let lista = alternarFamilia([], 'bajoCalorias');
        lista = alternarFamilia(lista, 'keto');
        expect(lista).toEqual(['bajoCalorias', 'keto']);
    });

    it('una clave vacía no ensucia la lista', () => {
        expect(alternarFamilia(['keto'], '')).toEqual(['keto']);
        expect(alternarFamilia(['keto'], null)).toEqual(['keto']);
    });
});

describe('el filtro de la cocina', () => {

    // El mismo que usa la hoja
    const sinLasCocinadas = (pedidos, cocinadas) => pedidos.filter(p =>
        !cocinadas.includes(mapPackNameToMenuKey(p.plan)));

    const pedidos = [
        { cliente: 'Ana', plan: 'Pack Bajo Calorías' },
        { cliente: 'Beto', plan: 'Pack Bajo Calorías Mensual' },
        { cliente: 'Ceci', plan: 'Pack Keto' },
        { cliente: 'Dani', plan: 'Pack Sin Carbos' }
    ];

    it('saca toda la familia marcada, no solo un pedido', () => {
        const quedan = sinLasCocinadas(pedidos, ['bajoCalorias']);
        expect(quedan.map(p => p.cliente)).toEqual(['Ceci', 'Dani']);
    });

    it('sin nada marcado no saca a nadie', () => {
        expect(sinLasCocinadas(pedidos, [])).toHaveLength(4);
    });

    it('marcar una familia no toca a las otras', () => {
        const quedan = sinLasCocinadas(pedidos, ['keto']);
        expect(quedan.map(p => p.cliente)).toEqual(['Ana', 'Beto', 'Dani']);
    });

    it('el bajo calorías de cena cae en la misma familia', () => {
        // "1er y 2do menú" son la misma familia: se marcan de una
        expect(mapPackNameToMenuKey('CENAS - Pack Bajo Calorías')).toBe('bajoCalorias');
    });
});

describe('los nombres que se leen en la hoja', () => {
    it('cada familia tiene su nombre', () => {
        expect(NOMBRE_DE_FAMILIA.bajoCalorias).toBe('Pack Bajo en Calorías');
        expect(NOMBRE_DE_FAMILIA.familiarDeluxe).toBe('Paquete Deluxe');
        expect(NOMBRE_DE_FAMILIA.familiarPremium).toBe('Paquete Premium');
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
        guardarFamiliasCocinadas(['bajoCalorias']);
        expect(leerFamiliasCocinadas()).toEqual(['bajoCalorias']);
    });

    it('un dato corrupto no rompe', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: () => 'no es json', setItem: () => {} }
        });
        expect(leerFamiliasCocinadas()).toEqual([]);
    });

    it('si el navegador no deja guardar, la hoja sigue', () => {
        vi.stubGlobal('window', {
            localStorage: {
                getItem: () => null,
                setItem: () => { throw new Error('modo privado'); }
            }
        });
        expect(() => guardarFamiliasCocinadas(['keto'])).not.toThrow();
    });
});
