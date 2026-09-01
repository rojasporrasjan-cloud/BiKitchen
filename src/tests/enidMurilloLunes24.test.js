import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Enid Murillo Shift to Lunes 24 Test', () => {
    it('correctly shifts second delivery from Saturday 22 to Monday 24', () => {
        const text = `Cliente: Enid Murillo Rivas
Zona de entrega: Santa Ana
telefono: 88184435

◽Two Pack - Pack Bajo Calorías (Quincenal): ₡93.000

Envío: ₡7.000

Total: ₡100.000

Observaciones: NO CERDO - cambiar cerdo por carne mechada (Segunda entrega trasladada del sábado 22 al Lunes 24 de Agosto)

Entrega:
Sábado 15 agosto
Lunes 24 agosto`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED ENID SHIFT:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('Enid Murillo Rivas');
        expect(parsed.telefono).toBe('88184435');
        expect(parsed.zona).toBe('Santa Ana');
        expect(parsed.fechasEntrega).toEqual(['2026-08-15', '2026-08-24']);

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toEqual(['2026-08-15', '2026-08-24']);

        // VERIFICACIÓN EMPÍRICA:
        // 1. En la hoja del Sábado 22 (2026-08-22): NO APARECE
        expect(schedule.includes('2026-08-22')).toBe(false);

        // 2. En la hoja del Lunes 24 (2026-08-24): SÍ APARECE
        expect(schedule.includes('2026-08-24')).toBe(true);

        const normalized = mapPedidosFromLegacy([pedido]);
        const pkgLunes = buildPackagingSheetData(normalized, {}, null);

        expect(pkgLunes.clientes.length).toBe(1);
        expect(pkgLunes.clientes[0].cliente).toBe('Enid Murillo Rivas');
        expect(pkgLunes.clientes[0].cantidadMenus).toBe(2);
    });
});
