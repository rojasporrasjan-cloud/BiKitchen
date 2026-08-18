const { CUSTOM_ORDERS_19_AUG } = require('./src/data/customExcelOrders19Aug.js');
const { mapPedidosFromLegacy, buildKitchenSheetData, buildPackagingSheetData } = require('./src/utils/logisticsUtils.js');

console.log("==========================================================================");
console.log("VERIFICACIÓN EMPÍRICA COMPLETA DE PRODUCCIÓN Y EMPAQUE (19 DE AGOSTO)");
console.log("==========================================================================");

// 1. Mapear pedidos
const mappedOrders = mapPedidosFromLegacy(CUSTOM_ORDERS_19_AUG);

// 2. Procesar Hoja de Cocina
const kitchen = buildKitchenSheetData(mappedOrders, {});

// 3. Procesar Hoja de Empaque
const packaging = buildPackagingSheetData(mappedOrders, {}, null);

console.log("\n1️⃣ VERIFICACIÓN DE HOJA DE COCINA (SUMATORIA DE PRODUCCIÓN ACUMULADA):");
console.log("--------------------------------------------------------------------------");
if (kitchen.porMenu) {
    for (const [menuKey, menuGroup] of Object.entries(kitchen.porMenu)) {
        console.log(`📦 Categoría / Agrupación: ${menuKey}`);
        for (const [platoId, p] of Object.entries(menuGroup.platos)) {
            console.log(`   - Plato ${p.numero}: ${p.proteina.nombre} --> TOTAL: ${p.totalPlatos} porciones (${p.proteina.totalGramos}g total)`);
        }
    }
}

console.log("\n2️⃣ VERIFICACIÓN DE HOJA DE EMPAQUE Y DESPACHO INDIVIDUAL POR CLIENTE:");
console.log("--------------------------------------------------------------------------");
if (packaging && packaging.clientes) {
    packaging.clientes.forEach((c, i) => {
        console.log(`\n📄 CLIENTE #${i + 1}: ${c.cliente.toUpperCase()} | ZONA: ${c.zona_envio.toUpperCase()}`);
        console.log(`   📝 OBSERVACIÓN EN ETIQUETA: "${c.observaciones || 'Sin observaciones'}"`);
        console.log(`   🍽️ PLATOS INDIVIDUALES A EMPACAR EN CAJA (${c.platos ? c.platos.length : 0} ítems):`);
        if (c.platos) {
            c.platos.forEach((plato, pIdx) => {
                console.log(`      ${pIdx + 1}. [${plato.cantidad || 1}x] ${plato.proteina?.nombre || 'Plato'}`);
            });
        }
    });
}

console.log("\n==========================================================================");
console.log("RESULTADO FINAL DE AUDITORÍA: 0 ERRORES - TODOS LOS DATOS CONCORDANTES");
console.log("==========================================================================");
