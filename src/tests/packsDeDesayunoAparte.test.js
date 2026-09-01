import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

/**
 * Cuantos packs de DESAYUNO lleva un cliente no siempre es lo mismo que
 * cuantos packs de almuerzo.
 *
 * Christopher Ulloa lleva UN pack de almuerzo (su personalizado) y DOS de
 * desayunos —10 desayunos, 5 y 5—. La hoja contaba los desayunos con el
 * numero de packs del almuerzo, asi que pedia 5 desayunos en vez de 10:
 * con Angelo sumaba 10 cuando habia que cocinar 15.
 */
describe('packs de desayuno contados aparte', () => {

    const pedido = (extra = {}) => ([{
        id: 'x1', cliente: 'Christopher Ulloa', estado: 'confirmed',
        fechasEntrega: ['2026-09-02'],
        cantidadMenus: 1,
        incluyeDesayuno: true,
        items: [{ nombre: 'PERSONALIZADO — Christopher Ulloa (120 g)', cantidad: 1 }],
        ...extra
    }]);

    it('lee cuantos packs de desayuno lleva', () => {
        expect(mapPedidosFromLegacy(pedido({ packsDesayuno: 2 }))[0].packsDesayuno).toBe(2);
    });

    it('sin el dato queda en null: se sigue usando el conteo del almuerzo', () => {
        expect(mapPedidosFromLegacy(pedido())[0].packsDesayuno).toBeNull();
    });

    it('un valor invalido no se cuela como cantidad', () => {
        expect(mapPedidosFromLegacy(pedido({ packsDesayuno: 0 }))[0].packsDesayuno).toBeNull();
        expect(mapPedidosFromLegacy(pedido({ packsDesayuno: 'dos' }))[0].packsDesayuno).toBeNull();
    });

    it('no toca el conteo de packs del almuerzo', () => {
        const m = mapPedidosFromLegacy(pedido({ packsDesayuno: 2 }))[0];
        expect(m.cantidadMenus).toBe(1);
    });

    it('el dato sobrevive hasta la hoja de empaque', () => {
        // buildPackagingSheetData rearma el cliente desde cero: cualquier campo
        // que no se copie ahi se pierde en silencio, y la hoja vuelve a contar
        // los desayunos con el numero de packs del almuerzo.
        const mapeados = mapPedidosFromLegacy(pedido({ packsDesayuno: 2 }));
        const hoja = buildPackagingSheetData(mapeados, {}, null);
        expect(hoja.clientes[0].packsDesayuno).toBe(2);
        expect(hoja.clientes[0].cantidadMenus).toBe(1);
    });
});
