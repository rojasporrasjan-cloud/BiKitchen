import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Adrian Morera Order Test', () => {
    it('parses Adrian Morera order text correctly', () => {
        const text = `Cliente: Adrian Morera
Zona de entrega: Sta. Ana
telefono: 70703224

◽1 pack mensual full pack: ₡93.060

Envío: ₡7.000

Total: ₡100.060

Observaciones: Cambiar camotes en gajos por papas en gajos y chayote

Entrega:
Sábado 15 agosto
Sábado 22 agosto
Sábado 29 agosto
Sábado 05 setiembre`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED ADRIAN:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('Adrian Morera');
        expect(parsed.telefono).toBe('70703224');
        expect(parsed.zona).toBe('Sta. Ana');
        expect(parsed.observaciones).toContain('Cambiar camotes en gajos por papas');
        expect(parsed.fechasEntrega).toEqual(['2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05']);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toEqual(['2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05']);

        const pkg = buildPackagingSheetData([pedido], {}, null);
        expect(pkg.clientes.length).toBe(1);
        expect(pkg.clientes[0].observaciones).toContain('Cambiar camotes');
    });
});
