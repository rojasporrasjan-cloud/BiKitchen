/**
 * El autocompletar de platos: escribir "tilapia" y ver todas las tilapias.
 */

import { describe, it, expect } from 'vitest';
import { catalogoDePlatos, buscarPlatos, nombreSinMedida } from '../utils/catalogoDePlatos';

const MENUS = {
    proteinasDisponibles: ['Tilapia empanizada', 'Pollo caribeño', 'Filet de pollo con salsa criolla de tomate'],
    bajoCalorias: [
        { numero: 1, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales al vapor', carbo: 'Arroz blanco' }
    ],
    keto: [{ numero: 1, proteina: 'Salmón con mantequilla', vegetal: 'Coliflor rostizada', carbo: '—' }],
    familiarPremium: [{ numero: 3, proteina: 'Pollo en salsa cremosa de paprika(500 g)', vegetal: '', carbo: '' }],
    cena: { fullPack: [{ numero: 1, proteina: 'Tilapia en salsa de coco', vegetal: 'Ensalada fresca', carbo: 'Puré de papa' }] },
    meta: { lastModifiedTimestamp: 1 }
};

describe('catalogoDePlatos', () => {

    const catalogo = catalogoDePlatos({
        menus: MENUS,
        individuales: [{ nombre: 'Filet de Tilapia' }, { nombre: 'PRUEBA PRODUCCIÓN (₡100)' }],
        pedidos: [{ items: [{ proteinas: ['tilapia empanizada', 'Fajitas de cerdo encebolladas'] }] }]
    });

    it('junta la lista de la semana, el menú, las cenas, los individuales y lo ya escrito', () => {
        expect(catalogo).toEqual(expect.arrayContaining([
            'Tilapia empanizada', 'Filet de tilapia al ajillo', 'Tilapia en salsa de coco',
            'Filet de Tilapia', 'Fajitas de cerdo encebolladas', 'Coliflor rostizada'
        ]));
    });

    it('la lista de la semana va primero y manda cómo queda escrito', () => {
        expect(catalogo[0]).toBe('Tilapia empanizada');
        expect(catalogo.filter(n => n.toLowerCase() === 'tilapia empanizada')).toHaveLength(1);
    });

    it('quita la medida del nombre, las casillas vacías y el producto de prueba', () => {
        expect(catalogo).toContain('Pollo en salsa cremosa de paprika');
        expect(catalogo).not.toContain('—');
        expect(catalogo.some(n => /prueba/i.test(n))).toBe(false);
    });

    it('sin menú cargado no rompe', () => {
        expect(catalogoDePlatos()).toEqual([]);
        expect(catalogoDePlatos({ menus: null, pedidos: [null, {}] })).toEqual([]);
    });
});

describe('buscarPlatos', () => {
    const catalogo = catalogoDePlatos({ menus: MENUS, individuales: [{ nombre: 'Filet de Tilapia' }] });

    it('"tilapia" trae TODAS las tilapias, las que empiezan así primero', () => {
        const r = buscarPlatos(catalogo, 'tilapia');
        expect(r.slice(0, 2)).toEqual(['Tilapia empanizada', 'Tilapia en salsa de coco']);
        expect(r).toEqual(expect.arrayContaining(['Filet de tilapia al ajillo', 'Filet de Tilapia']));
        expect(r.every(n => /tilapia/i.test(n))).toBe(true);
    });

    it('no le importan las tildes ni el orden de las palabras', () => {
        expect(buscarPlatos(catalogo, 'caribeno')).toEqual(['Pollo caribeño']);
        expect(buscarPlatos(catalogo, 'criolla pollo')).toEqual(['Filet de pollo con salsa criolla de tomate']);
    });

    it('sin nada escrito no sugiere nada', () => {
        expect(buscarPlatos(catalogo, '   ')).toEqual([]);
    });
});

describe('nombreSinMedida', () => {
    it('solo quita un paréntesis que es medida', () => {
        expect(nombreSinMedida('Carne mechada en salsa criolla (500 g)')).toBe('Carne mechada en salsa criolla');
        expect(nombreSinMedida('Yuca frita (4 porciones)')).toBe('Yuca frita');
        expect(nombreSinMedida('Pollo (sin piel)')).toBe('Pollo (sin piel)');
    });
});
