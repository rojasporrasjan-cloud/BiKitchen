const { parseOrderBlock } = require('./src/utils/parseOrderText.js');
const { buildPedidoFromImport } = require('./src/utils/buildPedidoFromImport.js');
const { buildKitchenSheetData, mapPedidosFromLegacy } = require('./src/utils/logisticsUtils.js');

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

const parsed = parseOrderBlock(txt, '2026-08-17');
const built = buildPedidoFromImport(parsed);
built.status = 'confirmed'; // Simular pedido confirmado

const mapped = mapPedidosFromLegacy([built]);
const kitchenSheet = buildKitchenSheetData(mapped);

console.log("=== HOJA DE COCINA RESULTADO ===");
console.log(JSON.stringify(kitchenSheet, null, 2));
