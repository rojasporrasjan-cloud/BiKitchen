import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { getScheduleFromOrder } from '../utils/orderDates';

describe('Luis Lopez Order Block Parsing', () => {
    it('parses Luis Lopez individual items order correctly', () => {
        const text = `
Cliente: Luis Lopez
Zona: Desamparados

4 tazas Gallo pinto (en dos tazas frijoles mas suaves): ₡6.000
2 picadillo vainica con zanahoria y carne molida: ₡3.500
2 Enyucados con carne: ₡4.000
2 picadillo chayote con carne: ₡3.500
2 Picadillo papa con frijol y carne: ₡4.000

Envío: ₡3.000

Total: ₡24.000

Entrega:
Sábado 22 agosto
`;

        const parsed = parseOrderBlock(text);
        expect(parsed.cliente).toBe('Luis Lopez');
        expect(parsed.zona).toBe('Desamparados');
        expect(parsed.costoEnvio).toBe(3000);
        expect(parsed.total).toBe(24000);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);

        expect(schedule).toContain('2026-08-22');
        expect(pedido.items.length).toBeGreaterThanOrEqual(4);
    });
});
