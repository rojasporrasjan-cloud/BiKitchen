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

/**
 * La misma regla, en las dos partes que la usan.
 *
 * Hasta el 4 de setiembre de 2026 había DOS funciones con este nombre y reglas
 * distintas, cada una ciega a los casos de la otra. La de producción no conocía
 * el bloque 8000-XXXX del Excel de Gina, y la de difusión no conocía el
 * 8888-8888 de los pedidos de WhatsApp. Ahora las dos leen el mismo archivo.
 */
describe('el relleno del Excel (8000-XXXX) cuenta igual', () => {
    it('lo reconoce', () => {
        expect(esTelefonoDeRelleno('8000-0001')).toBe(true);
        expect(esTelefonoDeRelleno('80000007')).toBe(true);
        expect(esTelefonoDeRelleno('+506 8000 0006')).toBe(true);
    });

    it('un 8000 que NO es del bloque de relleno pasa', () => {
        // 8000-0001 es relleno; 8001-2345 es un celular como cualquier otro.
        expect(esTelefonoDeRelleno('80012345')).toBe(false);
    });

    it('la hoja no fusiona dos clientes que comparten el relleno del Excel', () => {
        const { pedidos, fusionados } = deduplicateOrdersByClient([
            pedido('Karim Arguedas', '8000-0001', 'Individuales'),
            pedido('Xiomara Vílchez', '8000-0001', 'Pack Semanal')
        ]);

        expect(pedidos).toHaveLength(2);
        expect(fusionados).toHaveLength(0);
    });
});
