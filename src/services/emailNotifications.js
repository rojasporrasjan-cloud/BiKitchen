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
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
};

// Email por defecto para notificaciones
const DEFAULT_NOTIFICATION_EMAIL = 'ginamaroli@gmail.com';

/**
 * Obtener el email de notificaciones configurado en Firebase
 * Si no existe configuración, usa el email por defecto
 */
const getNotificationEmail = async () => {
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
    return items.map(item => {
        let line = `${item.quantity}× ${item.name}`;

        // Agregar plan si existe
        if (item.planLabel && item.planLabel !== 'Mensual') {
            line += ` (${item.planLabel})`;
        }

        // Agregar precio
        const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        line += ` - ₡${itemTotal.toLocaleString('es-CR')}`;

        // Agregar proteínas si existen
        if (item.proteinas && Array.isArray(item.proteinas) && item.proteinas.length > 0) {
            line += `\n   └ Proteínas: ${item.proteinas.join(', ')}`;
        }

        // Agregar notas si existen
        if (item.customizations?.notes) {
            line += `\n   └ Notas: ${item.customizations.notes}`;
        }

        return line;
    }).join('\n\n');
};

/**
 * Formatear fechas de entrega
 */
const formatDeliveryDates = (dates) => {
    if (!dates || dates.length === 0) return 'No especificado';

    if (dates.length === 1) {
        return dates[0];
    }

    return dates.map((date, index) => `Entrega ${index + 1}: ${date}`).join('\n');
};

/**
 * Enviar notificación de nuevo pedido por email
 * 
 * @param {Object} orderData - Datos del pedido
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
export const sendOrderNotification = async (orderData) => {
    try {
        // Validar que EmailJS esté configurado
        if (!EMAILJS_CONFIG.publicKey) {
            console.warn('⚠️ EmailJS no está configurado. Saltando notificación por email.');
            return false;
        }

        // Obtener email de destino
        const recipientEmail = await getNotificationEmail();

        // Preparar datos para la plantilla
        const templateParams = {
            to_email: recipientEmail,
            orderNumber: orderData.orderNumber || 'N/A',
            cliente: orderData.cliente || 'Cliente',
            telefono: orderData.telefono || 'No especificado',
            correo: orderData.correo || 'No especificado',
            cedula: orderData.cedula || 'No especificado',
            items: formatItemsForEmail(orderData.items || []),
            subtotal: `₡${(orderData.subtotal || 0).toLocaleString('es-CR')}`,
            descuento: orderData.descuento > 0
                ? `₡${orderData.descuento.toLocaleString('es-CR')} (${orderData.cupon || 'Cupón'})`
                : 'Sin descuento',
            envio: orderData.envioPorConfirmar
                ? 'Por confirmar ⚠️'
                : (orderData.costoEnvio !== null
                    ? `₡${orderData.costoEnvio.toLocaleString('es-CR')}`
                    : 'Incluido'),
            total: `₡${(orderData.total || 0).toLocaleString('es-CR')}`,
            direccion: orderData.direccion || 'No especificada',
            referencias: orderData.referencias || 'Sin referencias',
            zona: orderData.zona || 'No especificada',
            fechaEntrega: orderData.fechasEntrega && orderData.fechasEntrega.length > 0
                ? formatDeliveryDates(orderData.fechasEntrega)
                : (orderData.fechaEntrega || 'No especificada'),
            metodoPago: orderData.metodoPago?.toUpperCase() || 'NO ESPECIFICADO',
            observaciones: orderData.observaciones || 'Sin observaciones',
            // URL al admin panel (opcional)
            adminUrl: `${window.location.origin}/admin/orders`
        };

        // Enviar email
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams,
            EMAILJS_CONFIG.publicKey
        );

        console.log('✅ Email de notificación enviado:', response.status, response.text);
        return true;

    } catch (error) {
        console.error('❌ Error enviando email de notificación:', error);
        // No lanzar error para no bloquear el pedido
        return false;
    }
};

/**
 * Verificar si EmailJS está configurado correctamente
 */
export const isEmailConfigured = () => {
    return !!(EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId);
};

/**
 * Obtener configuración actual de EmailJS (para mostrar en admin)
 */
export const getEmailConfig = () => {
    return {
        configured: isEmailConfigured(),
        serviceId: EMAILJS_CONFIG.serviceId,
        templateId: EMAILJS_CONFIG.templateId,
        hasPublicKey: !!EMAILJS_CONFIG.publicKey
    };
};
