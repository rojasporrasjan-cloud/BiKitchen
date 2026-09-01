import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';

const HOY = new Date('2026-08-29');

/**
 * Los packs de proteínas escritos a mano en el grupo de ventas.
 *
 * Gina los escribe de tres formas distintas y las tres entraban mal:
 *   "250gr" + lista        → no entraba NINGÚN ítem (Jazmin Elizondo, 29 ago)
 *   "3 proteinas de 250 g" → el 3 se leía como 3 PACKS y se cocinaba el triple
 *   "Pack 500 g" + lista   → las proteínas se pegaban al nombre, no eran platos
 */
describe('packs de proteínas escritos a mano', () => {
    it('la medida sola de encabezado ("250gr") arma el pack con su lista', () => {
        const r = parseOrderBlock(`Cliente: Jazmin Elizondo
Teléfono: 87024420
Lugar: Curri

250gr

Albondigas artesanales
Pollo al pesto
Bistec de cerdo encebollado
Envio 3000
TOTAL:16.500

Entregas
Miércoles 02 setiembre`, HOY);

        expect(r.items).toHaveLength(1);
        expect(r.items[0].cantidad).toBe(1);
        expect(r.items[0].nombre).toBe('Pack 3 Proteínas (250g)');
        expect(r.items[0].proteinas).toEqual([
            'Albondigas artesanales',
            'Pollo al pesto',
            'Bistec de cerdo encebollado'
        ]);
        expect(r.warnings).not.toContain('No pude leer ningún ítem del pedido.');
    });

    it('"3 proteinas de 250 g" es UN pack de tres, no tres packs', () => {
        const r = parseOrderBlock(`Cliente: Gerli Ramirez
Teléfono: 83786766
Lugar: Rohrmoser

3 proteinas de 250 g
Precio 13.500

Albóndigas de res artesanales
Pulled Pork
Pollo al pesto

Envíos 3000
TOTAL: 16.500

Entregas
Lunes 31 agosto`, HOY);

        expect(r.items).toHaveLength(1);
        // Lo importante: 1, no 3. Con 3 la cocina preparaba el triple.
        expect(r.items[0].cantidad).toBe(1);
        expect(r.items[0].proteinas).toEqual([
            'Albóndigas de res artesanales',
            'Pulled Pork',
            'Pollo al pesto'
        ]);
    });

    it('"Pack 500 g" manda las proteínas a la lista y no al nombre', () => {
        const r = parseOrderBlock(`Cliente: Karen Villarreal
Teléfono: 87748989
Lugar: BARREAL LA GRANJA

Pack 500 g
Pollo al pesto
Pulled pork
Carne mechada en salsa
Filet de tilapia peregil y ajo

Precio 34.500
Envío: 3.000
Total: 37.500

Entrega: Lunes 31 agosto`, HOY);

        expect(r.items).toHaveLength(1);
        expect(r.items[0].nombre).toBe('Pack 4 Proteínas (500g)');
        expect(r.items[0].proteinas).toHaveLength(4);
    });

    it('"2 pack bajo en calorías" siguen siendo DOS packs', () => {
        const r = parseOrderBlock(`Cliente: Wendy Rojas
Teléfono: 88112233
Lugar: Coyol

2 pack bajo en calorias
Precio 51.700
Envio 3000
Total: 54.700

Entrega: Lunes 31 agosto`, HOY);

        expect(r.items).toHaveLength(1);
        expect(r.items[0].cantidad).toBe(2);
    });

    it('una medida suelta sin lista debajo no inventa un ítem', () => {
        const r = parseOrderBlock(`Cliente: Prueba
Teléfono: 88880000
Lugar: X

250gr

Envio 3000
TOTAL: 3.000

Entregas
Lunes 31 agosto`, HOY);

        expect(r.items).toHaveLength(0);
    });
});
