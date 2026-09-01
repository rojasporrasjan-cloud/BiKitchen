import { describe, it, expect } from 'vitest';
import { parseQuantityAndUnit } from '../utils/granelKitchen';

/**
 * `medida` es la cantidad tal como la escribio Gina para ESE plato — "120 g",
 * "1 unidad", "4 tazas". mapPedidosFromLegacy la guarda plato por plato y su
 * comentario dice que manda sobre cualquier calculo.
 *
 * Pero la hoja no se la pasaba al granel: mandaba `descripcion`, que casi
 * siempre viene vacia. Sin nada escrito el parser adivina por el tipo de plato
 * y a toda proteina le pone 250 g.
 *
 * A Fatima Arauz eso le ponia 250 g de "Trocitos de cerdo con chimichurri"
 * cuando su cena Sin Carbos es de 120 g: el doble de proteina en cada plato.
 */
describe('la medida del plato llega al granel', () => {

    it('una cena de 120 g se cuenta como 120, no como 250', () => {
        const sinMedida = parseQuantityAndUnit('Trocitos de cerdo con chimichurri', '', 1, null);
        const conMedida = parseQuantityAndUnit('Trocitos de cerdo con chimichurri', '120 g', 1, null);
        expect(sinMedida.totalQty).toBe(250);   // lo que adivinaba
        expect(conMedida.totalQty).toBe(120);   // lo que Gina escribio
    });

    it('un desayuno de 1 unidad no se cuenta como proteina', () => {
        expect(parseQuantityAndUnit('Flautas con queso en salsa roja', '1 unidad', 1, null).unit)
            .toBe('unidades');
    });

    it('respeta las tazas', () => {
        const r = parseQuantityAndUnit('Arroz estilo cantones', '4 tazas', 1, null);
        expect(r.totalQty).toBe(4);
        expect(r.unit).toBe('taza(s)');
    });

    it('el nombre del plato sigue mandando sobre la medida', () => {
        // "Cochinita pibil (Individual 1 kg)" trae lo suyo escrito: no se pisa
        const r = parseQuantityAndUnit('Cochinita pibil (Individual 1 kg)', '120 g', 1, null);
        expect(r.unit).toBe('kg');
    });

    it('sin medida sigue adivinando como antes', () => {
        expect(parseQuantityAndUnit('Pollo al ajillo', '', 1, null).totalQty).toBe(250);
        expect(parseQuantityAndUnit('Gallo pinto con huevo', '', 1, null).unit).toBe('taza(s)');
    });
});
