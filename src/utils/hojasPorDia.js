/**
 * Una hoja de empaque por DÍA de entrega.
 *
 * La hoja del jueves cubre el sábado y el lunes juntos, y las familias salían
 * en una sola tabla con los dos días mezclados: "Wendy · SÁB 12" y tres
 * renglones abajo "Lynn · LUN 14", bajo un mismo "AQUÍ VAN 22 PACKS".
 *
 * Pero empaque son DOS corridas distintas: la del sábado se cierra ese día, y
 * la del lunes va a refri sin cerrar porque todavía le faltan cenas y
 * desayunos. Con los dos días en una tabla hay que ir leyendo el día en cada
 * nombre y saltando entre dos montones.
 *
 * Acá se decide en cuántas tablas se parte una familia y quién va en cada una.
 *
 * LO QUE NO PUEDE PASAR: que alguien se pierda. Si de un cliente no se puede
 * sacar el día —el pedido no siempre queda a la misma profundidad— NO se
 * descarta: va a una tabla aparte al final, marcada, para que se vea y se
 * arregle. Un cliente que desaparece de la hoja es comida que no se empaca.
 */

/** El cajón de los que no se les pudo sacar el día. Se dibuja aparte. */
export const SIN_DIA = 'sin-dia';

/**
 * En cuántas tablas se parte esta familia.
 *
 * Con una sola fecha en la hoja no hay nada que partir: devuelve `[null]`, que
 * significa "una sola tabla con todos", igual que siempre.
 *
 * @param {Array} clientes
 * @param {Array} fechas          las fechas de la hoja, en orden
 * @param {Function} diasDeCliente  qué entregas de la hoja tiene un cliente
 */
export const hojasPorDia = (clientes, fechas, diasDeCliente) => {
    const lista = Array.isArray(clientes) ? clientes : [];
    const dias = Array.isArray(fechas) ? fechas : [];
    if (dias.length < 2 || typeof diasDeCliente !== 'function') return [null];

    const conGente = dias.filter(f => lista.some(c => (diasDeCliente(c) || []).includes(f)));
    const hayHuerfanos = lista.some(c => (diasDeCliente(c) || []).length === 0);

    // Sin nadie con día reconocible no se parte nada: mejor una tabla con todos
    // que dos tablas vacías y una de huérfanos con la familia entera.
    if (conGente.length === 0) return [null];

    return hayHuerfanos ? [...conGente, SIN_DIA] : conGente;
};

/**
 * Los clientes que van en la tabla de ese día.
 *
 * Un cliente con entrega en los DOS días sale en las dos tablas, y está bien:
 * lleva un pack cada día.
 */
export const clientesDelDia = (clientes, dia, diasDeCliente) => {
    const lista = Array.isArray(clientes) ? clientes : [];
    if (dia === null || dia === undefined) return lista;
    if (typeof diasDeCliente !== 'function') return lista;
    if (dia === SIN_DIA) return lista.filter(c => (diasDeCliente(c) || []).length === 0);
    return lista.filter(c => (diasDeCliente(c) || []).includes(dia));
};
