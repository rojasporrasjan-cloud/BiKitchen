import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils.js';

/**
 * "Two Pack" YA significa dos packs del mismo menu. Cuando el pedido ADEMAS
 * trae cantidad 2, esa es la cuenta escrita de otra forma — no dos cantidades
 * que se multipliquen.
 *
 * Paso de verdad: a Enid Murillo y a Ericka Anderson les salian 4 packs en la
 * hoja del 31 de agosto de 2026. La nota de Ericka lo dice sola: "TWO PACK
 * bajo calorias: 1 pack SIN PESCADO y 1 pack SIN CERDO" — son DOS.
 */
const pedido = (extra) => ({
    id: 'X', cliente: 'Prueba', fecha_entrega: '2026-09-02',
    plan: 'Pack Bajo Calorías', ...extra
});
const cant = (o) => mapPedidosFromLegacy([o])[0].cantidadMenus;

describe('Two Pack + cantidad declarada', () => {

    it('two pack sin cantidad explicita cuenta 2', () => {
        expect(cant(pedido({ items: [{ nombre: 'Pack', categoryLabel: 'Two Pack', cantidad: 1 }] }))).toBe(2);
    });

    it('two pack con cantidad 2 cuenta 2, no 4', () => {
        expect(cant(pedido({ items: [{ nombre: 'Pack', categoryLabel: 'Two Pack', cantidad: 2 }] }))).toBe(2);
    });

    it('two pack detectado por observaciones con cantidad 2 cuenta 2', () => {
        expect(cant(pedido({
            observaciones: 'TWO PACK bajo calorías: 1 pack SIN PESCADO y 1 pack SIN CERDO',
            items: [{ nombre: 'Pack Bajo Calorías', cantidad: 2 }]
        }))).toBe(2);
    });

    it('two pack con cantidad 3 respeta el 3', () => {
        expect(cant(pedido({ items: [{ nombre: 'Two Pack', cantidad: 3 }] }))).toBe(3);
    });

    it('two pack con cantidadMenus 2 guardado cuenta 2, no 4', () => {
        expect(cant(pedido({ cantidadMenus: 2, items: [{ nombre: 'Two Pack', cantidad: 1 }] }))).toBe(2);
    });

    it('un pack normal con cantidad 1 sigue en 1', () => {
        expect(cant(pedido({ items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1 }] }))).toBe(1);
    });

    it('un pack normal NO se duplica aunque diga cantidad 2', () => {
        // los packs multiples se resuelven en cantidadDePacks, no aca
        expect(cant(pedido({ cantidadMenus: 3, items: [{ nombre: 'Pack Regular', cantidad: 3 }] }))).toBe(3);
    });
});
