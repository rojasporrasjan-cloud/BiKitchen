/**
 * phoneUtils.js
 *
 * Utilidades para los teléfonos de los CLIENTES (no el WhatsApp de la empresa,
 * que vive en src/config/whatsappMessages.js + Firebase config/contact).
 *
 * Motivo: los teléfonos guardados pueden venir en formatos distintos
 * ("8888-7777", "+506 8888 7777", "50688887777"). Armar el link como
 * `wa.me/506${telefono}` rompe cuando el número ya trae el código de país.
 */

const CR_COUNTRY_CODE = '506';

// En Costa Rica los números de 8 dígitos empiezan con 2-8
// (2 y 4 fijos, 5 VoIP, 6/7/8 móviles). El 9 y el 0 no se asignan.
const CR_LOCAL_PATTERN = /^[2-8]\d{7}$/;

/**
 * Normaliza un teléfono de Costa Rica a formato internacional (ej: 50688887777).
 * @param {string} phone - Teléfono en cualquier formato
 * @returns {string|null} Número con código de país, o null si no es interpretable
 */
export function toCRInternational(phone) {
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (!digits) return null;

    // Ya viene con código de país (506 + 8 dígitos)
    if (digits.length === 11 && digits.startsWith(CR_COUNTRY_CODE)) {
        const local = digits.slice(CR_COUNTRY_CODE.length);
        return CR_LOCAL_PATTERN.test(local) ? digits : null;
    }

    // Número local de 8 dígitos
    if (CR_LOCAL_PATTERN.test(digits)) return `${CR_COUNTRY_CODE}${digits}`;

    return null;
}

/**
 * Formatea un teléfono para mostrarlo en pantalla (ej: "8888-7777").
 * Si no se puede interpretar, devuelve el valor original tal cual.
 */
export function formatCRPhone(phone) {
    const full = toCRInternational(phone);
    if (!full) return String(phone ?? '');
    const local = full.slice(CR_COUNTRY_CODE.length);
    return `${local.slice(0, 4)}-${local.slice(4)}`;
}

/**
 * Genera el link de WhatsApp para escribirle a un cliente.
 * @param {string} phone - Teléfono del cliente
 * @param {string} [message] - Mensaje prellenado (se codifica automáticamente)
 * @returns {string|null} URL de WhatsApp, o null si el teléfono no sirve
 *                        (para no pintar un link roto en la UI)
 */
export function getClientWhatsAppUrl(phone, message = '') {
    const full = toCRInternational(phone);
    if (!full) return null;

    return message
        ? `https://wa.me/${full}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${full}`;
}

/**
 * Genera el link para llamar a un cliente (tel:).
 * @returns {string|null} URL tel:, o null si el teléfono no sirve
 */
export function getClientTelUrl(phone) {
    const full = toCRInternational(phone);
    return full ? `tel:+${full}` : null;
}

export default {
    toCRInternational,
    formatCRPhone,
    getClientWhatsAppUrl,
    getClientTelUrl
};
