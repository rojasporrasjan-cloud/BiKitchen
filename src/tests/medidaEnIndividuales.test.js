import { describe, it, expect } from 'vitest';
import { textoDeCantidad } from '../utils/granelKitchen.js';

/**
 * La tabla de individuales de la hoja de produccion arma su celda de cantidad
 * con esta funcion. Antes no le pasaba la medida escrita en el pedido y el
 * parser adivinaba: a toda proteina le ponia 250 g.
 *
 * La reposicion de Fatima Arauz son 5 cenas Sin Carbos de 120 g. La tabla decia
 * 250 g y el granel de la misma hoja decia 120 g: quien empaca leia una cosa y
 * la cocina otra.
 */
describe('la medida escrita manda en la tabla de individuales', () => {

    it('respeta los 120 g de una cena Sin Carbos', () => {
        expect(textoDeCantidad('Fajitas de lomo de res en salsa criolla', '120 g', 1, 0))
            .toBe('120g (120g)');
    });

    it('sin medida escrita sigue adivinando 250 g, como antes', () => {
        expect(textoDeCantidad('Fajitas de lomo de res en salsa criolla', '', 1, 0))
            .toBe('250g (250g)');
    });

    it('los desayunos que se cuentan por unidad no se vuelven gramos', () => {
        expect(textoDeCantidad('Flautas con queso en salsa roja', '1 unidad', 1, 0))
            .toBe('1 unidad');
    });

    it('varias porciones del mismo plato se muestran juntas', () => {
        expect(textoDeCantidad('Milanesa de pollo', '250 g', 3, 0))
            .toBe('750g (3 porciones de 250g)');
    });

    it('las tazas se quedan en tazas', () => {
        expect(textoDeCantidad('Arroz estilo cantones', '4 tazas', 1, 0))
            .toBe('4 tazas');
    });

    it('el gramaje ya resuelto se usa cuando no hay medida escrita', () => {
        expect(textoDeCantidad('Pollo al pesto', '', 1, 120)).toBe('120g (120g)');
    });
});
