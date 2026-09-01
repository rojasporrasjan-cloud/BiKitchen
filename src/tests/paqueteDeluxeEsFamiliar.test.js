import { describe, it, expect } from 'vitest';
import { mapPackNameToMenuKey, getDefaultGrams } from '../utils/packClassification';

/**
 * "Paquete Deluxe" es el nombre VISIBLE del Pack Familiar Deluxe.
 *
 * En packsData.js:
 *     'Pack Familiar Deluxe': { nombre: 'Paquete Deluxe', ... }
 *
 * El checkout guarda ese nombre visible en `plan`, y ahi se pierde la palabra
 * "Familiar". La regla "deluxe SIN familiar -> fullPack" lo mandaba al Full
 * Pack: 5 platos individuales de 150 g en vez de los 7 platos para 4 personas
 * que pago.
 *
 * Le paso a 11 pedidos, 9 de ellos ya entregados. Rebeca Toval (₡178.000, los
 * miercoles de setiembre) y Maria Cristina Molina (₡177.000, lunes 31 de
 * agosto) todavia estaban por cocinarse cuando se encontro.
 *
 * OJO: "Pack Deluxe" a secas NO entra — existe un pedido asi con categoria
 * Individuales, que es otro producto.
 */
describe('Paquete Deluxe es el Familiar Deluxe', () => {

    it('manda al menu familiar deluxe, no al full pack', () => {
        expect(mapPackNameToMenuKey('Paquete Deluxe')).toBe('familiarDeluxe');
    });

    it('funciona con el nombre completo del item', () => {
        expect(mapPackNameToMenuKey('Pack Familiar - Paquete Deluxe (Mensual)')).toBe('familiarDeluxe');
        expect(mapPackNameToMenuKey('Pack Familiar Deluxe')).toBe('familiarDeluxe');
    });

    it('no se confunde con mayusculas ni acentos', () => {
        expect(mapPackNameToMenuKey('PAQUETE DELUXE')).toBe('familiarDeluxe');
    });

    // --- lo que NO debe cambiar ---

    it('"Pack Deluxe" a secas sigue yendo al full pack', () => {
        expect(mapPackNameToMenuKey('Pack Deluxe')).toBe('fullPack');
    });

    it('el Full Pack de verdad sigue igual', () => {
        expect(mapPackNameToMenuKey('Full Pack')).toBe('fullPack');
        expect(getDefaultGrams('Full Pack')).toBe(150);
    });

    it('el Familiar Premium sigue igual', () => {
        expect(mapPackNameToMenuKey('Pack Familiar')).toBe('familiarPremium');
        expect(mapPackNameToMenuKey('Pack Familiar Premium')).toBe('familiarPremium');
    });
});
