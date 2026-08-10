/**
 * Progreso de los packs multi-entrega (mensuales y quincenales).
 *
 * NO existe una colección de suscripciones ni hace falta: el calendario ya vive
 * en cada pedido. getScheduleFromOrder() devuelve 4 fechas para un pack mensual
 * y 2 para uno quincenal, y la hoja de producción ya filtra por esas fechas.
 * Este módulo solo LEE ese calendario y calcula por qué semana va cada cliente.
 *
 * Por eso mismo no hay que generar pedidos nuevos por cada semana: la cocina ya
 * ve al cliente en cada una de sus fechas. Un pedido extra lo haría salir dos veces.
 */

import { getScheduleFromOrder, parseDateStr } from './orderDates';

const toISO = (date) => {
    if (!date) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Fechas guardadas en el pedido tal cual las escribió el checkout.
 *
 * Se leen aparte de getScheduleFromOrder() a propósito. Esa función deduce cuántas
 * entregas tocan mirando el plan del ítem, y si no reconoce la etiqueta devuelve
 * UNA sola fecha aunque el pedido tenga cuatro guardadas. Para saber por qué semana
 * va un cliente hay que creerle a las fechas guardadas.
 */
const getSavedDates = (order) => {
    const saved = Array.isArray(order?.fechas_entrega)
        ? order.fechas_entrega
        : (Array.isArray(order?.details?.fechasEntrega) ? order.details.fechasEntrega : []);
    return saved.filter(Boolean);
};

/** Fechas reales del pedido: las guardadas mandan; si no hay, se deducen. */
const getDeliveryDates = (order) => {
    const saved = getSavedDates(order);
    if (saved.length > 1) return saved;
    return getScheduleFromOrder(order || {}) || [];
};

/** Un pedido cuenta como suscripción cuando tiene más de una entrega programada. */
export const isSubscription = (order) => getDeliveryDates(order).length > 1;

/**
 * Calcula por qué entrega va un pedido multi-entrega.
 *
 * @param {object} order - pedido de Firestore
 * @param {Date} [referenceDate] - "hoy" (inyectable para poder testear)
 * @returns {{
 *   fechas: string[], total: number, completadas: number, semanaActual: number,
 *   proxima: string|null, esHoy: boolean, finalizado: boolean, etiqueta: string
 * }}
 */
export const getSubscriptionProgress = (order, referenceDate = new Date()) => {
    const schedule = getDeliveryDates(order);
    const dates = schedule
        .map(parseDateStr)
        .filter(Boolean)
        .sort((a, b) => a - b);

    // Cuántas entregas ve realmente la hoja de producción. Si son menos que las
    // guardadas, la cocina se está perdiendo semanas — hay que avisarlo.
    const entregasQueVeLaCocina = (getScheduleFromOrder(order || {}) || []).length;

    const total = dates.length;
    const today = startOfDay(referenceDate);

    // Una entrega cuenta como hecha cuando su fecha ya pasó. La de hoy todavía no.
    const completadas = dates.filter(d => d < today).length;
    const proximaDate = dates.find(d => d >= today) || null;
    const finalizado = total > 0 && proximaDate === null;
    const esHoy = !!proximaDate && proximaDate.getTime() === today.getTime();

    const semanaActual = finalizado ? total : Math.min(completadas + 1, total);

    let etiqueta;
    if (total === 0) etiqueta = 'Sin fechas';
    else if (finalizado) etiqueta = `Completado (${total} de ${total})`;
    else etiqueta = `Semana ${semanaActual} de ${total}`;

    return {
        fechas: dates.map(toISO),
        total,
        completadas,
        semanaActual,
        proxima: toISO(proximaDate),
        esHoy,
        finalizado,
        etiqueta,
        entregasQueVeLaCocina,
        // true = el pedido tiene más entregas guardadas de las que la cocina ve
        cocinaDesincronizada: total > 1 && entregasQueVeLaCocina < total
    };
};

/** Etiqueta del tipo de plan según cuántas entregas tenga. */
export const getPlanLabel = (totalEntregas) => {
    if (totalEntregas >= 4) return 'Pack mensual';
    if (totalEntregas === 2) return 'Pack quincenal';
    if (totalEntregas === 3) return 'Pack de 3 entregas';
    return 'Multi-entrega';
};
