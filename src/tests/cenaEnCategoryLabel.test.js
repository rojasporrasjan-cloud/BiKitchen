import { describe, it, expect } from 'vitest';
import { esPromoCena } from '../utils/labels/labelDomain';

/**
 * "Almuerzo y Cena" viene en el categoryLabel DEL ITEM.
 *
 * El checkout de la web guarda el plan como "Full Pack" a secas y mete
 * "Almuerzo y Cena" en el `categoryLabel` del item. `esPromoCena` miraba el
 * categoryLabel del PEDIDO pero no el del ITEM, asi que esos pedidos salian en
 * la hoja con los almuerzos y sin ninguna cena.
 *
 * Lo agarramos el 7 de setiembre de 2026 revisando la hoja del miercoles 9:
 * Diego Andres Flores paga ₡223.960 por un Full Pack mensual de almuerzo y cena
 * —le quedaban tres entregas— y la hoja le ponia 5 almuerzos y 0 cenas.
 */
describe('cena declarada en el categoryLabel del item', () => {
    it('el Full Pack de almuerzo y cena de la web lleva cenas', () => {
        expect(esPromoCena({
            plan: 'Full Pack',
            items: [{ nombre: 'Full Pack', planLabel: 'Mensual', categoryLabel: 'Almuerzo y Cena' }]
        })).toBe(true);
    });

    it('el casadito con desayuno, almuerzo y cena también', () => {
        expect(esPromoCena({
            plan: 'Pack Casaditos',
            items: [
                { nombre: 'Pack Casaditos', categoryLabel: 'Desayuno' },
                { nombre: 'Pack Casaditos', categoryLabel: 'Almuerzo y Cena' }
            ]
        })).toBe(true);
    });

    it('un Two Pack que NO dice cena sigue sin llevarla', () => {
        expect(esPromoCena({
            plan: 'Pack Regular',
            items: [{ nombre: 'Pack Regular', planLabel: 'Semanal', categoryLabel: 'Two Pack' }]
        })).toBe(false);
    });

    it('un pack de almuerzos normal sigue sin llevar cena', () => {
        expect(esPromoCena({
            plan: 'Pack Bajo Calorías',
            items: [{ nombre: 'Pack Bajo Calorías', planLabel: 'Mensual', categoryLabel: 'Almuerzo' }]
        })).toBe(false);
    });

    it('lo que ya funcionaba por el plan no cambia', () => {
        expect(esPromoCena({ plan: 'Pack Quincenal Almuerzo y Cena con Regalía de Desayunos' })).toBe(true);
        expect(esPromoCena({ plan: '🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Sin Carbos' })).toBe(true);
        expect(esPromoCena({ plan: 'Pack Mensual Bajo Calorías' })).toBe(false);
    });

    it('sin items no revienta', () => {
        expect(esPromoCena({ plan: 'Pack Regular' })).toBe(false);
        expect(esPromoCena({})).toBe(false);
    });
});
