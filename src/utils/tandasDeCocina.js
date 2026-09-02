/**
 * Las TANDAS: la cocina no recibe todo de una vez.
 *
 * Gina empieza a cocinar el jueves, pero los pedidos siguen entrando hasta el
 * viernes y el sabado. Asi que la hoja se manda por partes:
 *
 *   miercoles 9pm  ->  los mensuales y quincenales de sabado y lunes
 *   viernes        ->  lo que entro desde el miercoles
 *   sabado         ->  lo que entro desde el viernes
 *
 * La regla que sostiene todo: cada hoja lleva SOLO lo que no se ha mandado
 * antes. Si una tanda repite un pedido de la anterior, se cocina dos veces.
 *
 * Se descuenta por PEDIDO, no por cantidad. Guardar "estos 44 pedidos ya se
 * mandaron" aguanta lo que pasa de verdad —un pedido que se cancela, uno que
 * cambia de cantidad, uno que se corrige— sin que quede un numero descuadrado
 * arrastrandose de una hoja a la otra.
 *
 * Esto es SOLO para la hoja de cocina. El empaque y las etiquetas siguen
 * saliendo por fecha de entrega, que es como se reparten.
 */

/** Coleccion de Firestore. Un documento por tanda enviada. */
export const COLECCION_TANDAS = 'tandas_cocina';

/**
 * Un pedido es RECURRENTE si tiene mas de una entrega: los mensuales (cuatro)
 * y los quincenales (dos). Son los unicos que se pueden cocinar por adelantado,
 * porque ya estan pagados y no dependen de lo que entre esta semana.
 */
export const esRecurrente = (pedido, calendario) => {
    const fechas = calendario(pedido) || [];
    return fechas.length > 1;
};

/** La llave con que se identifica un pedido dentro de una tanda. */
export const claveDePedido = (pedido) =>
    String(pedido?.rawPedido?.numeroOrden || pedido?.numeroOrden || pedido?.id || '').trim();

/**
 * Los pedidos que van en la proxima hoja.
 *
 * @param {Array}  pedidos      los que entregan en las fechas de la tanda
 * @param {Array}  yaEnviados   claves de pedido de las tandas anteriores
 * @param {object} opciones
 * @param {boolean} opciones.soloRecurrentes  true en la tanda del miercoles
 * @param {Function} opciones.calendario      como leer las fechas de un pedido
 * @returns {{ nuevos: Array, repetidos: Array }}
 */
export const pedidosDeLaTanda = (pedidos, yaEnviados, opciones = {}) => {
    const { soloRecurrentes = false, calendario = (p) => p?.fechasEntrega || [] } = opciones;
    const enviados = new Set((yaEnviados || []).map(x => String(x).trim()).filter(Boolean));

    const nuevos = [];
    const repetidos = [];

    (pedidos || []).forEach(p => {
        if (soloRecurrentes && !esRecurrente(p, calendario)) return;
        if (enviados.has(claveDePedido(p))) repetidos.push(p);
        else nuevos.push(p);
    });

    return { nuevos, repetidos };
};

/**
 * Un pedido que estaba en una tanda anterior y YA NO deberia cocinarse: se
 * cancelo despues de que la hoja salio.
 *
 * No se puede deshacer lo cocinado, pero Gina tiene que enterarse para no
 * empacarlo y para saber por que le sobra comida.
 */
export const canceladosDespuesDeEnviar = (yaEnviados, pedidosVigentes) => {
    const vigentes = new Set((pedidosVigentes || []).map(claveDePedido));
    return (yaEnviados || [])
        .map(x => String(x).trim())
        .filter(clave => clave && !vigentes.has(clave));
};

/** Todas las claves mandadas hasta ahora, sin repetir. */
export const acumularEnviados = (tandas) =>
    [...new Set((tandas || []).flatMap(t => t?.pedidos || []).map(x => String(x).trim()).filter(Boolean))];
