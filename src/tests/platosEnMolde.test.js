/**
 * Los individuales que van en molde desechable.
 *
 * Lasagnas, pasteles, flautas y canelones: el envase ES la medida. No se piden
 * 250 g de lasaña, se pide UNA lasaña en su molde.
 *
 * Sin esta regla el parser los adivinaba mal: "Lasagna de pollo" tiene la
 * palabra "pollo", caía en la regla de las proteínas y salía como 250 g. Quien
 * empaca leía "250 g de lasaña", que no significa nada.
 */

import { describe, it, expect } from 'vitest';
import { vaEnMolde, parseQuantityAndUnit, textoDeCantidad } from '../utils/granelKitchen';

describe('vaEnMolde', () => {

    it('reconoce los cuatro', () => {
        expect(vaEnMolde('Lasagna de pollo')).toBe(true);
        expect(vaEnMolde('Lasaña de carne')).toBe(true);
        expect(vaEnMolde('Pastel de carne')).toBe(true);
        expect(vaEnMolde('Flautas de queso')).toBe(true);
        expect(vaEnMolde('Canelones rellenos con pollo')).toBe(true);
    });

    it('no se lleva por delante lo que no es molde', () => {
        expect(vaEnMolde('Pollo al ajillo')).toBe(false);
        expect(vaEnMolde('Carne mechada')).toBe(false);
        expect(vaEnMolde('Arroz con pollo')).toBe(false);
    });

    it('un nombre vacío no rompe', () => {
        expect(vaEnMolde('')).toBe(false);
        expect(vaEnMolde(null)).toBe(false);
    });
});

describe('la medida de un plato de molde', () => {

    it('la lasaña sale en moldes, no en gramos', () => {
        // Tiene "pollo" en el nombre: antes salía 250 g
        const r = parseQuantityAndUnit('Lasagna de pollo', '', 1, null);
        expect(r.unit).toBe('molde');
        expect(r.totalQty).toBe(1);
    });

    it('varias se cuentan', () => {
        const r = parseQuantityAndUnit('Canelones rellenos con queso', '', 3, null);
        expect(r.totalQty).toBe(3);
    });

    it('se lee para quien empaca, no como "1 unidad"', () => {
        // "1 unidad" no le dice a nadie cuál envase ir a buscar
        expect(textoDeCantidad('Lasagna de pollo', '', 1, 0)).toBe('1 molde desechable');
        expect(textoDeCantidad('Lasagna de pollo', '', 2, 0)).toBe('2 moldes desechables');
    });

    it('LA MEDIDA ESCRITA MANDA sobre la regla del molde', () => {
        // Si Gina escribió los gramos, es porque ese día va así
        expect(parseQuantityAndUnit('Lasagna de pollo', '500 g', 1, null).unit).toBe('g');
        expect(textoDeCantidad('Pastel de carne', '4 tazas', 1, 0)).toBe('4 tazas');
    });
});

describe('los desayunos que se llaman igual NO se vuelven molde', () => {

    it('un desayuno con su medida escrita se respeta', () => {
        // "Flautas de queso con salsa ranchera" es un desayuno y se cuenta por
        // unidad. La medida escrita gana antes de llegar a la regla del molde.
        expect(textoDeCantidad('Flautas con queso en salsa roja', '1 unidad', 1, 0))
            .toBe('1 unidad');
        expect(textoDeCantidad('Pastel de tortilla con frijol y queso', '2 unidades', 1, 0))
            .toBe('2 unidades');
    });

    it('el singular "1 unidad" se lee igual que el plural', () => {
        // Antes solo se leía "unidades": el singular se perdía y pasaba de
        // casualidad porque el valor por defecto también era 'unidades'.
        expect(parseQuantityAndUnit('Lo que sea', '1 unidad', 1, null).unit).toBe('unidades');
        expect(parseQuantityAndUnit('Lo que sea', '6 unidades', 1, null).totalQty).toBe(6);
    });
});

describe('los paquetes familiares se cuentan por ENVASE', () => {

    it('"1 molde" se lee como medida escrita', () => {
        // Sin esto, "Arroz con carne de cerdo" caía en la regla de las
        // proteínas por la palabra "carne" y salía 250 g
        const r = parseQuantityAndUnit('Arroz con carne de cerdo', '1 molde', 1, null);
        expect(r.unit).toBe('molde');
        expect(r.totalQty).toBe(1);
    });

    it('tres paquetes son tres envases de cada plato, no el triple de tazas', () => {
        // "No las vamos a contar, lo dejamos como moldes, ellos lo empacan ya
        // que saben" (Jan). La cocina necesita saber CUÁNTOS armar.
        expect(textoDeCantidad('Arroz con carne de cerdo', '1 molde', 3, 0))
            .toBe('3 moldes desechables');
        expect(textoDeCantidad('Carne de res en salsa', '1 molde', 3, 0))
            .toBe('3 moldes desechables');
    });

    it('ningún plato del familiar se vuelve gramos ni tazas', () => {
        const platos = [
            'Lentejas con pollo', 'Fajitas de cerdo en salsa BBQ', 'Barbudos',
            'Ensalada coleslaw', 'Chili con carne', 'Yuca frita', 'Ensalada de papa'
        ];
        platos.forEach(nombre => {
            expect(parseQuantityAndUnit(nombre, '1 molde', 2, null).unit).toBe('molde');
        });
    });

    it('el plural se lee igual', () => {
        expect(parseQuantityAndUnit('Lo que sea', '2 moldes', 1, null).totalQty).toBe(2);
    });
});
