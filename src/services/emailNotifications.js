import emailjs from '@emailjs/browser';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

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

// Email por defecto para notificaciones
const DEFAULT_NOTIFICATION_EMAIL = 'ginamaroli@gmail.com';

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
 * Formatear items del pedido para el email
 */
const formatItemsForEmail = (items) => {
    if (!items || !Array.isArray(items)) return "Sin items";
    return items.map(item => {
        let line = `${item.quantity}× ${item.name}`;
        if (item.planLabel && item.planLabel !== 'Mensual') line += ` (${item.planLabel})`;
        const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        line += ` - ₡${itemTotal.toLocaleString('es-CR')}`;
        if (item.proteinas?.length) line += `\n   └ Proteínas: ${item.proteinas.join(', ')}`;
        if (item.customizations?.notes) line += `\n   └ Notas: ${item.customizations.notes}`;
        return line;
    }).join('\n\n');
};

/**
 * Formatear fechas de entrega
 */
const formatDeliveryDates = (dates) => {
    if (!dates || dates.length === 0) return 'No especificado';
    if (dates.length === 1) return dates[0];
    return dates.map((date, index) => `Entrega ${index + 1}: ${date}`).join('\n');
};

/**
 * Enviar notificación de nuevo pedido al administrador.
 * Soporta múltiples destinatarios (separados por coma).
 */
export const sendOrderNotification = async (orderData) => {
    try {
        if (!EMAILJS_CONFIG.publicKey) {
            console.warn('⚠️ EmailJS no está configurado.');
            return false;
        }

        const recipientsString = await getNotificationEmail();
        const recipients = recipientsString.split(',').map(e => e.trim()).filter(e => e);

        console.log(`[Email] Enviando notificación a: ${recipients.join(', ')}`);

        // Preparar parámetros comunes
        const baseParams = {
            orderNumber: orderData.orderNumber || 'N/A',
            cliente: orderData.cliente || 'Cliente',
            telefono: orderData.telefono || 'No especificado',
            correo: orderData.correo || 'No especificado',
            cedula: orderData.cedula || 'No especificado',
            items: formatItemsForEmail(orderData.items || []),
            items_text: (orderData.items || []).map(i => `${i.quantity}x ${i.name}`).join(', '),
            subtotal: `₡${(orderData.subtotal || 0).toLocaleString('es-CR')}`,
            descuento: orderData.descuento > 0
                ? `₡${orderData.descuento.toLocaleString('es-CR')} (${orderData.cupon || 'Cupón'})`
                : 'Sin descuento',
            envio: orderData.envioPorConfirmar ? 'Por confirmar ⚠️' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`,
            total: `₡${(orderData.total || 0).toLocaleString('es-CR')}`,
            direccion: orderData.direccion || 'No especificada',
            referencias: orderData.referencias || 'Sin referencias',
            zona: orderData.zona || 'No especificada',
            fechaEntrega: orderData.fechasEntrega ? formatDeliveryDates(orderData.fechasEntrega) : (orderData.fechaEntrega || 'N/A'),
            metodoPago: orderData.metodoPago || 'Tarjeta (Procesado)',
            transaccion: orderData.transactionId || 'No disponible',
            observaciones: orderData.observaciones || 'Sin observaciones',
            fuente: orderData.fuente || 'Directo',
            admin_email: recipientsString, // Alias para responder a
            to_name: "Admin BiKitchen"
        };

        // Enviar a cada destinatario de forma independiente
        const results = await Promise.all(recipients.map(email => 
            emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, { ...baseParams, to_email: email }, EMAILJS_CONFIG.publicKey)
        ));

        console.log('✅ Notificaciones enviadas exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        return false;
    }
};

/**
 * Envía confirmación al cliente.
 */
export const sendCustomerOrderConfirmation = async (orderData) => {
    try {
        if (!EMAILJS_CONFIG.publicKey) return false;
        
        const customerEmail = orderData.correo || orderData.email;
        if (!customerEmail) return false;

        const templateParams = {
            to_email: customerEmail,
            to_name: orderData.nombre || orderData.cliente || 'Cliente',
            orderNumber: orderData.orderNumber || 'N/A',
            fecha: new Date().toLocaleDateString('es-CR'),
            items_summary: formatItemsForEmail(orderData.items || []),
            total: `₡${(orderData.total || 0).toLocaleString('es-CR')}`,
            direccion: orderData.direccion || 'Domicilio',
            metodoPago: orderData.metodoPago || 'Tarjeta',
            transaccion: orderData.transactionId || 'Referencia bancaria'
        };

        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.customerTemplateId, templateParams, EMAILJS_CONFIG.publicKey);
        console.log('✅ Confirmación enviada al cliente');
        return true;
    } catch (error) {
        console.error('❌ Error enviando email al cliente:', error);
        return false;
    }
};

/**
 * Función de diagnóstico para probar la configuración desde el panel admin.
 */
export const sendTestNotification = async (targetEmail) => {
    try {
        if (!EMAILJS_CONFIG.publicKey) throw new Error("Public Key faltante");

        const templateParams = {
            orderNumber: "#TEST-1234",
            cliente: "Usuario de Prueba",
            total: "₡0",
            items: "1x Producto de Prueba",
            to_email: targetEmail,
            message: "Esta es una prueba de configuración de correo desde el panel de BiKitchen."
        };

        const result = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams, EMAILJS_CONFIG.publicKey);
        return { success: true, result };
    } catch (error) {
        console.error('[Email Test] Error:', error);
        return { success: false, error: error.message || error };
    }
};

export const isEmailConfigured = () => !!(EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.serviceId);
export const getEmailConfig = () => ({
    configured: isEmailConfigured(),
    serviceId: EMAILJS_CONFIG.serviceId,
    templateId: EMAILJS_CONFIG.templateId,
    hasPublicKey: !!EMAILJS_CONFIG.publicKey
});
