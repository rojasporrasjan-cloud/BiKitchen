/**
 * Avisar del pedido repetido AL ENTRARLO, no tres dias despues.
 *
 * Edwin Perez salio cobrado y cocinado dos veces —94.890 por partida— y nadie
 * lo vio hasta que estabamos revisando la hoja renglon por renglon, con la
 * comida ya hecha. En ese punto ya no hay nada que hacer: se cocino, se cobro y
 * hay que devolver la plata o regalar la comida.
 *
 * Al entrarlo, en cambio, se resuelve con un clic.
 *
 * QUE CUENTA COMO REPETIDO: el mismo cliente, con el mismo plan, en una fecha
 * que ya tiene. Los tres juntos. El plan es lo que evita el aviso en falso:
 *
 *   - Hazel Jimenez lleva DOS packs el mismo dia a proposito, un Regular y un
 *     Sin Carbos.
 *   - Diana Gonzalez lleva un pack y unos individuales aparte.
 *
 * Esos dos son legitimos y no se avisan. Edwin, con el mismo pack dos veces el
 * mismo dia, si.
 */

/** Nombre comparable: sin tildes, sin mayusculas, sin dobles espacios. */
const clave = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Todas las fechas de entrega de un pedido, venga como venga. */
export const fechasDelPedido = (p) => {
    const lista = Array.isArray(p?.fechas_entrega) ? p.fechas_entrega : [];
    const suelta = p?.fecha_entrega ? [p.fecha_entrega] : [];
    return [...new Set([...lista, ...suelta].filter(Boolean).map(String))];
};

/** El estado de un pedido que ya no cuenta: cancelado no estorba a nadie. */
const estaVivo = (p) => !/^cancel/i.test(String(p?.status || p?.estado || ''));

/**
 * Los pedidos ya guardados que son este mismo.
 *
 * @param {object} pedido  el que se esta por guardar
 * @param {Array} existentes  los pedidos que ya estan en la base
 * @returns {Array} los que chocan, vacio si no hay ninguno
 */
export const pedidosIguales = (pedido, existentes = []) => {
    const cliente = clave(pedido?.cliente);
    if (!cliente) return [];

    const plan = clave(pedido?.plan || pedido?.tipoMenu);
    const fechas = new Set(fechasDelPedido(pedido));
    if (fechas.size === 0) return [];

    return (existentes || []).filter(otro => {
        if (!otro || otro.id === pedido?.id) return false;
        if (!estaVivo(otro)) return false;
        if (clave(otro.cliente) !== cliente) return false;
        if (clave(otro.plan || otro.tipoMenu) !== plan) return false;
        return fechasDelPedido(otro).some(f => fechas.has(f));
    });
};

/**
 * El aviso listo para mostrar, o null si el pedido es nuevo de verdad.
 *
 * Es un AVISO, no un bloqueo: puede que de verdad sean dos packs iguales para
 * dos personas de la misma casa. Quien lo esta entrando decide; lo unico que no
 * puede pasar es que se entere despues de cocinar.
 */
export const avisoDeDuplicado = (pedido, existentes = []) => {
    const iguales = pedidosIguales(pedido, existentes);
    if (iguales.length === 0) return null;

    const cuales = iguales
        .map(o => o.numeroOrden || o.id)
        .filter(Boolean)
        .join(', ');

    return `Ya hay ${iguales.length === 1 ? 'un pedido' : `${iguales.length} pedidos`} de `
        + `${pedido.cliente} con el mismo plan y la misma fecha`
        + (cuales ? ` (${cuales})` : '')
        + '. Si lo guardas igual, se cocina y se cobra dos veces.';
};
