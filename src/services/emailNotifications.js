import emailjs from '@emailjs/browser';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { formatProteinList } from '../utils/formatters';

// Flag para desactivar/activar envío de emails
const EMAILS_ENABLED = true; // Cambiar a false para desactivar emails

// Inicializar EmailJS una sola vez al cargar el módulo
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
if (publicKey && EMAILS_ENABLED) {
    emailjs.init(publicKey);
} else if (!publicKey && EMAILS_ENABLED) {
    console.warn('[EmailJS] Public key not found in environment');
}

/**
 * Servicio de notificaciones por email usando EmailJS
 * 
 * CONFIGURACIÓN REQUERIDA:
 * 1. Crear cuenta en https://www.emailjs.com/
 * 2. Crear un servicio de email (Gmail, Outlook, etc.)
 * 3. Crear una plantilla con las siguientes variables:
 *    - {{orderNumber}}
 *    - {{cliente}}
 *    - {{telefono}}
 *    - {{correo}}
 *    - {{items}}
 *    - {{subtotal}}
 *    - {{descuento}}
 *    - {{envio}}
 *    - {{total}}
 *    - {{direccion}}
 *    - {{zona}}
 *    - {{fechaEntrega}}
 *    - {{metodoPago}}
 *    - {{observaciones}}
 * 4. Agregar las credenciales a las variables de entorno
 */

// Configuración de EmailJS desde variables de entorno
const EMAILJS_CONFIG = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_bikitchen',
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_order_notification',
    customerTemplateId: import.meta.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || 'template_customer_confirmation',
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
};

// Email por defecto para notificaciones (desde env var o fallback)
const DEFAULT_NOTIFICATION_EMAIL = import.meta.env.VITE_DEFAULT_NOTIFICATION_EMAIL || 'ginamaroli@gmail.com';

// Deduplicación de emails: trackea orderNumbers ya enviados en esta sesión
// Previene emails duplicados si ocurre timeout+retry después de envío exitoso
const _sentOrderIds = new Set();
const MAX_DEDUP_SIZE = 500;
function trackSentEmail(key) {
    if (_sentOrderIds.size >= MAX_DEDUP_SIZE) _sentOrderIds.clear();
    _sentOrderIds.add(key);
}

/**
 * Obtener el email de notificaciones configurado en Firebase
 * Soporta múltiples destinatarios (separados por coma)
 */
export const getNotificationEmail = async () => {
    try {
        const configDoc = await getDoc(doc(db, 'config', 'notifications'));
        if (configDoc.exists()) {
            const data = configDoc.data();
            return data.email || DEFAULT_NOTIFICATION_EMAIL;
        }
    } catch (error) {
        console.warn('Error obteniendo email de notificaciones, usando default:', error);
    }
    return DEFAULT_NOTIFICATION_EMAIL;
};

/**
 * Enviar email con reintentos y timeout
 * @param {string} serviceId - EmailJS service ID
 * @param {string} templateId - EmailJS template ID
 * @param {object} params - Parámetros del template
 * @param {string} publicKey - EmailJS public key
 * @param {number} maxRetries - Máximo de reintentos (default 3)
 * @returns {Promise<object>} Resultado del envío
 */
async function sendWithRetryAndTimeout(serviceId, templateId, params, publicKey, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Envolver emailjs.send con timeout de 5 segundos
            const promise = emailjs.send(serviceId, templateId, params, publicKey);
            const result = await Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout esperando EmailJS (5s)')), 5000)
                )
            ]);
            return { success: true, result, attempt };
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            console.warn(`[EmailJS] Intento ${attempt}/${maxRetries} falló para ${params.to_email}:`, {
                message: error.message,
                status: error.status,
                statusText: error.statusText,
                response: error.response,
                errorFull: error
            });

            if (isLastAttempt) {
                console.error(`[EmailJS] ❌ Fallo definitivo para ${params.to_email} después de ${maxRetries} intentos`);
                return { success: false, error: error.message, attempt };
            }

            // Esperar antes de reintentar (backoff exponencial)
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
}

/**
 * Validar datos del pedido antes de enviar
 */
function validateOrderData(orderData) {
    if (!orderData.cliente?.trim()) {
        throw new Error('Nombre del cliente vacío');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(orderData.correo)) {
        throw new Error(`Email inválido: ${orderData.correo}`);
    }
    if (!orderData.telefono?.trim() || orderData.telefono === 'No especificado') {
        throw new Error('Teléfono no especificado');
    }
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Pedido sin items');
    }
    if (!orderData.orderNumber) {
        throw new Error('Número de orden faltante');
    }
}

/**
 * Formatear items del pedido para el email con estilo ASCII (Gina Style)
 */
const formatItemsForEmail = (items) => {
    if (!items || !Array.isArray(items)) return "Sin items";
    return items.map(item => {
        const itemPlan = item.planLabel ? ` (${item.planLabel})` : '';

        // Generar prefix de categoría - usar categoryLabel si existe, o extraer del id/category
        let categoryPrefix = '';
        if (item.categoryLabel) {
            categoryPrefix = `${item.categoryLabel} - `;
        } else if (item.id) {
            // Fallback: extraer categoría del id (ej: "two_pack-Pack Sin Carbos" -> "Two Pack")
            const idParts = item.id.split('-');
            const categoryId = idParts[0];
            const categoryMap = {
                'two_pack': 'Two Pack',
                'familiar': 'Pack Familiar',
                '5_comidas': '5 Comidas',
                '10_comidas': '10 Comidas',
                'desayuno_almuerzo_cena': 'Desayuno, Almuerzo y Cena',
                'proteinas': 'Pack de Proteínas',
                'desayunos': 'Pack de Desayunos'
            };
            if (categoryMap[categoryId]) {
                categoryPrefix = `${categoryMap[categoryId]} - `;
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
 * Genera el bloque completo de la orden con el estilo solicitado (Separadores y Emojis)
 */
const generateStyledSummary = (orderData) => {
    const divider = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
    const headerLine = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
    
    let summary = `${headerLine}\n📦 PEDIDO: ${orderData.orderNumber}\n${divider}\n`;
    summary += `Fecha del Pedido: ${orderData.orderDate || new Date().toLocaleDateString('es-CR')}\n${divider}\n\n`;
    
    summary += `👤 INFORMACIÓN DEL CLIENTE\n${divider}\n`;
    summary += `Nombre: ${orderData.cliente}\n`;
    summary += `Teléfono: ${orderData.telefono}\n`;
    summary += `Email: ${orderData.correo}\n`;
    summary += `Cédula: ${orderData.cedula || 'No especificado'}\n\n`;
    
    summary += `📦 ITEMS DEL PEDIDO\n${divider}\n`;
    summary += `${formatItemsForEmail(orderData.items)}\n\n`;
    
    summary += `💰 RESUMEN DE PAGO\n${divider}\n`;
    summary += `Subtotal: ₡${(orderData.subtotal || 0).toLocaleString('es-CR')}\n`;
    summary += `Descuento: ${orderData.descuento > 0 ? `₡${orderData.descuento.toLocaleString('es-CR')}` : 'Sin descuento'}\n`;
    if (orderData.cupon) summary += `Cupón aplicado: ${orderData.cupon}\n`;
    summary += `Envio: ${orderData.envioPorConfirmar ? 'Por confirmar ⚠️' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`}\n`;
    summary += `${divider}\n`;
    summary += `TOTAL: ₡${(orderData.total || 0).toLocaleString('es-CR')}\n\n`;
    
    summary += `🚚 INFORMACIÓN DE ENTREGA\n${divider}\n`;
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
    
    summary += `💳 MÉTODO DE PAGO\n${divider}\n`;
    summary += `${orderData.metodoPago?.toUpperCase() || 'TARJETA'}\n`;
    if (orderData.transactionId) summary += `Transacción: ${orderData.transactionId}\n`;
    summary += `\n`;
    
    summary += `📝 OBSERVACIONES DEL CLIENTE\n${orderData.observaciones || 'Ninguna'}\n`;
    
    return summary;
};

/**
 * Enviar notificación de nuevo pedido al administrador (con reintentos y timeout).
 */
export const sendOrderNotification = async (orderData) => {
    // Si los emails están deshabilitados, retornar success sin enviar
    if (!EMAILS_ENABLED) {
        return { success: true, sent: 0, failed: 0, total: 0, _skipped: true };
    }

    try {
        // FIX #3: Validar datos antes de enviar
        validateOrderData(orderData);

        // FIX #5: Deduplicar emails si ya fue enviado exitosamente en esta sesión
        const dedupeKey = `${orderData.orderNumber}-admin`;
        if (_sentOrderIds.has(dedupeKey)) {
            console.warn('[Email] Email duplicado ignorado para orden:', orderData.orderNumber);
            return { success: true, sent: 0, failed: 0, total: 0, _duplicate: true };
        }

        if (!EMAILJS_CONFIG.publicKey) {
            console.warn('⚠️ EmailJS no está configurado.');
            return { success: false, error: 'EmailJS no configurado', sent: 0, failed: 0 };
        }

        const recipientsString = await getNotificationEmail();
        const recipients = recipientsString.split(',').map(e => e.trim()).filter(e => e);

        if (recipients.length === 0) {
            console.warn('⚠️ No hay destinatarios configurados para notificaciones');
            return { success: false, error: 'Sin destinatarios', sent: 0, failed: 0 };
        }

        // Bloque completo estilizado para que Gina lo use en un solo campo {{message}}
        const styledMessage = generateStyledSummary(orderData);

        // Función para formatear fechas de entrega (soporta múltiples fechas para packs)
        const formatDeliveryDates = (fechasEntrega) => {
            if (!fechasEntrega) return 'N/A';
            if (!Array.isArray(fechasEntrega)) return fechasEntrega;

            const validDates = fechasEntrega.filter(Boolean);
            if (validDates.length === 0) return 'N/A';
            if (validDates.length === 1) return validDates[0];

            // Múltiples fechas: formatear como lista
            return validDates.map((d, i) => `Entrega ${i + 1}: ${d}`).join('\n');
        };

        // Parámetros que coinciden con el template en EmailJS (template_k8xdi69)
        const baseParams = {
            message: styledMessage,
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
        };

        // FIX #2: Usar Promise.allSettled en vez de Promise.all
        // Esto permite que si uno falla, los demás siguen intentando
        const sendPromises = recipients.map(email =>
            sendWithRetryAndTimeout(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateId,
                { ...baseParams, to_email: email },
                EMAILJS_CONFIG.publicKey,
                3  // maxRetries
            )
        );

        const results = await Promise.allSettled(sendPromises);

        // Contar éxitos y fallos
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

        // FIX #4: Retornar objeto consistente
        if (successful > 0) {
            trackSentEmail(dedupeKey);
            return { success: true, sent: successful, failed, total: recipients.length };
        } else {
            const error = results.find(r => r.reason)?.reason?.message || 'Error desconocido';
            return { success: false, error, sent: successful, failed, total: recipients.length };
        }
    } catch (error) {
        console.error('❌ Error crítico enviando notificación:', error);
        return { success: false, error: error.message, sent: 0, failed: 0 };
    }
};

/**
 * Envía confirmación al cliente (con reintentos y timeout).
 * Falla silenciosamente si la plantilla no está configurada en EmailJS.
 */
export const sendCustomerOrderConfirmation = async (orderData) => {
    if (!EMAILS_ENABLED) {
        return { success: true, _skipped: true };
    }

    // Si no hay template de cliente configurado, saltar silenciosamente
    if (!EMAILJS_CONFIG.customerTemplateId || !EMAILJS_CONFIG.publicKey) {
        console.warn('[EmailJS] Template de cliente no configurado — saltando confirmación al cliente');
        return { success: true, _skipped: true };
    }

    try {
        const customerEmail = orderData.correo?.trim();
        if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail)) {
            console.warn('[EmailJS] Email de cliente inválido, saltando confirmación:', customerEmail);
            return { success: false, error: 'Email de cliente inválido', _skipped: true };
        }

        const dedupeKey = `${orderData.orderNumber}-customer`;
        if (_sentOrderIds.has(dedupeKey)) {
            return { success: true, _duplicate: true };
        }

        const formatDeliveryDates = (fechasEntrega) => {
            if (!fechasEntrega) return 'N/A';
            if (!Array.isArray(fechasEntrega)) return fechasEntrega;
            const valid = fechasEntrega.filter(Boolean);
            if (valid.length === 0) return 'N/A';
            if (valid.length === 1) return valid[0];
            return valid.map((d, i) => `Entrega ${i + 1}: ${d}`).join(', ');
        };

        const templateParams = {
            to_email: customerEmail,
            to_name: orderData.cliente || 'Cliente',
            orderNumber: orderData.orderNumber || 'N/A',
            cliente: orderData.cliente || 'Cliente',
            telefono: orderData.telefono || 'No especificado',
            correo: customerEmail,
            items: formatItemsForEmail(orderData.items || []),
            subtotal: `₡${(orderData.subtotal || 0).toLocaleString('es-CR')}`,
            descuento: orderData.descuento > 0 ? `₡${orderData.descuento.toLocaleString('es-CR')}` : 'Sin descuento',
            cupon: orderData.cupon || 'Sin cupón',
            envio: orderData.envioPorConfirmar ? 'Por confirmar' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`,
            total: `₡${(orderData.total || 0).toLocaleString('es-CR')}`,
            direccion: orderData.direccion || 'No especificada',
            zona: orderData.zona || 'No especificada',
            fechaEntrega: formatDeliveryDates(orderData.fechasEntrega),
            metodoPago: orderData.metodoPago || 'No especificado',
            observaciones: orderData.observaciones || 'Sin observaciones',
            message: generateStyledSummary(orderData)
        };

        const result = await sendWithRetryAndTimeout(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.customerTemplateId,
            templateParams,
            EMAILJS_CONFIG.publicKey,
            2 // menos reintentos para el cliente (no crítico)
        );

        if (result.success) {
            trackSentEmail(dedupeKey);
            return { success: true };
        } else {
            console.warn(`⚠️ No se pudo enviar confirmación al cliente: ${result.error}`);
            return { success: false, error: result.error, _skipped: true }; // Falla silenciosa
        }
    } catch (error) {
        // Falla silenciosa — el pedido ya existe en Firestore, esto es solo una confirmación
        console.warn('[EmailJS] Error en confirmación al cliente (no crítico):', error.message);
        return { success: false, error: error.message, _skipped: true };
    }
};

/**
 * Función de diagnóstico para probar la configuración desde el panel admin.
 */
export const sendTestNotification = async (targetEmail) => {
    // Si los emails están deshabilitados, retornar success sin enviar
    if (!EMAILS_ENABLED) {
        return { success: true, _skipped: true };
    }

    try {
        if (!EMAILJS_CONFIG.publicKey) throw new Error("Public Key faltante");

        const templateParams = {
            orderNumber: "#TEST-1234",
            cliente: "Usuario de Prueba",
            telefono: "0000-0000",
            correo: targetEmail,
            cedula: "0-0000-0000",
            items: "1x Test Producto - ₡2,500",
            subtotal: "₡2,500",
            descuento: "Sin descuento",
            envio: "₡0",
            total: "₡2,500",
            direccion: "San José",
            referencias: "Zona de prueba",
            zona: "San José",
            fechaEntrega: new Date().toLocaleDateString('es-CR'),
            metodoPago: "Test",
            observaciones: "Correo de prueba de configuración EmailJS",
            to_email: targetEmail,
            to_name: "Test Admin"
        };

        const result = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams, EMAILJS_CONFIG.publicKey);
        return { success: true, result };
    } catch (error) {
        console.error('[Email Test] Error completo:', {
            message: error.message,
            status: error.status,
            text: error.text,
            full: error
        });
        return { success: false, error: error.message || error };
    }
};

/**
 * Envía un correo electrónico masivo a una lista de destinatarios.
 */
export const sendBulkEmail = async (recipients, subject, message) => {
    try {
        if (!EMAILJS_CONFIG.publicKey) return { success: false, error: 'EmailJS no configurado' };
        
        const templateParams = {
            subject: subject || 'Novedades de BiKitchen',
            message: message,
            to_name: 'Cliente',
            // Usamos una variable genérica que la plantilla de EmailJS debe soportar
            to_email: '' 
        };

        const results = await Promise.allSettled(recipients.map(async (email) => {
            try {
                return await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.customerTemplateId, // Usamos la de cliente
                    { ...templateParams, to_email: email },
                    EMAILJS_CONFIG.publicKey
                );
            } catch (err) {
                console.error(`Error enviando a ${email}:`, err);
                return null;
            }
        }));

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        return { success: true, count: successCount };
    } catch (error) {
        console.error('❌ Error en envío masivo:', error);
        return { success: false, error: error.message };
    }
};

export const isEmailConfigured = () => !!(EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.serviceId);
export const getEmailConfig = () => ({
    configured: isEmailConfigured(),
    serviceId: EMAILJS_CONFIG.serviceId,
    templateId: EMAILJS_CONFIG.templateId,
    hasPublicKey: !!EMAILJS_CONFIG.publicKey
});
