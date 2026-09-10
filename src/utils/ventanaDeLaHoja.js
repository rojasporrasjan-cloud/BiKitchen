/**
 * Qué pedidos se bajan de Firestore para la hoja, y cuáles se muestran.
 *
 * Son dos preguntas distintas y confundirlas costaba la cuota del día.
 *
 * La consulta se hace por `fecha_entrega >= (primera fecha − 40 días)`: una
 * ventana ancha, porque un pack mensual guarda como `fecha_entrega` su PRIMERA
 * entrega y puede estar a tres semanas de la que se va a cocinar. Esa ventana
 * trae ~545 pedidos.
 *
 * El problema era que el efecto se volvía a suscribir con la lista de fechas
 * completa. Pasar de la hoja del sábado a la del lunes —dos días de diferencia,
 * la misma ventana en la práctica— volvía a bajar los 545. El 9 de setiembre de
 * 2026 se agotaron las 50.000 lecturas del día así, cambiando de hoja.
 *
 * Ahora la suscripción se ata a la VENTANA y el filtro por fecha se hace en
 * memoria. Y la ventana solo se amplía hacia atrás: una que empieza antes ya
 * trae todo lo que pide una que empieza después, así que avanzar en la semana
 * no cuesta ni una lectura.
 */

/** El inicio de la ventana de consulta: la primera fecha menos `dias`. */
export const inicioDeVentana = (primeraFecha, dias = 40) => {
    if (!primeraFecha || !/^\d{4}-\d{2}-\d{2}/.test(String(primeraFecha))) return '';
    const d = new Date(`${String(primeraFecha).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() - dias);
    return d.toISOString().split('T')[0];
};

/**
 * La ventana que hay que tener cargada.
 *
 * Solo se mueve hacia ATRÁS. Si ya está cargada una ventana que empieza antes,
 * esa es un superconjunto de la nueva y no hace falta volver a consultar.
 */
export const ventanaAUsar = (yaCargada, necesaria) => {
    if (!necesaria) return yaCargada || '';
    if (!yaCargada) return necesaria;
    return necesaria < yaCargada ? necesaria : yaCargada;
};

/**
 * De todo lo que trajo la ventana, lo que de verdad sale en ESTA hoja.
 *
 * Es exactamente el filtro que antes vivía dentro del `onSnapshot`. Sacarlo de
 * ahí es lo que permite cambiar de fecha sin volver a consultar.
 *
 * @param {Array} pedidos     lo que trajo la ventana
 * @param {Array} fechas      las fechas de la hoja
 * @param {object} opciones
 * @param {Array}  opciones.estadosQueImprimen
 * @param {Function} opciones.calendario  cómo se leen las entregas de un pedido
 */
export const pedidosDeLaHoja = (pedidos, fechas, { estadosQueImprimen = [], calendario } = {}) => {
    const lista = Array.isArray(pedidos) ? pedidos : [];
    const dias = Array.isArray(fechas) ? fechas : [];
    if (dias.length === 0 || typeof calendario !== 'function') return [];

    return lista
        .filter((pedido) => {
            const estado = String(pedido?.status || pedido?.estado || '').toLowerCase();
            if (!estadosQueImprimen.includes(estado)) return false;
            const calendarioDelPedido = calendario(pedido) || [];
            return calendarioDelPedido.some(f => dias.includes(f));
        })
        .sort((a, b) => String(a?.cliente || '').localeCompare(String(b?.cliente || '')));
};
