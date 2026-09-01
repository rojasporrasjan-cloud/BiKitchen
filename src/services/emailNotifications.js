import emailjs from '@emailjs/browser';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import {
    formatItemsForEmail,
    generateStyledSummary,
    buildAdminTemplateParams
} from '../utils/orderEmailFormat';

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

// Endpoint REST de EmailJS — el mismo que usa el SDK por debajo.
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Enviar email con reintentos y timeout.
 *
 * Usa fetch con `keepalive: true` en vez de emailjs.send() a propósito: el
 * navegador garantiza que una petición keepalive se termine de entregar aunque
 * la página pase a segundo plano o se cierre. Eso es exactamente lo que pasa
 * cuando el cliente salta a WhatsApp o cierra la pestaña apenas paga — con el
 * SDK normal, iOS Safari congela la pestaña y el aviso nunca sale.
 *
 * @param {string} serviceId - EmailJS service ID
 * @param {string} templateId - EmailJS template ID
 * @param {object} params - Parámetros del template
 * @param {string} publicKey - EmailJS public key
 * @param {number} maxRetries - Máximo de reintentos (default 3)
 * @returns {Promise<object>} Resultado del envío
 */
async function sendWithRetryAndTimeout(serviceId, templateId, params, publicKey, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let timedOut = false;
        let timeoutId;
        try {
            // Mismo payload que arma @emailjs/browser 4.4.1 en send.js
            const body = JSON.stringify({
                lib_version: '4.4.1',
                user_id: publicKey,
                service_id: serviceId,
                template_id: templateId,
                template_params: params
            });

            // keepalive tiene un tope de 64KB de cuerpo. Un pedido enorme podría
            // pasarse y hacer que fetch falle de una: en ese caso se manda sin
            // keepalive, que es peor que con él pero mucho mejor que no mandarlo.
            const bodyBytes = new TextEncoder().encode(body).length;

            const request = fetch(EMAILJS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: bodyBytes < 60000,
                body
            });

            // Si gana el timeout, nadie más escucharía un rechazo posterior de fetch.
            // Este handler vacío lo evita sin alterar el resultado de la carrera.
            request.catch(() => { });

            // El timeout deja de ESPERAR la respuesta; no cancela el envío.
            // Con keepalive el navegador sigue entregando la petición por su cuenta.
            const response = await Promise.race([
                request,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        timedOut = true;
                        reject(new Error('Timeout esperando EmailJS (5s)'));
                    }, 5000);
                })
            ]);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                throw new Error(`EmailJS ${response.status}: ${detail || response.statusText}`);
            }

            return { success: true, result: 'OK', attempt };
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn(`[EmailJS] Intento ${attempt}/${maxRetries} falló para ${params.to_email}: ${error.message}`);

            // Tras un timeout NO se reintenta: la petición original sigue viva por
            // keepalive y un reintento le mandaría el correo duplicado a Gina.
            if (timedOut) {
                return {
                    success: false,
                    error: 'Sin respuesta de EmailJS en 5s — el envío sigue en curso (keepalive)',
                    attempt,
                    _pending: true
                };
            }

            const isLastAttempt = attempt === maxRetries;
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

        // Los mismos campos que arma la función programada de Netlify, para que
        // el correo se vea idéntico salga por donde salga.
        const baseParams = buildAdminTemplateParams(orderData);

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

        // El correo al cliente lista las fechas en una sola línea separadas por
        // coma; el del admin las pone una por renglón. Por eso no usa la versión
        // compartida: no produce la misma salida.
        const formatDeliveryDatesInline = (fechasEntrega) => {
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
            fechaEntrega: formatDeliveryDatesInline(orderData.fechasEntrega),
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

        // Usa exactamente el mismo camino de envío que los pedidos reales,
        // para que esta prueba sirva para verificar que el envío funciona.
        const result = await sendWithRetryAndTimeout(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams,
            EMAILJS_CONFIG.publicKey,
            1 // sin reintentos: en una prueba querés ver el error real
        );

        if (!result.success) throw new Error(result.error);
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
