/**
 * Qué estados de pedido salen en la hoja impresa de cocina y empaque.
 *
 * Vive acá y no adentro de una pantalla porque lo usan DOS: PrintProductionView
 * para decidir qué imprime, y SheetsView para avisar cuáles quedaron sin
 * confirmar. Si cada una tuviera su copia, tarde o temprano dirían cosas
 * distintas y nadie se daría cuenta hasta que faltara comida.
 *
 * Un pedido sin confirmar NO se cocina: puede que nunca se pague.
 *
 * `in_transit` sí cuenta, y no es un descuido: un pack mensual se despacha la
 * semana 1 y el pedido queda "en ruta", pero sus semanas 2, 3 y 4 todavía hay
 * que prepararlas. Si se excluyera, esos clientes desaparecerían de la hoja
 * desde la segunda entrega.
 */
export const ESTADOS_QUE_IMPRIMEN = [
    'confirmed', 'confirmado', 'pagado',
    'preparing', 'preparando', 'making',
    'ready', 'listo', 'in_transit'
];

/** ¿Este pedido sale en la hoja? */
export const imprimeEnHoja = (pedido) =>
    ESTADOS_QUE_IMPRIMEN.includes(String(pedido?.status || pedido?.estado || '').toLowerCase());
