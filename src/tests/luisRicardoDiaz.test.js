import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Luis Ricardo Diaz Order Test', () => {
    it('parses Luis Ricardo Diaz order text correctly', () => {
        const text = `Cliente: Luis Ricardo Díaz
Zona de entrega: Zapote
telefono: 88632339

◽pack bajo en calorias con desayunos: ₡93.060

Envío: ₡7.000

Total: ₡100.060

Observaciones: Cambiar Relish de vegetales y Mix de vainica, zanahoria y ayote por Vegetales salteados

Entrega:
Sábado 15 agosto
Sábado 22 agosto
Sábado 29 agosto
Sábado 05 setiembre`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED LUIS RICARDO:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('Luis Ricardo Díaz');
        expect(parsed.telefono).toBe('88632339');
        expect(parsed.zona).toBe('Zapote');
        expect(parsed.observaciones).toContain('Cambiar Relish de vegetales');
        expect(parsed.fechasEntrega).toEqual(['2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05']);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toEqual(['2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05']);

        const normalized = mapPedidosFromLegacy([pedido]);
        const pkg = buildPackagingSheetData(normalized, {}, null);

        expect(pkg.clientes.length).toBe(1);
        expect(pkg.clientes[0].cliente).toBe('Luis Ricardo Díaz');
        expect(pkg.clientes[0].observaciones).toContain('Cambiar Relish de vegetales');
        expect(pkg.desayunos.length).toBe(1);
        expect(pkg.desayunos[0].cliente).toBe('Luis Ricardo Díaz');
    });
});
