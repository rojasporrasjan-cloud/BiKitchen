/**
 * Armado del correo de aviso de pedido — SIN dependencias de navegador.
 *
 * Vive acá y no dentro de emailNotifications.js porque lo usan DOS runtimes
 * distintos: el navegador del cliente (que manda el correo apenas termina el
 * checkout) y la función programada de Netlify (la red de seguridad que recoge
 * los pedidos cuyo correo nunca salió). Si cada uno tuviera su copia, tarde o
 * temprano dirían cosas distintas y Gina recibiría dos formatos según por dónde
 * pasó el pedido.
 *
 * Todo acá es formateo puro: nada de firebase, nada de import.meta.env.
 */

import { formatProteinList } from './formatters';

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const HEADER_LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

/** Categoría legible a partir del id del ítem, cuando no viene categoryLabel. */
const CATEGORY_MAP = {
    'two_pack': 'Two Pack',
    'familiar': 'Pack Familiar',
    '5_comidas': '5 Comidas',
    '10_comidas': '10 Comidas',
    'desayuno_almuerzo_cena': 'Desayuno, Almuerzo y Cena',
    'proteinas': 'Pack de Proteínas',
    'desayunos': 'Pack de Desayunos'
};

/**
 * Formatear items del pedido para el email con estilo ASCII (Gina Style)
 */
export const formatItemsForEmail = (items) => {
    // La lista vacía cuenta igual que la ausente: si no, el campo {{items}} del
    // correo llega en blanco y parece que el pedido no traía nada.
    if (!items || !Array.isArray(items) || items.length === 0) return "Sin items";
    return items.map(item => {
        const itemPlan = item.planLabel ? ` (${item.planLabel})` : '';

        // Generar prefix de categoría - usar categoryLabel si existe, o extraer del id/category
        let categoryPrefix = '';
        if (item.categoryLabel) {
            categoryPrefix = `${item.categoryLabel} - `;
        } else if (item.id) {
            // Fallback: extraer categoría del id (ej: "two_pack-Pack Sin Carbos" -> "Two Pack")
            const categoryId = item.id.split('-')[0];
            if (CATEGORY_MAP[categoryId]) {
                categoryPrefix = `${CATEGORY_MAP[categoryId]} - `;
            }
        }

        const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        let line = `${item.quantity}× ${categoryPrefix}${item.name}${itemPlan} - ₡${itemTotal.toLocaleString('es-CR')}`;

        // Soporta varios formatos de proteínas para asegurar que siempre se envíen
        const proteinas = item.proteinas || (item.proteina ? [item.proteina] : []) || (item.protein ? [item.protein] : []);
        if (proteinas.length > 0) {
            line += `\n└ Proteínas: ${formatProteinList(proteinas)}`;
        }

        // Sustituciones — todos los formatos históricos
        const c = item.customizations || {};
        (c.proteinChanges || []).forEach(d => { line += `\n└ 🍗 Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}`; });
        (c.vegeChanges    || []).forEach(d => { line += `\n└ 🥦 Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}`; });
        (c.carboChanges   || []).forEach(d => { line += `\n└ 🍚 Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}`; });
        (c.dishChanges    || []).forEach(d => { line += `\n└ 🍗 Plato ${d.dishNumber} (${d.dishName}) → ${d.newProtein || d.newValue}`; });
        if (c.protein) line += `\n└ Proteína: ${c.protein}`;
        if (c.vegetal) line += `\n└ Vegetal: ${c.vegetal}`;
        if (c.carbo)   line += `\n└ Carbo: ${c.carbo}`;
        if (c.notes)   line += `\n└ Notas: ${c.notes}`;
        return line;
    }).join('\n\n');
};

/**
 * Fechas de entrega en una línea. Un pack mensual trae cuatro: si se mandara
 * sólo la primera, cocina no vería las otras tres.
 */
export const formatDeliveryDates = (fechasEntrega) => {
    if (!fechasEntrega) return 'N/A';
    if (!Array.isArray(fechasEntrega)) return fechasEntrega;

    const validDates = fechasEntrega.filter(Boolean);
    if (validDates.length === 0) return 'N/A';
    if (validDates.length === 1) return validDates[0];

    return validDates.map((d, i) => `Entrega ${i + 1}: ${d}`).join('\n');
};

/**
 * Genera el bloque completo de la orden con el estilo solicitado (Separadores y Emojis)
 */
export const generateStyledSummary = (orderData) => {
    let summary = `${HEADER_LINE}\n📦 PEDIDO: ${orderData.orderNumber}\n${DIVIDER}\n`;
    summary += `Fecha del Pedido: ${orderData.orderDate || new Date().toLocaleDateString('es-CR')}\n${DIVIDER}\n\n`;

    summary += `👤 INFORMACIÓN DEL CLIENTE\n${DIVIDER}\n`;
    summary += `Nombre: ${orderData.cliente}\n`;
    summary += `Teléfono: ${orderData.telefono}\n`;
    summary += `Email: ${orderData.correo}\n`;
    summary += `Cédula: ${orderData.cedula || 'No especificado'}\n\n`;

    summary += `📦 ITEMS DEL PEDIDO\n${DIVIDER}\n`;
    summary += `${formatItemsForEmail(orderData.items)}\n\n`;

    summary += `💰 RESUMEN DE PAGO\n${DIVIDER}\n`;
    summary += `Subtotal: ₡${(orderData.subtotal || 0).toLocaleString('es-CR')}\n`;
    summary += `Descuento: ${orderData.descuento > 0 ? `₡${orderData.descuento.toLocaleString('es-CR')}` : 'Sin descuento'}\n`;
    if (orderData.cupon) summary += `Cupón aplicado: ${orderData.cupon}\n`;
    summary += `Envio: ${orderData.envioPorConfirmar ? 'Por confirmar ⚠️' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`}\n`;
    summary += `${DIVIDER}\n`;
    summary += `TOTAL: ₡${(orderData.total || 0).toLocaleString('es-CR')}\n\n`;

    summary += `🚚 INFORMACIÓN DE ENTREGA\n${DIVIDER}\n`;
    summary += `Zona: ${orderData.zona}\n`;
    summary += `Dirección: ${orderData.direccion}\n`;
    if (orderData.ubicacionFueraCobertura) summary += `Ubicación exacta (fuera cobertura): ${orderData.ubicacionFueraCobertura}\n`;
    summary += `Referencias: ${orderData.referencias || 'Sin referencias'}\n`;

    // Manejo de múltiples fechas de entrega (Suscripciones)
    if (Array.isArray(orderData.fechasEntrega) && orderData.fechasEntrega.length > 0) {
        if (orderData.fechasEntrega.length > 1) {
            summary += `Fechas de Entrega:\n${orderData.fechasEntrega.map((d, i) => ` • Entrega ${i + 1}: ${d}`).join('\n')}\n\n`;
        } else {
            summary += `Fecha de Entrega: ${orderData.fechasEntrega[0]}\n\n`;
        }
    } else {
        summary += `Fecha de Entrega: ${orderData.fechasEntrega || orderData.fechaEntrega || 'N/A'}\n\n`;
    }

    summary += `💳 MÉTODO DE PAGO\n${DIVIDER}\n`;
    summary += `${orderData.metodoPago?.toUpperCase() || 'TARJETA'}\n`;
    if (orderData.transactionId) summary += `Transacción: ${orderData.transactionId}\n`;
    summary += `\n`;

    summary += `📝 OBSERVACIONES DEL CLIENTE\n${orderData.observaciones || 'Ninguna'}\n`;

    return summary;
};

/**
 * Los campos que espera la plantilla de EmailJS del aviso al admin.
 * `to_email` lo agrega quien envía, porque cambia por destinatario.
 */
export const buildAdminTemplateParams = (orderData) => ({
    message: generateStyledSummary(orderData),
    orderNumber: orderData.orderNumber || 'N/A',
    cliente: orderData.cliente || 'Cliente',
    telefono: orderData.telefono || 'No especificado',
    correo: orderData.correo || 'No especificado',
    email: orderData.correo || 'No especificado',
    cedula: orderData.cedula || 'No especificado',
    items: formatItemsForEmail(orderData.items || []),
    subtotal: `₡${(orderData.subtotal || 0).toLocaleString('es-CR')}`,
    descuento: orderData.descuento > 0 ? `₡${orderData.descuento.toLocaleString('es-CR')}` : 'Sin descuento',
    cupon: orderData.cupon || 'Sin cupón',
    envio: orderData.envioPorConfirmar ? 'Por confirmar ⚠️' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`,
    total: `₡${(orderData.total || 0).toLocaleString('es-CR')}`,
    direccion: orderData.direccion || 'No especificada',
    ubicacionFueraCobertura: orderData.ubicacionFueraCobertura || '',
    referencias: orderData.referencias || 'Sin referencias',
    zona: orderData.zona || 'No especificada',
    fechaEntrega: formatDeliveryDates(orderData.fechasEntrega),
    metodoPago: orderData.metodoPago || 'Tarjeta (Procesado)',
    transactionId: orderData.transactionId || '',
    observaciones: orderData.observaciones || 'Sin observaciones',
    name: "Admin BiKitchen"
});
