import { describe, it, expect } from 'vitest';
import { conMargen, MARGEN_COCINA } from '../utils/productionHelpers';

describe('Cenas Kitchen Bulk Math Verification (+30% Merma)', () => {

    it('applies 30% merma correctly for Cenas protein grammage', () => {
        const baseGrams = 120 * 6; // 6 packs of 120g = 720g
        const totalCookGrams = conMargen(baseGrams);

        // 720 * 1.30 = 936g
        expect(totalCookGrams).toBe(936);
        expect(MARGEN_COCINA).toBe(1.30);
    });

    it('sums Almuerzos and Cenas grams when dish appears in both menus', () => {
        const almuerzoGrams = 120 * 6; // 720g
        const cenaGrams = 120 * 6;     // 720g
        const totalBaseGrams = almuerzoGrams + cenaGrams; // 1440g
        const totalCookGrams = conMargen(totalBaseGrams);

        // 1440 * 1.30 = 1872g
        expect(totalCookGrams).toBe(1872);
    });
});
