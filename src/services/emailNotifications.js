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
/**
 * Formatear items del pedido para el email con estilo ASCII (Gina Style)
 */
const formatItemsForEmail = (items) => {
    if (!items || !Array.isArray(items)) return "Sin items";
    return items.map(item => {
        const itemPlan = item.planLabel && item.planLabel !== 'Mensual' ? ` (${item.planLabel})` : '';
        const categoryPrefix = item.categoryLabel ? `${item.categoryLabel} - ` : '';
        const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        let line = `${item.quantity}× ${categoryPrefix}${item.name}${itemPlan} - ₡${itemTotal.toLocaleString('es-CR')}`;
        
        // Soporta varios formatos de proteínas para asegurar que siempre se envíen
        const proteinas = item.proteinas || (item.proteina ? [item.proteina] : []) || (item.protein ? [item.protein] : []);
        if (proteinas.length > 0) {
            line += `\n└ Proteínas: ${proteinas.join(', ')}`;
        }
        
        if (item.customizations?.notes) line += `\n└ Notas: ${item.customizations.notes}`;
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
    summary += `Envio: ${orderData.envioPorConfirmar ? 'Por confirmar ⚠️' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`}\n`;
    summary += `${divider}\n`;
    summary += `TOTAL: ₡${(orderData.total || 0).toLocaleString('es-CR')}\n\n`;
    
    summary += `🚚 INFORMACIÓN DE ENTREGA\n${divider}\n`;
    summary += `Zona: ${orderData.zona}\n`;
    summary += `Dirección: ${orderData.direccion}\n`;
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
 * Enviar notificación de nuevo pedido al administrador.
 */
export const sendOrderNotification = async (orderData) => {
    try {
        if (!EMAILJS_CONFIG.publicKey) {
            console.warn('⚠️ EmailJS no está configurado.');
            return false;
        }

        const recipientsString = await getNotificationEmail();
        const recipients = recipientsString.split(',').map(e => e.trim()).filter(e => e);

        // Bloque completo estilizado para que Gina lo use en un solo campo {{message}}
        const styledMessage = generateStyledSummary(orderData);

        const baseParams = {
            message: styledMessage, // <--- Este es el campo "mágico"
            orderNumber: orderData.orderNumber || 'N/A',
            cliente: orderData.cliente || 'Cliente',
            telefono: orderData.telefono || 'No especificado',
            correo: orderData.correo || 'No especificado',
            cedula: orderData.cedula || 'No especificado',
            items: formatItemsForEmail(orderData.items || []),
            subtotal: `₡${(orderData.subtotal || 0).toLocaleString('es-CR')}`,
            descuento: orderData.descuento > 0 ? `₡${orderData.descuento.toLocaleString('es-CR')}` : 'Sin descuento',
            envio: orderData.envioPorConfirmar ? 'Por confirmar ⚠️' : `₡${(orderData.costoEnvio || 0).toLocaleString('es-CR')}`,
            total: `₡${(orderData.total || 0).toLocaleString('es-CR')}`,
            direccion: orderData.direccion || 'No especificada',
            referencias: orderData.referencias || 'Sin referencias',
            zona: orderData.zona || 'No especificada',
            fechaEntrega: orderData.fechasEntrega ? (Array.isArray(orderData.fechasEntrega) ? orderData.fechasEntrega[0] : orderData.fechasEntrega) : 'N/A',
            metodoPago: orderData.metodoPago || 'Tarjeta (Procesado)',
            transaccion: orderData.transactionId || 'No disponible',
            observaciones: orderData.observaciones || 'Sin observaciones',
            to_name: "Admin BiKitchen"
        };

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

        const styledMessage = generateStyledSummary(orderData);

        const templateParams = {
            message: styledMessage, 
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

        const results = await Promise.all(recipients.map(async (email) => {
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

        const successCount = results.filter(r => r !== null).length;
        console.log(`✅ Bulk Email: ${successCount}/${recipients.length} enviados`);
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
