import { parseOrderBlock } from './src/utils/parseOrderText.js';
import { buildPedidoFromImport } from './src/utils/buildPedidoFromImport.js';
import { getScheduleFromOrder } from './src/utils/orderDates.js';

const txt = `Cliente: Keylin Nuñes
Lugar:  Guacima

□ 1 pack bajo en calorias 
Precio 77.500

Envíos 7000

TOTAL: 84.500

Entregas 
Lunes 03 agosto (5 comidas) 
Lunes 10 agosto ( 5 comidas 
Miércoles 26 (entregar 5 comidas) 
Lunes 31 agosto ( 5 comidas`;

const parsed = parseOrderBlock(txt, '2026-08-17');
console.log("=== PARSED ===");
console.log(JSON.stringify(parsed, null, 2));

const built = buildPedidoFromImport(parsed);
console.log("\n=== BUILT PEDIDO ===");
console.log(JSON.stringify(built, null, 2));

const schedule = getScheduleFromOrder(built);
console.log("\n=== SCHEDULE DATES ===");
console.log(schedule);
