/**
 * Fechas legibles para el panel admin.
 *
 * Costa Rica es UTC-6 todo el año (sin horario de verano), así que restar días
 * en milisegundos es seguro acá. parseDateStr construye la fecha en hora local
 * a las 00:00, y las comparaciones se hacen siempre contra el inicio del día.
 */

import { parseDateStr } from './orderDates';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const MS_POR_DIA = 86400000;

/** '2026-08-19' → 'mié 19 ago'. Si no se puede leer, devuelve lo que entró. */
export const formatFechaCorta = (iso) => {
    const d = parseDateStr(iso);
    if (!d) return iso || '—';
    return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};

/**
 * Días entre hoy y la fecha. Negativo = ya pasó, 0 = hoy.
 * @param {string} iso
 * @param {Date} [referenceDate] - "hoy" (inyectable para testear)
 * @returns {number|null}
 */
export const diasHasta = (iso, referenceDate = new Date()) => {
    const d = parseDateStr(iso);
    if (!d) return null;
    const hoy = new Date(referenceDate);
    hoy.setHours(0, 0, 0, 0);
    return Math.round((d - hoy) / MS_POR_DIA);
};

/** Traduce el número de días a algo que se lee de un vistazo. */
export const textoRelativo = (dias) => {
    if (dias === null || dias === undefined) return '';
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    if (dias > 1) return `en ${dias} días`;
    if (dias === -1) return 'era ayer';
    return `hace ${Math.abs(dias)} días`;
};
