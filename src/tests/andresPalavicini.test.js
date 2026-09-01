import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Andres Palavicini Order Test', () => {
    it('parses Andres Palavicini order text correctly', () => {
        const text = `Cliente: Andres Palavicini
Zona de entrega: Heredia
telefono: 70708433

◽two pack bajo calorias Mensual 
REGALIA DESAYUNOS
Precio 155.000

Envío: ₡7000

Total: ₡162.000

Entrega:
Sábado 15 agosto 
Sábado 22 agosto 
Sábado 29 agosto
Sábado 05 setiembre`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED OBJECT:", parsed);
        expect(parsed.cliente).toBe('Andres Palavicini');
        expect(parsed.telefono).toBe('70708433');
        expect(parsed.zona).toBe('Heredia');
        expect(parsed.total).toBe(162000);
        expect(parsed.costoEnvio).toBe(7000);

        const pedido = buildPedidoFromImport(parsed);
        console.log("PEDIDO OBJECT:", JSON.stringify(pedido, null, 2));
        expect(pedido.cliente).toBe('Andres Palavicini');
        expect(pedido.zona_envio).toBe('Heredia');
        expect(pedido.costo_envio).toBe(7000);
        expect(pedido.total).toBe(162000);

        const schedule = getScheduleFromOrder(pedido);
        console.log("SCHEDULE DATES:", schedule);
        expect(schedule).toEqual(['2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05']);

        const pkg = buildPackagingSheetData([pedido], {}, null);
        console.log("PACKAGING CLIENTS:", pkg.clientes);
        expect(pkg.desayunos.length).toBe(1);
        expect(pkg.desayunos[0].cliente).toBe('Andres Palavicini');
    });
});
