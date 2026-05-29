/**
 * formatters.js — Utilidades de formateo compartidas en toda la app.
 *
 * REGLA: Nunca definir formatPrice localmente en un componente.
 * Importar siempre desde aquí.
 */

/**
 * Formatea un número como precio en colones costarricenses.
 * Redondea a entero (sin decimales) y usa separadores de miles con locale es-CR.
 *
 * @param {number|string} price - El precio a formatear.
 * @returns {string} Precio formateado: "₡10.000"
 *
 * @example
 * formatPrice(10000)   // "₡10.000"
 * formatPrice(8500.9)  // "₡8.501"
 * formatPrice(null)    // "₡0"
 */
export const formatPrice = (price) => {
    if (price == null || isNaN(Number(price))) return '₡0';
    return `₡${Math.round(Number(price)).toLocaleString('es-CR')}`;
};

/**
 * Formatea un número como precio compacto (sin símbolo ₡).
 * Útil para aria-labels o cuando el símbolo ya se muestra aparte.
 *
 * @param {number|string} price
 * @returns {string} "10.000"
 */
export const formatPriceRaw = (price) => {
    if (price == null || isNaN(Number(price))) return '0';
    return Math.round(Number(price)).toLocaleString('es-CR');
};

/**
 * Formatea un porcentaje de descuento.
 * @param {number} value - Valor del descuento (0–100).
 * @returns {string} "-15%"
 */
export const formatDiscount = (value) => {
    if (!value) return '';
    return `-${Math.round(value)}%`;
};
