import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy, buildKitchenSheetData } from '../utils/logisticsUtils';

describe('Verificación de Hoja de Cocina para Johanny Varela', () => {
    it('asigna correctamente las 3 proteínas en la hoja de cocina', () => {
        const txt = `Cliente: Johanny Varela
Lugar:  Pozos Sta Ana
Teléfono: 83863313

Pack de 3 proteína de 250 g 
Precio 13.500
Cerdo en salsa de piña
Fajitas de lomo con chimicurri
Fajitas de pollo en salsa agridulce

Envíos 3000

TOTAL: 16.500

Entregas 
Miércoles 19 agosto`;

        const parsed = parseOrderBlock(txt, new Date('2026-08-17'));
        const built = buildPedidoFromImport(parsed);
        built.status = 'confirmed';

        const mapped = mapPedidosFromLegacy([built]);
        const kitchen = buildKitchenSheetData(mapped);

        const packData = kitchen.porMenu['Pack de 3 proteína de 250 g'];
        expect(packData).toBeDefined();
        expect(packData.platos['1'].proteina.nombre).toBe('Cerdo en salsa de piña');
        expect(packData.platos['1'].proteina.totalGramos).toBe(250);

        expect(packData.platos['2'].proteina.nombre).toBe('Fajitas de lomo con chimicurri');
        expect(packData.platos['2'].proteina.totalGramos).toBe(250);

        expect(packData.platos['3'].proteina.nombre).toBe('Fajitas de pollo en salsa agridulce');
        expect(packData.platos['3'].proteina.totalGramos).toBe(250);
    });
});
