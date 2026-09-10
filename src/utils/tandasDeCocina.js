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
/**
 * El adelanto POR FECHA.
 *
 * `soloRecurrentes` recorta la tanda entera. Pero el viernes Gina necesita el
 * sabado COMPLETO y del lunes solo los mensuales y quincenales, en la misma
 * hoja: cocina lo del sabado y va adelantando lo del lunes que ya esta pagado.
 *
 * Un pedido pasa si entrega en alguna fecha NORMAL de la tanda. Si todas sus
 * entregas caen en fechas de adelanto, solo pasa si es recurrente.
 *
 * @param {object} pedido
 * @param {object} opciones
 * @param {Array<string>} opciones.fechas            todas las de la tanda
 * @param {Set<string>}   opciones.fechasDeAdelanto  cuales van recortadas
 * @param {Function}      opciones.calendario
 */
export const pasaElAdelanto = (pedido, opciones = {}) => {
    const {
        fechas = [],
        fechasDeAdelanto,
        calendario = (p) => p?.fechasEntrega || [],
        familiaPermitida = null
    } = opciones;
    if (!fechasDeAdelanto || fechasDeAdelanto.size === 0) return true;

    const suyas = (calendario(pedido) || []).filter(f => fechas.includes(f));
    // Sin entregas en la tanda no hay nada que decidir: lo filtra la fecha
    if (suyas.length === 0) return true;

    const todasSonAdelanto = suyas.every(f => fechasDeAdelanto.has(f));
    if (!todasSonAdelanto) return true;

    if (!esRecurrente(pedido, calendario)) return false;

    // Se puede adelantar UNA sola familia. Los bajo calorias son los mas del
    // lunes y se pueden dejar hechos el viernes; el resto no vale la pena
    // adelantarlo porque pasa demasiado tiempo guardado.
    //
    // Es una funcion y no una lista de nombres para que este archivo no dependa
    // de como se clasifican los packs: eso vive en packClassification.
    return familiaPermitida ? !!familiaPermitida(pedido) : true;
};

export const pedidosDeLaTanda = (pedidos, yaEnviados, opciones = {}) => {
    const {
        soloRecurrentes = false,
        calendario = (p) => p?.fechasEntrega || [],
        fechas = [],
        fechasDeAdelanto = null,
        familiaPermitida = null
    } = opciones;
    const enviados = new Set((yaEnviados || []).map(x => String(x).trim()).filter(Boolean));

    const nuevos = [];
    const repetidos = [];

    (pedidos || []).forEach(p => {
        if (soloRecurrentes && !esRecurrente(p, calendario)) return;
        if (!pasaElAdelanto(p, { fechas, fechasDeAdelanto, calendario, familiaPermitida })) return;
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

/**
 * A que CICLO de produccion pertenece esta hoja.
 *
 * Se cocina por CICLOS, no por dias sueltos. El sabado y el lunes siguiente se
 * cocinan juntos —"siempre hay que sumar los sabados y lunes", Jan— repartidos
 * en tres tandas:
 *
 *   jueves   ->  el sabado completo y el adelanto del lunes
 *   viernes  ->  lo que entro desde el jueves
 *   sabado   ->  lo que entro desde el viernes
 *
 * Las tres hojas se abren distinto: la del jueves lleva `soloPacks`, la del
 * viernes no, y la del sabado a veces trae una sola fecha. Antes la llave de la
 * tanda se armaba con la URL —las fechas mas la familia— asi que cada hoja
 * generaba una llave distinta y NINGUNA veia a la anterior: el viernes se le
 * volvia a pedir a la cocina todo lo que ya habia hecho el jueves, y las
 * cantidades no se descontaban.
 *
 * La llave tiene que ser la misma las tres veces. Por eso se calcula del
 * calendario y no de como se abrio la hoja.
 *
 * El miercoles es su propio ciclo: se empaca el martes y no se junta con nada.
 */
export const cicloDeProduccion = (fechas) => {
    const lista = [...new Set((fechas || []).map(f => String(f || '').trim()).filter(Boolean))].sort();
    if (lista.length === 0) return '';

    const primera = lista[0];
    const d = new Date(`${primera}T12:00:00`);
    if (Number.isNaN(d.getTime())) return lista.join('_');

    // Se formatea de las partes LOCALES: toISOString pasa a UTC y en Costa Rica
    // eso puede correr la fecha un dia.
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const corrido = (n) => { const x = new Date(d); x.setDate(x.getDate() + n); return iso(x); };

    const dia = d.getDay();               // 0 domingo ... 6 sabado
    if (dia === 6) return `${primera}_${corrido(2)}`;   // sabado + su lunes
    if (dia === 1) return `${corrido(-2)}_${primera}`;  // lunes -> vuelve a su sabado
    return primera;                                      // miercoles y cualquier otro
};
