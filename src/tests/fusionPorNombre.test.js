import { describe, it, expect } from 'vitest';
import { deduplicateOrdersByClient } from '../utils/productionHelpers';

/**
 * La fusion compara NOMBRES. Si compara subcadenas en vez de palabras, junta
 * a dos personas distintas y el segundo pedido pierde sus items: esa comida
 * no se cocina y nadie se entera.
 *
 * "Ana Mora" cabe dentro de "Mariana Morales": "ana" esta adentro de "mariana"
 * y "mora" adentro de "morales".
 */
const pedido = (cliente, telefono, plan) => ({ cliente, telefono, plan, id: `${cliente}-${plan}` });

describe('fusion por nombre — no juntar personas distintas', () => {

    it('NO junta "Ana Mora" con "Mariana Morales"', () => {
        const { pedidos, fusionados } = deduplicateOrdersByClient([
            pedido('Ana Mora', '88112233', 'Pack Keto'),
            pedido('Mariana Morales', '87001122', 'Pack Regular')
        ]);
        expect(pedidos).toHaveLength(2);
        expect(fusionados).toHaveLength(0);
    });

    it('NO junta "Luis Mora" con "Marluis Morales" aunque compartan relleno', () => {
        const { pedidos, fusionados } = deduplicateOrdersByClient([
            pedido('Luis Mora', '88888888', 'Pack Sin Carbos'),
            pedido('Marluis Morales', '88888888', 'Individuales')
        ]);
        expect(pedidos).toHaveLength(2);
        expect(fusionados).toHaveLength(0);
    });

    it('NO junta "Sol Rios" con "Marisol Riosec"', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('Sol Rios', '86543210', 'Pack Regular'),
            pedido('Marisol Riosec', '85432109', 'Pack Keto')
        ]);
        expect(pedidos).toHaveLength(2);
    });

    // --- Lo que SI se tiene que seguir fusionando (casos reales del sistema) ---

    it('junta "Bryan Ocampo" con "Bryan Ocampo Granados"', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('Bryan Ocampo', '85857760', 'Pack Casaditos'),
            pedido('Bryan Ocampo Granados', '85857760', 'Pack Casaditos')
        ]);
        expect(pedidos).toHaveLength(1);
    });

    it('junta "José Daniel Benavides" con "Jose Daniel Benavides Villalobos"', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('José Daniel Benavides', '85333151', 'Pack Bajo Calorías'),
            pedido('Jose Daniel Benavides Villalobos', '85333151', 'Pack Bajo Calorías')
        ]);
        expect(pedidos).toHaveLength(1);
    });

    it('junta "Gina Marozzi" con "Gina Marozzi Li"', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('Gina Marozzi', '84606717', 'Pack Regular'),
            pedido('Gina Marozzi Li', '84606717', 'Pack Regular')
        ]);
        expect(pedidos).toHaveLength(1);
    });

    it('sigue juntando por telefono REAL aunque el nombre este escrito distinto', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('Jairo Monge', '88670025', 'Pack 3 Proteínas'),
            pedido('jairo m.', '8867-0025', 'Individuales')
        ]);
        expect(pedidos).toHaveLength(1);
    });
});
