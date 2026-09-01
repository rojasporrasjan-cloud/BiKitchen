import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils.js';
import { cantidadDePacks } from '../utils/productionHelpers.js';

/**
 * Las DOS hojas tienen que decir la misma cantidad.
 *
 * `/admin/sheets` arma la hoja con `cantidadMenus` a secas. `/admin/print-production`
 * ademas pasa por cantidadDePacks(), que lee la cantidad del item. Cuando el
 * pedido trae "3" en el item y nada en cantidadMenus, la hoja de cierre decia
 * UN pack y la de produccion TRES.
 *
 * Paso el 31 de agosto de 2026: Carolina Laurito (3 packs) y Sonia Oreamuno
 * (2, two pack) salian en 1 en la hoja de cierre. Tres packs sin cocinar.
 */
const cant = (o) => mapPedidosFromLegacy([o])[0].cantidadMenus;
const base = (extra) => ({ id: 'X', cliente: 'Prueba', fecha_entrega: '2026-08-31', ...extra });

describe('cantidadMenus queda bien desde el origen', () => {

    it('un pack con cantidad 3 en el item cuenta 3', () => {
        expect(cant(base({ plan: 'Pack Bajo Calorías', items: [{ nombre: 'Pack Bajo Calorías', cantidad: 3 }] }))).toBe(3);
    });

    it('un pack normal sigue contando 1', () => {
        expect(cant(base({ plan: 'Pack Regular', items: [{ nombre: 'Pack Regular', cantidad: 1 }] }))).toBe(1);
    });

    it('respeta cantidadMenus cuando es mayor que la del item', () => {
        expect(cant(base({ plan: 'Pack Regular', cantidadMenus: 4, items: [{ nombre: 'Pack Regular', cantidad: 1 }] }))).toBe(4);
    });

    it('un INDIVIDUAL no multiplica: su cantidad viaja dentro de cada plato', () => {
        expect(cant(base({ plan: 'Individuales', items: [{ nombre: 'Pack 3 Proteínas (250g)', cantidad: 3 }] }))).toBe(1);
    });

    it('un two pack con cantidad 2 sigue contando 2, no 4', () => {
        expect(cant(base({ plan: 'Pack Bajo Calorías', items: [{ nombre: 'Pack', categoryLabel: 'Two Pack', cantidad: 2 }] }))).toBe(2);
    });

    it('las dos hojas coinciden: cantidadDePacks no vuelve a sumar', () => {
        const pedido = base({ plan: 'Pack Bajo Calorías', items: [{ nombre: 'Pack Bajo Calorías', cantidad: 3 }] });
        const normalizado = mapPedidosFromLegacy([pedido])[0];
        const hojaDeCierre = normalizado.cantidadMenus;
        const hojaDeProduccion = cantidadDePacks({ cantidadMenus: normalizado.cantidadMenus, rawPedido: pedido });
        expect(hojaDeCierre).toBe(3);
        expect(hojaDeProduccion).toBe(3);
    });
});
