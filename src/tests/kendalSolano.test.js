import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Kendal Solano Order Test', () => {
    it('parses Kendal Solano order text and 5 proteins correctly', () => {
        const text = `Cliente: Kendal Solano
Zona de entrega: Paso Ancho
telefono: 61676146

◽Pack 5 Proteínas (250g): ₡39.950
- Fajitas de pollo en salsa chipotle
- Fajitas de lomo con chimichurri
- Fajitas mixtas encebolladas
- Fajitas de pollo al curry
- Cerdo en salsa de piña

Envío: ₡6.000

Total: ₡45.950

Entrega:
Sábado 22 agosto`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED KENDAL:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('Kendal Solano');
        expect(parsed.telefono).toBe('61676146');
        expect(parsed.zona).toBe('Paso Ancho');
        expect(parsed.costoEnvio).toBe(6000);
        expect(parsed.total).toBe(45950);
        expect(parsed.fechasEntrega).toEqual(['2026-08-22']);

        const pedido = buildPedidoFromImport(parsed);
        const normalized = mapPedidosFromLegacy([pedido]);
        const pkg = buildPackagingSheetData(normalized, {}, null);

        console.log("KENDAL PACKAGING CLIENTS:", pkg.clientes);
        expect(pkg.clientes.length).toBe(1);
        expect(pkg.clientes[0].cliente).toBe('Kendal Solano');
    });
});
