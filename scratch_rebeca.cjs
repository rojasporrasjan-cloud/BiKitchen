const { parseOrderBlock } = require('./src/utils/parseOrderText.js');

const txt = `Cliente: Rebeca Toval 

Pack Familiar Deluxe
Cambiar papas salteadas por arroz con peregil

Entrega: Miércoles 19 agosto`;

const parsed = parseOrderBlock(txt, '2026-08-17');
console.log("=== PARSED ===");
console.log(JSON.stringify(parsed, null, 2));
