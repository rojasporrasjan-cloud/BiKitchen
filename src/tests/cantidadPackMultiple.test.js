/**
 * Un cliente que compra VARIOS packs del mismo tipo.
 *
 * Dalia Parrales pidió "3x PACK MENSUAL BAJO CALORIAS" y pagó ₡232.500
 * (3 × ₡77.500). La hoja contaba un solo pack: recibía la tercera parte de lo
 * que compró, y eso no se nota hasta que reclama.
 *
 * La cantidad vive en dos sitios distintos según por dónde entró el pedido, y
 * ahí estaba la trampa: la hoja de empaque solo miraba uno de los dos.
 */

import { describe, it, expect } from 'vitest';
import { cantidadDePacks } from '../utils/productionHelpers';

const clienteConItem = (cantidad) => ({
    cliente: 'Dalia Parrales',
    cantidadMenus: 1,
    rawPedido: {
        items: [{ nombre: 'PACK MENSUAL BAJO CALORIAS 77.500 colones', cantidad, precio: 77500 }]
    }
});

describe('cantidadDePacks', () => {

    it('tres packs se cuentan como tres, no como uno', () => {
        expect(cantidadDePacks(clienteConItem(3))).toBe(3);
    });

    it('un solo pack sigue contando uno', () => {
        expect(cantidadDePacks(clienteConItem(1))).toBe(1);
    });

    it('toma cantidadMenus cuando el pedido sí lo trae', () => {
        // Los Two Pack llegan con cantidadMenus ya duplicado
        expect(cantidadDePacks({ cantidadMenus: 2, rawPedido: { items: [{ cantidad: 1 }] } })).toBe(2);
    });

    it('toma el mayor, no la suma: son el mismo dato escrito de dos formas', () => {
        // Si sumara, este cliente recibiría 5 packs en vez de 3
        expect(cantidadDePacks({ cantidadMenus: 2, rawPedido: { items: [{ cantidad: 3 }] } })).toBe(3);
    });

    it('sin datos, cuenta uno', () => {
        expect(cantidadDePacks({})).toBe(1);
        expect(cantidadDePacks(null)).toBe(1);
        expect(cantidadDePacks({ cantidadMenus: 0, rawPedido: { items: [] } })).toBe(1);
    });

    it('aguanta cantidades escritas como texto', () => {
        expect(cantidadDePacks({ cantidadMenus: 1, rawPedido: { items: [{ cantidad: '3' }] } })).toBe(3);
    });

    it('ignora una cantidad inválida en vez de reventar', () => {
        expect(cantidadDePacks({ cantidadMenus: 2, rawPedido: { items: [{ cantidad: 'tres' }] } })).toBe(2);
    });
});
