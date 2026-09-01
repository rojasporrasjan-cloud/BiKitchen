import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils.js';

/**
 * Un pack PERSONALIZADO puede llevar el MISMO plato varias veces, y no siempre
 * la misma cantidad de veces cada uno.
 *
 * Christopher Ulloa lleva 20 platos de 8 recetas: 2 de casi todas, pero 4 de
 * fajitas y 4 de tilapia. La unica forma de expresarlo era repetir el plato en
 * la lista, asi que la hoja imprimia 20 renglones —"Plato 1 Albondigas (1)",
 * "Plato 2 Albondigas (1)"...— y quien empaca tenia que ir contando nombres
 * repetidos para saber cuantos hacer.
 *
 * Con `cantidades` el plato va UNA vez y la columna Platos dice cuantos son.
 * Sonia Oreamuno ya se resolvia asi, pero por otro camino (`cantidadMenus`),
 * que obliga a que TODOS los platos se repitan lo mismo.
 */
describe('un plato que se repite dentro del mismo pack', () => {

    const pedido = (extra = {}) => ([{
        id: 'x1',
        cliente: 'Christopher Ulloa',
        estado: 'confirmed',
        fechasEntrega: ['2026-09-02'],
        items: [{
            nombre: 'PERSONALIZADO — Christopher Ulloa (120 g)',
            cantidad: 1,
            proteinas: ['Albóndigas de res', 'Fajitas de lomo de res'],
            vegetales: ['Vegetales mixtos', 'Picadillo mixto'],
            carbos: ['Tortas de yuca', 'Arroz blanco'],
            ...extra
        }]
    }]);

    const platosDe = (raw) => mapPedidosFromLegacy(raw)[0].platos;

    it('cada plato lleva su propio numero de veces', () => {
        const platos = platosDe(pedido({ cantidades: [2, 4] }));
        expect(platos).toHaveLength(2);
        expect(platos.map(p => p.vecesPorPack)).toEqual([2, 4]);
    });

    it('el plato sigue siendo uno solo, no se repite en la lista', () => {
        const platos = platosDe(pedido({ cantidades: [2, 4] }));
        expect(platos.map(p => p.proteina.nombre)).toEqual([
            'Albóndigas de res',
            'Fajitas de lomo de res'
        ]);
    });

    it('el vegetal y la harina siguen pegados a su plato', () => {
        const platos = platosDe(pedido({ cantidades: [2, 4] }));
        expect(platos[1].vegetal.nombre).toBe('Picadillo mixto');
        expect(platos[1].carbo.nombre).toBe('Arroz blanco');
    });

    it('sin `cantidades`, cada plato vale 1 — nada cambia para los demas packs', () => {
        const platos = platosDe(pedido());
        expect(platos.map(p => p.vecesPorPack)).toEqual([1, 1]);
    });

    it('un numero invalido no rompe el plato: vale 1', () => {
        const platos = platosDe(pedido({ cantidades: [0, 'dos'] }));
        expect(platos.map(p => p.vecesPorPack)).toEqual([1, 1]);
    });

    it('los individuales (formato viejo, sin lista de proteinas) valen 1', () => {
        const raw = [{
            id: 'x2', cliente: 'Nuria', estado: 'confirmed',
            fechasEntrega: ['2026-09-02'],
            items: [{ nombre: 'Pollo a la toscana', cantidad: 3 }]
        }];
        expect(mapPedidosFromLegacy(raw)[0].platos[0].vecesPorPack).toBe(1);
    });
});
