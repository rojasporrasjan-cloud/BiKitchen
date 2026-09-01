import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils';
import {
    cleanIndividualDishName,
    parseQuantityAndUnit,
    claveGranel,
    sumarAGranel,
    isBulkDishCandidate
} from '../utils/granelKitchen';

describe('Luis Lopez Kitchen Sheet Item Count Fix', () => {
    it('correctly uses p.cantidad=4 for Luis Lopez Gallo Pinto in kitchen sheet', () => {
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

        const bulkItemsMap = {};

        packagingData.clientes.forEach(c => {
            if (c.platos && c.platos.length > 0) {
                c.platos.forEach(p => {
                    const rawName = p.proteina?.nombre || p.nombre;
                    const pGrams = p.proteina?.gramosPorPorcion || p.gramos;
                    const pCount = p.cantidad || 1;
                    const cleanName = cleanIndividualDishName(rawName);

                    const parsedItem = parseQuantityAndUnit(rawName, p.descripcion || '', pCount, pGrams);

                    if (isBulkDishCandidate(cleanName.toLowerCase(), true)) {
                        sumarAGranel(bulkItemsMap, cleanName, parsedItem.totalQty, parsedItem.unit);
                    }
                });
            }
        });

        const pintoItem = bulkItemsMap[claveGranel('Gallo pinto', 'taza(s)')];
        expect(pintoItem).toBeDefined();
        expect(pintoItem.totalQty).toBe(4);
        const conMerma = Math.round(pintoItem.totalQty * 1.30);
        expect(conMerma).toBe(5);
    });
});
