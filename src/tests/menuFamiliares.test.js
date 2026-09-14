/**
 * El menú de los paquetes Deluxe y Premium, tal como lo pasó Jan el 11 de
 * setiembre de 2026.
 *
 * No son un menú de proteína + vegetal + harina como los demás: son una lista de
 * platos, cada uno con SU medida y SU envase. Antes la medida se metía dentro
 * del campo `vegetal` —un parche— y la instrucción de empaque no tenía dónde
 * vivir, así que a la cocina le llegaba el plato sin decir en qué mandarlo.
 *
 * Este archivo fija el menú: si alguien lo cambia, tiene que ser a propósito.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_MENUS } from '../utils/firestoreMenus';
import { mapPackNameToMenuKey } from '../utils/packClassification';

describe('Paquete Premium', () => {
    const menu = DEFAULT_MENUS.familiarPremium;

    it('lleva los seis platos', () => {
        expect(menu.map(p => p.proteina)).toEqual([
            'Lentejas con pollo',
            'Fajitas de cerdo en salsa BBQ',
            'Spaguettis con carne en salsa pomodoro',
            'Pollo mechado en salsa criolla',
            'Barbudos',
            'Ensalada coleslaw'
        ]);
    });

    it('cada plato dice cuánto lleva', () => {
        expect(menu.map(p => p.medida)).toEqual([
            '4 tazas', '500 g', '4 tazas', '500 g', '8 unidades', '4 tazas'
        ]);
    });

    it('los de 500 g se empacan distinto que los de taza de kg', () => {
        const bbq = menu.find(p => /BBQ/.test(p.proteina));
        const lentejas = menu.find(p => /Lentejas/.test(p.proteina));

        expect(bbq.empaque).toBe('Empacar en taza de 500 g');
        expect(lentejas.empaque).toBe('Empacar en taza de kg');
    });
});

describe('Paquete Deluxe', () => {
    const menu = DEFAULT_MENUS.familiarDeluxe;

    it('lleva los siete platos', () => {
        expect(menu.map(p => p.proteina)).toEqual([
            'Lasagna de pollo',
            'Arroz con carne de cerdo',
            'Carne de res en salsa',
            'Chili con carne',
            'Ensalada de papa',
            'Picadillo de vainica con carne molida',
            'Yuca frita'
        ]);
    });

    it('la lasagna va en molde desechable, no en taza', () => {
        // Es el único que no se sirve a peso ni a taza
        const lasagna = menu[0];
        expect(lasagna.medida).toBe('1 molde');
        expect(lasagna.empaque).toMatch(/molde desechable/i);
    });

    it('la carne de res es la única de 500 g', () => {
        const deQuinientos = menu.filter(p => p.medida === '500 g');
        expect(deQuinientos.map(p => p.proteina)).toEqual(['Carne de res en salsa']);
    });

    it('la yuca frita no trae instrucción de empaque', () => {
        // Jan no la pasó. Vacía y no inventada: si hiciera falta, se agrega.
        expect(menu[6].proteina).toBe('Yuca frita');
        expect(menu[6].empaque).toBe('');
    });
});

describe('los dos familiares', () => {
    const familiares = [...DEFAULT_MENUS.familiarPremium, ...DEFAULT_MENUS.familiarDeluxe];

    it('todos los platos traen nombre y medida', () => {
        familiares.forEach(p => {
            expect(p.proteina).toBeTruthy();
            expect(p.medida).toBeTruthy();
        });
    });

    it('van numerados de corrido', () => {
        expect(DEFAULT_MENUS.familiarPremium.map(p => p.numero)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(DEFAULT_MENUS.familiarDeluxe.map(p => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('`vegetal` sigue trayendo la medida, para lo que la lee de ahí', () => {
        // El campo bueno es `medida`. Este se mantiene para no romper lo viejo.
        familiares.forEach(p => expect(p.vegetal).toBe(p.medida));
    });
});

describe('los nombres con que se piden', () => {

    it('reconoce como los nombra el checkout', () => {
        expect(mapPackNameToMenuKey('Paquete Deluxe')).toBe('familiarDeluxe');
        expect(mapPackNameToMenuKey('Pack Familiar')).toBe('familiarPremium');
    });

    it('reconoce como los nombran Jan y Gina', () => {
        // Desde que se pueden agregar clientes a mano desde la hoja, alguien
        // los va a escribir con el nombre que usan ellos
        expect(mapPackNameToMenuKey('Paquete Premium')).toBe('familiarPremium');
        expect(mapPackNameToMenuKey('PAQUETE PREMIUM')).toBe('familiarPremium');
        expect(mapPackNameToMenuKey('Pack Familiar Deluxe')).toBe('familiarDeluxe');
        expect(mapPackNameToMenuKey('Pack Familiar Premium')).toBe('familiarPremium');
    });

    it('"Pack Deluxe" a secas sigue siendo otro producto', () => {
        // Hay un pedido asi con categoria Individuales
        expect(mapPackNameToMenuKey('Pack Deluxe')).not.toBe('familiarDeluxe');
    });
});
