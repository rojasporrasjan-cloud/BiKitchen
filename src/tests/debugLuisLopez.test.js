import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils';
import {
    cleanIndividualDishName,
    parseQuantityAndUnit
} from '../utils/granelKitchen';

describe('Debug Luis Lopez Order Details', () => {
    it('prints detailed breakdown of Luis Lopez items', () => {
        const text = `
Cliente: Luis Lopez
Zona: Desamparados

4 tazas Gallo pinto (en dos tazas frijoles mas suaves): ₡6.000
2 picadillo vainica con zanahoria y carne molida: ₡3.500
2 Enyucados con carne: ₡4.000
2 picadillo chayote con carne: ₡3.500
2 Picadillo papa con frijol y carne: ₡4.000

Envío: ₡3.000

Total: ₡24.000

Entrega:
Sábado 22 agosto
`;

        const parsed = parseOrderBlock(text);
        const rawPedido = buildPedidoFromImport(parsed);
        const orders = mapPedidosFromLegacy([rawPedido]);
        const packagingData = buildPackagingSheetData(orders, {}, null);

        console.log("=== RAW PEDIDO ITEMS ===");
        console.log(JSON.stringify(rawPedido.items, null, 2));

        console.log("\n=== PACKAGING CLIENTS ===");
        packagingData.clientes.forEach(c => {
            console.log(`Cliente: ${c.cliente} | plan: ${c.plan} | cantidadMenus: ${c.cantidadMenus}`);
            console.log("c.platos:", JSON.stringify(c.platos, null, 2));
            if (c.platos) {
                c.platos.forEach(p => {
                    const dishName = p.proteina?.nombre || p.nombre;
                    const parsedQty = parseQuantityAndUnit(dishName, p.descripcion || '', p.cantidad || 1, p.proteina?.gramosPorPorcion);
                    console.log(` -> Plato: ${dishName} | cantidad: ${p.cantidad} | parsed:`, parsedQty);
                });
            }
        });
    });
});
