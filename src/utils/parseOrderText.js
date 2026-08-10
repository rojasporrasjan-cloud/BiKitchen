/**
 * Parseo del texto de pedidos que reenvía la administración.
 *
 * El texto puede venir en dos formatos, y los DOS los genera este mismo sistema:
 *  - El cuerpo del correo de aviso  → generateStyledSummary() en emailNotifications.js
 *  - El mensaje de WhatsApp         → construido en CheckoutSteps.jsx
 *
 * En ambos el número de pedido aparece igual: #ORD-XXXXXXXXXX. Por eso el
 * importador se ancla al número y NO confía en el resto del texto: una vez
 * ubicado el pedido, los datos buenos se leen de Firestore.
 */

// Los números se generan como `#ORD-` + base36 en mayúsculas (ver generateOrderNumber
// en CheckoutSteps.jsx). Los pedidos viejos creados desde el admin usan 4 dígitos.
const ORDER_NUMBER_RE = /#ORD-[A-Z0-9]+/gi;

/**
 * Extrae todos los números de pedido presentes en un texto, sin repetir y en el
 * orden en que aparecen.
 *
 * @param {string} text - Texto crudo pegado por el usuario
 * @returns {string[]} Números normalizados en mayúsculas (ej: ['#ORD-MLMPMVGE99'])
 */
export const extractOrderNumbers = (text) => {
    if (!text || typeof text !== 'string') return [];

    const matches = text.match(ORDER_NUMBER_RE) || [];
    const seen = new Set();
    const unique = [];

    for (const match of matches) {
        const normalized = match.toUpperCase();
        if (!seen.has(normalized)) {
            seen.add(normalized);
            unique.push(normalized);
        }
    }

    return unique;
};
