/**
 * 8888-8888 es el número que se anota cuando el pedido llega por WhatsApp sin
 * teléfono. La fusión de pedidos toma "mismo teléfono" como "mismo cliente", así
 * que ese relleno unía a personas sin relación y una desaparecía de la hoja.
 *
 * Pasó de verdad: Luis Carlos Monge (publicidad) y Lizbeth Zeledón quedaron como
 * un solo pedido, y Monge se perdió junto con sus 5 cenas.
 */

import { describe, it, expect } from 'vitest';
import { deduplicateOrdersByClient, esTelefonoDeRelleno } from '../utils/productionHelpers';

const pedido = (cliente, telefono, plan) => ({ cliente, telefono, plan, id: `${cliente}-${plan}` });

describe('esTelefonoDeRelleno', () => {
    it('reconoce el relleno que usamos', () => {
        expect(esTelefonoDeRelleno('88888888')).toBe(true);
        expect(esTelefonoDeRelleno('8888-8888')).toBe(true);
        expect(esTelefonoDeRelleno('00000000')).toBe(true);
        expect(esTelefonoDeRelleno('12345678')).toBe(true);
    });

    it('un número incompleto tampoco identifica a nadie', () => {
        expect(esTelefonoDeRelleno('8888')).toBe(true);
        expect(esTelefonoDeRelleno('')).toBe(true);
        expect(esTelefonoDeRelleno(null)).toBe(true);
    });

    it('los teléfonos reales pasan', () => {
        expect(esTelefonoDeRelleno('88184435')).toBe(false);
        expect(esTelefonoDeRelleno('6167-6146')).toBe(false);
        expect(esTelefonoDeRelleno('+506 8506 7200')).toBe(false);
    });
});

describe('fusión de pedidos por teléfono', () => {

    it('NO junta dos clientes distintos que comparten el relleno', () => {
        const { pedidos, fusionados } = deduplicateOrdersByClient([
            pedido('Luis Carlos Monge', '88888888', 'Pack Bajo Calorías Almuerzo y Cena'),
            pedido('Lizbeth Zeledón', '88888888', 'Individuales')
        ]);

        expect(pedidos).toHaveLength(2);
        expect(fusionados).toHaveLength(0);
        expect(pedidos.map(p => p.cliente).sort()).toEqual(['Lizbeth Zeledón', 'Luis Carlos Monge']);
    });

    it('sigue juntando al mismo cliente cuando el teléfono ES real', () => {
        const { pedidos, fusionados } = deduplicateOrdersByClient([
            pedido('Jose Daniel Benavides', '85333151', 'Two Pack'),
            pedido('J. D. Benavides Villalobos', '85333151', 'Pack Bajo Calorías')
        ]);

        expect(pedidos).toHaveLength(1);
        expect(fusionados).toHaveLength(1);
    });

    it('y sigue juntando por nombre aunque no haya teléfono', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('María Fernanda Solano', '', 'Pack Regular'),
            pedido('Maria Fernanda Solano', '', 'Pack Regular')
        ]);

        expect(pedidos).toHaveLength(1);
    });

    it('tres clientes con relleno siguen siendo tres pedidos', () => {
        const { pedidos } = deduplicateOrdersByClient([
            pedido('Ana Mora', '88888888', 'Individuales'),
            pedido('Beto Ruiz', '88888888', 'Individuales'),
            pedido('Carla Sáenz', '88888888', 'Individuales')
        ]);

        expect(pedidos).toHaveLength(3);
    });
});
