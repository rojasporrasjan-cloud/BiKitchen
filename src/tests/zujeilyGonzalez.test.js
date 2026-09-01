import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { getScheduleFromOrder } from '../utils/orderDates';

describe('Zujeily Gonzalez Order Block Parsing', () => {
    it('parses Zujeily Gonzalez protein pack order correctly', () => {
        const text = `
Cliente: Zujeily Gonzalez
Zona: Heredia

◽Pack 5 Proteínas (250g): ₡21.000
- 2 Fajitas de lomo en salsa gravy (250g)
- 2 Fajitas de cerdo en salsa teriyaki (250g)
- 1 Pulled pork (250g)

Envío: ₡3.000

Total: ₡24.000

Entrega:
Sábado 22 agosto
`;

        const parsed = parseOrderBlock(text);
        expect(parsed.cliente).toBe('Zujeily Gonzalez');
        expect(parsed.zona).toBe('Heredia');
        expect(parsed.costoEnvio).toBe(3000);
        expect(parsed.total).toBe(24000);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);

        expect(schedule).toContain('2026-08-22');
        expect(pedido.items[0].nombre).toMatch(/5 prote[íi]nas/i);
    });
});
