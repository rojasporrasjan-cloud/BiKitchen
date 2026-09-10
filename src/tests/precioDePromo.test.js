import { describe, it, expect } from 'vitest';
import { precioDePromo } from '../utils/precioDePromo.js';

/**
 * Se vendio un Pack Mensual Bajo Calorias en CERO colones. El pedido de Daniel
 * Milanes entro por la web con el pack a ₡0 y un total de ₡6.000 —solo el
 * envio— porque el precio no se resolvio y nadie lo detuvo.
 */
describe('el precio de un pack dentro de una promo', () => {

    it('lo saca de la lista por pack', () => {
        const promo = { precios: [
            { nombre: 'Pack Sin Carbos', precio: 89900 },
            { nombre: 'Pack Bajo Calorías', precio: 99500 }
        ] };
        expect(precioDePromo(promo, 'Pack Bajo Calorías')).toBe(99500);
    });

    it('CON LA LISTA VACIA cae al precio suelto de la promo', () => {
        // El caso de Daniel Milanes: `precios: []` es truthy, asi que el codigo
        // se metia en esa rama, no encontraba nada y devolvia 0 sin mirar
        // `promo.precio`, que tenia los 77.500.
        const promo = { precios: [], precio: 77500 };
        expect(precioDePromo(promo, 'Pack Bajo Calorías')).toBe(77500);
    });

    it('si el pack no esta en la lista, tambien cae al precio suelto', () => {
        const promo = { precios: [{ nombre: 'Pack Sin Carbos', precio: 89900 }], precio: 77500 };
        expect(precioDePromo(promo, 'Pack Vegetariano')).toBe(77500);
    });

    it('lee tambien la forma vieja, en detalles.packs', () => {
        const promo = { detalles: { packs: [{ nombre: 'Full Pack', precio: 135600 }] } };
        expect(precioDePromo(promo, 'Full Pack')).toBe(135600);
    });

    it('devuelve NULL cuando no hay precio en ningun lado', () => {
        // null es "no se sabe". Vender eso como 0 es regalar la comida.
        expect(precioDePromo({ precios: [], precio: 0 }, 'Two Pack')).toBeNull();
        expect(precioDePromo({ precios: [{ nombre: 'Otro', precio: 100 }] }, 'Two Pack')).toBeNull();
        expect(precioDePromo(null, 'X')).toBeNull();
    });

    it('un precio en cero NO cuenta como precio', () => {
        expect(precioDePromo({ precios: [{ nombre: 'Pack X', precio: 0 }], precio: 0 }, 'Pack X')).toBeNull();
    });

    it('calza aunque el nombre venga mas largo o mas corto', () => {
        const promo = { precios: [{ nombre: 'Pack Bajo Calorías Mensual', precio: 99500 }] };
        expect(precioDePromo(promo, 'Pack Bajo Calorías')).toBe(99500);
    });
});
