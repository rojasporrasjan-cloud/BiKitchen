import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { getScheduleFromOrder } from '../utils/orderDates';

describe('Sebastian Villegas Order Block Parsing', () => {
    it('parses Sebastian Villegas order text with custom menu substitutions', () => {
        const text = `
Cliente: Sebastian Villegas
Teléfono: 87292053
Zona: Escazú

◽Pack Bajo en Calorías (Mensual): ₡93.060

Envío: ₡6.000

Total: ₡99.060

Observaciones: Cambiar la crema por una ensalada | Cambiar Zuchinni y pastel de maduro por Arroz al perejil y Vegetales mixtos

Entrega:
Sábado 8 agosto
Sábado 15 agosto
Sábado 22 agosto
Sábado 29 agosto
`;

        const parsed = parseOrderBlock(text);
        expect(parsed.cliente).toBe('Sebastian Villegas');
        expect(parsed.telefono).toBe('87292053');
        expect(parsed.zona).toBe('Escazú');
        expect(parsed.observaciones).toContain('Cambiar Zuchinni y pastel de maduro por Arroz al perejil y Vegetales mixtos');
        expect(parsed.items[0].nombre).toMatch(/bajo en calor[ií]as/i);
        expect(parsed.total).toBe(99060);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);

        expect(schedule).toContain('2026-08-22');
        expect(schedule.length).toBe(4);
    });
});
