import { describe, it, expect } from 'vitest';
import { filterNoteForDish } from '../utils/productionHelpers';

describe('Dish Note Filtering Verification (Fix for Target Dish Matching)', () => {

    it('keeps Cambiar Almuercitos rellenos... por cochinita pibil ON Plato 1 (Almuercitos rellenos)', () => {
        const obs = 'Cambiar Almuercitos rellenos con carne molida por cochinita pibil · Lleva cena';
        const plato1 = { proteina: 'Almuercitos rellenos con carne molida' };
        const plato2 = { proteina: 'Cochinita pibil' };
        const plato3 = { proteina: 'Fajitas de pollo en salsa de naranja' };
        const allDishes = [plato1, plato2, plato3];

        const noteOnPlato1 = filterNoteForDish(obs, plato1, allDishes);
        expect(noteOnPlato1).toBe('Cambiar Almuercitos rellenos con carne molida por cochinita pibil · Lleva cena');
    });

    it('omits Cambiar Almuercitos rellenos... ON Plato 3 (Fajitas de pollo)', () => {
        const obs = 'Cambiar Almuercitos rellenos con carne molida por cochinita pibil · Lleva cena';
        const plato1 = { proteina: 'Almuercitos rellenos con carne molida' };
        const plato2 = { proteina: 'Cochinita pibil' };
        const plato3 = { proteina: 'Fajitas de pollo en salsa de naranja' };
        const allDishes = [plato1, plato2, plato3];

        const noteOnPlato3 = filterNoteForDish(obs, plato3, allDishes);
        expect(noteOnPlato3).toBe('Lleva cena');
    });
});
