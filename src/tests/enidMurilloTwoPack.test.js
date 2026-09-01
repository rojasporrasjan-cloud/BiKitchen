import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildPackagingSheetData, buildKitchenSheetData } from '../utils/logisticsUtils.js';

describe('Enid Murillo Two Pack Universal Test', () => {
    it('correctly detects Two Pack for Enid Murillo Rivas and doubles pack count to 2', () => {
        // Enid Murillo Rivas exact Firestore order model from checkout
        const rawFirestoreOrder = {
            id: 'ORD-S1TM7K7U9Z',
            cliente: 'Enid Murillo Rivas',
            telefono: '88888888',
            zona_envio: 'Santa Ana (Centro, Pozos)',
            fecha_entrega: '2026-08-22',
            plan: 'Pack Bajo Calorías',
            status: 'confirmed',
            observaciones: 'NO CERDO',
            items: [
                {
                    nombre: 'Pack Bajo Calorías',
                    planLabel: 'Quincenal',
                    categoryLabel: 'Two Pack',
                    cantidad: 1,
                    precio: 93000
                }
            ]
        };

        // 1. Test mapPedidosFromLegacy
        const normalized = mapPedidosFromLegacy([rawFirestoreOrder]);
        console.log("NORMALIZED ORDER:", JSON.stringify(normalized[0], null, 2));

        expect(normalized[0].cantidadMenus).toBe(2);

        // 2. Test buildPackagingSheetData
        const pkg = buildPackagingSheetData(normalized, {}, null);
        console.log("PACKAGING SHEET CLIENTS:", pkg.clientes);

        expect(pkg.clientes.length).toBe(1);
        expect(pkg.clientes[0].cliente).toBe('Enid Murillo Rivas');
        expect(pkg.clientes[0].cantidadMenus).toBe(2);

        // 3. Test buildKitchenSheetData
        const kitchen = buildKitchenSheetData(normalized, {});
        console.log("KITCHEN SHEET POR MENU:", JSON.stringify(kitchen.porMenu, null, 2));
        
        const packBajoCal = kitchen.porMenu['Pack Bajo Calorías'];
        expect(packBajoCal).toBeDefined();
        expect(packBajoCal.platos['1'].totalPlatos).toBe(2);
    });
});
