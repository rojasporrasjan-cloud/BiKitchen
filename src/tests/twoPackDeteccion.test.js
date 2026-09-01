import { describe, it, expect } from 'vitest';
import { detectIsTwoPack, mapPedidosFromLegacy } from '../utils/logisticsUtils.js';

/**
 * Two Pack: la busqueda tiene que encontrarlo escriba Gina como escriba.
 *
 * El pedido llega de tres lugares distintos y cada uno lo escribe diferente:
 *  - checkout de la web  -> categoryLabel: "Two Pack"
 *  - Excel de Gina       -> observaciones: "TWO PACK, CON DESAYUNOS"
 *  - chat de WhatsApp    -> texto suelto en el nombre del item
 *
 * Si la busqueda falla, el pedido se cocina como UN pack y al cliente le llega
 * la mitad de lo que pago.
 */
describe('detectIsTwoPack — variantes reales de escritura', () => {

    it('lo encuentra en categoryLabel (checkout de la web)', () => {
        expect(detectIsTwoPack({ items: [{ categoryLabel: 'Two Pack' }] })).toBe(true);
    });

    it('lo encuentra escrito pegado: "TwoPack"', () => {
        expect(detectIsTwoPack({ plan: 'TwoPack Bajo Calorias' })).toBe(true);
    });

    it('lo encuentra con guion: "Two-Pack"', () => {
        expect(detectIsTwoPack({ plan: 'Two-Pack Regular' })).toBe(true);
    });

    it('lo encuentra en las observaciones (asi lo escribe Gina en el Excel)', () => {
        expect(detectIsTwoPack({
            plan: 'Pack Bajo Calorias',
            observaciones: 'TWO PACK, CON DESAYUNOS'
        })).toBe(true);
    });

    it('lo encuentra en observaciones aunque venga con otro texto pegado', () => {
        expect(detectIsTwoPack({
            plan: 'Full Pack',
            observaciones: 'FULL PACK TWO PACK'
        })).toBe(true);
    });

    it('lo encuentra en details.notes (pedidos viejos)', () => {
        expect(detectIsTwoPack({
            plan: 'Pack Regular',
            details: { notes: 'two pack, sin cerdo' }
        })).toBe(true);
    });

    it('lo encuentra en item.descripcion, no solo en item.desc', () => {
        expect(detectIsTwoPack({
            items: [{ nombre: 'Pack Keto', descripcion: 'Two Pack para parejas' }]
        })).toBe(true);
    });

    it('lo encuentra como "Plan Parejas" (nombre del catalogo)', () => {
        expect(detectIsTwoPack({ plan: 'Plan Parejas 10 Comidas' })).toBe(true);
    });

    // --- NEGATIVOS: esto NO es un Two Pack y no se debe duplicar ---

    it('NO confunde "2 pack de 3 proteinas" (son 2 unidades de individuales)', () => {
        expect(detectIsTwoPack({
            plan: 'Individuales',
            items: [{ nombre: '2 pack de 3 proteinas de 500 g', cantidad: 2 }]
        })).toBe(false);
    });

    it('NO confunde un pack normal', () => {
        expect(detectIsTwoPack({ plan: 'Pack Bajo Calorias', observaciones: 'NO CERDO' })).toBe(false);
    });

    it('duplica la cantidad cuando lo detecta por observaciones', () => {
        const [pedido] = mapPedidosFromLegacy([{
            id: 'ORD-TEST-OBS',
            cliente: 'Prueba Observaciones',
            plan: 'Pack Bajo Calorias',
            fecha_entrega: '2026-09-02',
            observaciones: 'TWO PACK, CON DESAYUNOS',
            items: [{ nombre: 'Pack Bajo Calorias', cantidad: 1 }]
        }]);
        expect(pedido.cantidadMenus).toBe(2);
        expect(pedido.categoryLabel).toBe('Two Pack');
    });
});
