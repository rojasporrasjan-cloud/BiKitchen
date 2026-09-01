import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('José Daniel Benavides Order Test', () => {
    it('parses Jose Daniel Benavides order text correctly as Two Pack with 2 packs and breakfasts', () => {
        const text = `Cliente: José Daniel Benavides
Zona de entrega: San José Centro (Barrio Don Bosco)
telefono: 85333151

◽Two Pack - Pack Bajo Calorías (Mensual) con desayunos: ₡155.000

Envío: ₡7.000

Total: ₡162.000

Observaciones: Cambiar Almuercitos rellenos con carne molida por cochinita pibil

Entrega:
Sábado 22 agosto
Sábado 29 agosto
Sábado 05 setiembre
Sábado 12 setiembre`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED JOSE DANIEL:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('José Daniel Benavides');
        expect(parsed.telefono).toBe('85333151');
        expect(parsed.zona).toBe('San José Centro (Barrio Don Bosco)');
        expect(parsed.observaciones).toContain('Cambiar Almuercitos rellenos');

        const pedido = buildPedidoFromImport(parsed);
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toEqual(['2026-08-22', '2026-08-29', '2026-09-05', '2026-09-12']);

        const normalized = mapPedidosFromLegacy([pedido]);
        console.log("NORMALIZED JOSE DANIEL:", JSON.stringify(normalized[0], null, 2));

        expect(normalized[0].cantidadMenus).toBe(2); // Two Pack doubles to 2!
        expect(normalized[0].categoria).toBe('two_pack');

        const pkg = buildPackagingSheetData(normalized, {}, null);
        console.log("PACKAGING CLIENTS:", pkg.clientes);
        console.log("DESAYUNOS CLIENTS:", pkg.desayunos);

        expect(pkg.clientes.length).toBe(1);
        expect(pkg.clientes[0].cliente).toBe('José Daniel Benavides');
        expect(pkg.clientes[0].cantidadMenus).toBe(2);
        expect(pkg.desayunos.length).toBe(1);
        expect(pkg.desayunos[0].cliente).toBe('José Daniel Benavides');
    });
});
