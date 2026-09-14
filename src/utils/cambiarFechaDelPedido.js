/**
 * Mover una entrega desde la hoja de producción.
 *
 * Es lo primero que hay que poder hacer sin salir de la hoja. Hoy, sacar a un
 * cliente de un día —"Giancarlo va para los miércoles", "Randall esta semana
 * solo se entrega el miércoles"— obliga a irse a otra pantalla, y termina
 * arreglándose a mano sobre el papel a las cuatro de la mañana.
 *
 * SON DOS OPERACIONES DISTINTAS, y confundirlas rompe pedidos:
 *
 *   SOLO ESTA        Randall: esta semana se entrega el miércoles, las demás
 *                    entregas de su mensual quedan como estaban.
 *   TODAS            Giancarlo: ya no es de lunes, es de miércoles. Se corre el
 *                    calendario entero manteniendo la separación entre entregas.
 *
 * Por eso `todas` es explícito y no se adivina: mover las cuatro entregas de un
 * mensual cuando solo había que mover una le cambia el plan al cliente, y eso no
 * se nota hasta que no le llega la comida el día que la esperaba.
 *
 * Se escribe SIEMPRE el arreglo `fechas_entrega` completo. Cuando trae más de
 * una fecha, `getScheduleFromOrder` lo respeta tal cual en vez de deducir el
 * calendario del plan — así que además de mover la entrega, deja el calendario
 * fijo y el sistema no puede volver a inventar fechas.
 */



/** "2026-09-07" -> Date al mediodía, para que el huso no corra el día. */
const aFecha = (texto) => new Date(`${texto}T12:00:00`);

/** Date -> "2026-09-07" */
const aTexto = (fecha) => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/** Una fecha escrita como la guarda Firestore. */
export const esFechaValida = (texto) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(texto || '')) && !isNaN(aFecha(texto).getTime());

/**
 * El calendario REAL del pedido: lo que está guardado, no lo deducido.
 *
 * A propósito NO se usa `getScheduleFromOrder`. Esa función, cuando el pedido
 * dice "mensual" pero tiene menos fechas guardadas, INVENTA las que faltan
 * sumando semanas. Sirve para leer, pero escribir eso de vuelta convertiría una
 * suposición en un dato: es lo que le puso un pack entero de más a Maripaz
 * Acevedo en la hoja del 22 de agosto.
 *
 * Acá se mueve solo lo que el cliente tiene de verdad.
 */
export const calendarioGuardado = (pedido) => {
    const guardadas = Array.isArray(pedido?.fechas_entrega) ? pedido.fechas_entrega
        : (Array.isArray(pedido?.details?.fechasEntrega) ? pedido.details.fechasEntrega : []);
    const validas = guardadas.filter(esFechaValida);
    if (validas.length > 0) return [...validas].sort();

    const suelta = pedido?.fecha_entrega || pedido?.details?.fechaEntrega;
    return esFechaValida(suelta) ? [suelta] : [];
};

/** Cuántos días hay entre dos fechas. Negativo si la nueva es anterior. */
export const diasEntre = (desde, hasta) =>
    Math.round((aFecha(hasta) - aFecha(desde)) / 86400000);

/**
 * El calendario nuevo del pedido.
 *
 * @param {Array<string>} calendario  las fechas que tiene hoy
 * @param {object} opciones
 * @param {string} opciones.fechaActual  la entrega que se está moviendo
 * @param {string} opciones.fechaNueva   a dónde va
 * @param {boolean} [opciones.todas]     mover el calendario entero
 * @returns {Array<string>} ordenado y sin repetidos
 */
export const calendarioMovido = (calendario, opciones = {}) => {
    const { fechaActual, fechaNueva, todas = false } = opciones;
    const fechas = (calendario || []).filter(esFechaValida);

    if (!esFechaValida(fechaActual) || !esFechaValida(fechaNueva)) return fechas;
    if (fechaActual === fechaNueva) return fechas;

    const movidas = todas
        // Todas se corren lo mismo, así se mantiene la separación entre entregas:
        // un mensual de lunes pasa a ser un mensual de miércoles, no cuatro
        // entregas amontonadas.
        ? fechas.map(f => aTexto(new Date(aFecha(f).getTime() + diasEntre(fechaActual, fechaNueva) * 86400000)))
        : fechas.map(f => (f === fechaActual ? fechaNueva : f));

    // Si la fecha que se movía no estaba en el calendario, igual hay que
    // agregarla: el pedido se ve en la hoja de ese día por algo.
    if (!todas && !fechas.includes(fechaActual) && !movidas.includes(fechaNueva)) {
        movidas.push(fechaNueva);
    }

    return [...new Set(movidas)].sort();
};

/**
 * El objeto que se le pasa a `updateDoc`.
 *
 * Devuelve `null` cuando no hay nada que cambiar: un PATCH vacío gasta una
 * escritura y ensucia la fecha de modificación sin motivo.
 *
 * @param {object} pedido  el pedido tal como está guardado
 * @param {object} opciones  { fechaActual, fechaNueva, todas }
 */
export const cambiosDeFecha = (pedido, opciones = {}) => {
    const calendario = calendarioGuardado(pedido);
    const nuevo = calendarioMovido(calendario, opciones);

    const igual = nuevo.length === calendario.length
        && nuevo.every((f, i) => f === calendario[i]);
    if (igual || nuevo.length === 0) return null;

    return {
        fechas_entrega: nuevo,
        // La consulta de la hoja filtra por `fecha_entrega`, así que tiene que
        // quedar en la primera entrega o el pedido desaparece de la búsqueda.
        fecha_entrega: nuevo[0]
    };
};
