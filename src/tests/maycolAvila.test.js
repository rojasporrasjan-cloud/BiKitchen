import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Maycol Avila Order Test', () => {
    it('parses Maycol Avila order text correctly', () => {
        const text = `Cliente: Maycol Ávila
Zona de entrega: Belén
telefono: 85152838

◽1 pack bajo calorias mensual almuerzos y cenas REGALIA DESAYUNOS

Observaciones: Solo zanahoria o chayote (cambiar mix de vegetales)

Entrega:
Sábado 08 agosto
Sábado 15 agosto
Sábado 22 agosto
Sábado 29 agosto`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('Maycol Ávila');
        expect(parsed.telefono).toBe('85152838');
        expect(parsed.zona).toBe('Belén');
        expect(parsed.observaciones).toContain('Solo zanahoria o chayote');
        expect(parsed.fechasEntrega).toEqual(['2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29']);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toEqual(['2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29']);

        const pkg = buildPackagingSheetData([pedido], {}, null);
        expect(pkg.desayunos.length).toBe(1);
        expect(pkg.desayunos[0].cliente).toBe('Maycol Ávila');
    });
});
