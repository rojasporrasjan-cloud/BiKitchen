import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from '../utils/orderDates.js';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils.js';

describe('Priscilla Montoya Order Test', () => {
    it('parses Priscilla Montoya order text correctly', () => {
        const text = ` INFORMACIÓN DEL CLIENTE
━━━━━━━━━━━━━━
Nombre: Priscilla Montoya
Teléfono: 88172430
Email: priella86@gmail.com
Cédula: N/A

📦 ITEMS DEL PEDIDO
━━━━━━━━━━━━━
1× 🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías (Promoción Mensual) - ₡87 890

💰 RESUMEN DE PAGO
━━━━━━━━━━━━━━
Subtotal: ₡116 390
Descuento: Sin descuento
Envío: ₡6 000
━━━━━━━━━━━━━━
TOTAL: ₡122 390

🚚 INFORMACIÓN DE ENTREGA
━━━━━━━━━━━━━━
Zona: Desamparados (todos los distritos)
Dirección: 125 mts NO del cementerio general, casa 9A
Referencias: Sin referencia


Entrega 4
 sabado 22 agosto

Entrega 5 
Sábado 29 agosto

💳 MÉTODO DE PAGO
━━━━━━━━━━━━━━
Tarjeta de Débito / Crédito`;

        const parsed = parseOrderBlock(text);
        console.log("PARSED PRISCILLA:", JSON.stringify(parsed, null, 2));

        expect(parsed.cliente).toBe('Priscilla Montoya');
        expect(parsed.telefono).toBe('88172430');
        expect(parsed.correo).toBe('priella86@gmail.com');
        expect(parsed.costoEnvio).toBe(6000);
        expect(parsed.total).toBe(122390);

        const pedido = buildPedidoFromImport(parsed);
        console.log("PEDIDO PRISCILLA:", JSON.stringify(pedido, null, 2));

        const schedule = getScheduleFromOrder(pedido);
        console.log("SCHEDULE DATES:", schedule);
        expect(schedule).toEqual(['2026-08-22', '2026-08-29']);

        const normalized = mapPedidosFromLegacy([pedido]);
        const pkg = buildPackagingSheetData(normalized, {}, null);

        console.log("PACKAGING CLIENTS:", pkg.clientes);
        console.log("DESAYUNOS CLIENTS:", pkg.desayunos);

        expect(pkg.clientes.length).toBe(1);
        expect(pkg.clientes[0].cliente).toBe('Priscilla Montoya');
        expect(pkg.desayunos.length).toBe(1);
        expect(pkg.desayunos[0].cliente).toBe('Priscilla Montoya');
    });
});
