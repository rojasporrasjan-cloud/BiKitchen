/**
 * Email Service para BiKitchen
 * 
 * Este servicio maneja el envío de emails transaccionales.
 * Usa EmailJS (gratuito hasta 200 emails/mes) o puede conectarse a un backend.
 * 
 * OPCIONES DE INTEGRACIÓN:
 * 
 * 1. EmailJS (Recomendado para empezar - GRATIS)
 *    - Crear cuenta en https://www.emailjs.com/
 *    - Configurar servicio de email (Gmail, Outlook, etc.)
 *    - Crear templates de email
 *    - Obtener Service ID, Template ID y Public Key
 * 
 * 2. Firebase Functions + Nodemailer (Más control)
 *    - Requiere plan Blaze de Firebase
 *    - Más personalizable
 * 
 * 3. SendGrid / Mailgun / AWS SES (Producción)
 *    - Para alto volumen de emails
 *    - Requiere backend
 */

// Configuración de EmailJS (reemplazar con tus credenciales)
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID',      // Ej: 'service_bikitchen'
    publicKey: 'YOUR_PUBLIC_KEY',       // Ej: 'abc123xyz'
    templates: {
        orderConfirmation: 'template_order_confirm',
        orderStatus: 'template_order_status',
        welcome: 'template_welcome',
        passwordReset: 'template_password_reset',
        promotional: 'template_promo'
    }
};

// Verificar si EmailJS está configurado
const isConfigured = () => {
    return EMAILJS_CONFIG.serviceId !== 'YOUR_SERVICE_ID' && 
           EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY';
};

/**
 * Inicializar EmailJS (llamar una vez en App.jsx)
 */
export async function initEmailService() {
    if (!isConfigured()) {
        console.warn('[EmailService] No configurado. Los emails no se enviarán.');
        return false;
    }

    try {
        // Cargar EmailJS dinámicamente
        const emailjs = await import('@emailjs/browser');
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('[EmailService] Inicializado correctamente');
        return true;
    } catch (error) {
        console.error('[EmailService] Error al inicializar:', error);
        return false;
    }
}

/**
 * Enviar email de confirmación de pedido
 */
export async function sendOrderConfirmation(orderData) {
    if (!isConfigured()) {
        console.log('[EmailService] Simulando envío de confirmación:', orderData.orderNumber);
        return { success: true, simulated: true };
    }

    try {
        const emailjs = await import('@emailjs/browser');
        
        const templateParams = {
            to_email: orderData.email,
            to_name: orderData.nombre,
            order_number: orderData.orderNumber,
            order_date: new Date().toLocaleDateString('es-CR'),
            delivery_date: orderData.fechaEntrega,
            delivery_time: orderData.horarioPreferido === 'mañana' ? '8am - 12pm' : '12pm - 6pm',
            delivery_address: orderData.direccion,
            items_list: formatItemsList(orderData.items),
            subtotal: formatCurrency(orderData.subtotal),
            discount: orderData.discount ? formatCurrency(orderData.discount) : '₡0',
            total: formatCurrency(orderData.total),
            payment_method: getPaymentMethodName(orderData.metodoPago)
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.orderConfirmation,
            templateParams
        );

        console.log('[EmailService] Confirmación enviada:', response);
        return { success: true, response };
    } catch (error) {
        console.error('[EmailService] Error enviando confirmación:', error);
        return { success: false, error };
    }
}

/**
 * Enviar email de actualización de estado del pedido
 */
export async function sendOrderStatusUpdate(orderData, newStatus) {
    if (!isConfigured()) {
        console.log('[EmailService] Simulando actualización de estado:', orderData.orderNumber, newStatus);
        return { success: true, simulated: true };
    }

    try {
        const emailjs = await import('@emailjs/browser');
        
        const statusMessages = {
            'confirmado': '¡Tu pedido ha sido confirmado! Estamos preparándolo.',
            'preparando': 'Estamos preparando tu pedido con mucho cariño.',
            'listo': '¡Tu pedido está listo! Pronto saldrá a entrega.',
            'en_camino': '¡Tu pedido va en camino! Llegará pronto.',
            'entregado': '¡Pedido entregado! Esperamos que lo disfrutes.',
            'cancelado': 'Tu pedido ha sido cancelado. Contáctanos si tienes dudas.'
        };

        const templateParams = {
            to_email: orderData.email,
            to_name: orderData.nombre,
            order_number: orderData.orderNumber,
            new_status: newStatus,
            status_message: statusMessages[newStatus] || 'Estado actualizado',
            status_emoji: getStatusEmoji(newStatus)
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.orderStatus,
            templateParams
        );

        return { success: true, response };
    } catch (error) {
        console.error('[EmailService] Error enviando actualización:', error);
        return { success: false, error };
    }
}

/**
 * Enviar email de bienvenida a nuevo usuario
 */
export async function sendWelcomeEmail(userData) {
    if (!isConfigured()) {
        console.log('[EmailService] Simulando email de bienvenida:', userData.email);
        return { success: true, simulated: true };
    }

    try {
        const emailjs = await import('@emailjs/browser');
        
        const templateParams = {
            to_email: userData.email,
            to_name: userData.nombre || 'Cliente',
            welcome_discount: 'BIENVENIDO10' // Cupón de bienvenida
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templates.welcome,
            templateParams
        );

        return { success: true, response };
    } catch (error) {
        console.error('[EmailService] Error enviando bienvenida:', error);
        return { success: false, error };
    }
}

/**
 * Enviar email promocional
 */
export async function sendPromotionalEmail(emailList, promoData) {
    if (!isConfigured()) {
        console.log('[EmailService] Simulando email promocional a', emailList.length, 'destinatarios');
        return { success: true, simulated: true, count: emailList.length };
    }

    const results = [];
    
    for (const email of emailList) {
        try {
            const emailjs = await import('@emailjs/browser');
            
            const templateParams = {
                to_email: email,
                promo_title: promoData.title,
                promo_description: promoData.description,
                promo_code: promoData.code,
                promo_discount: promoData.discount,
                promo_expiry: promoData.expiryDate
            };

            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templates.promotional,
                templateParams
            );

            results.push({ email, success: true });
        } catch (error) {
            results.push({ email, success: false, error });
        }
    }

    return { 
        success: true, 
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
    };
}

// ============================================
// Funciones auxiliares
// ============================================

function formatItemsList(items) {
    if (!items || !Array.isArray(items)) return '';
    
    return items.map(item => 
        `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}`
    ).join('\n');
}

function formatCurrency(amount) {
    return `₡${Number(amount).toLocaleString('es-CR')}`;
}

function getPaymentMethodName(method) {
    const methods = {
        'paypal': 'PayPal / Tarjeta',
        'whatsapp': 'Coordinado por WhatsApp',
        'sinpe': 'SINPE Móvil',
        'transfer': 'Transferencia Bancaria'
    };
    return methods[method] || method;
}

function getStatusEmoji(status) {
    const emojis = {
        'confirmado': '✅',
        'preparando': '👨‍🍳',
        'listo': '📦',
        'en_camino': '🚗',
        'entregado': '🎉',
        'cancelado': '❌'
    };
    return emojis[status] || '📋';
}

// ============================================
// Templates HTML para emails (referencia)
// ============================================

/**
 * Template de ejemplo para EmailJS - Confirmación de Pedido
 * 
 * Crear en EmailJS con estas variables:
 * 
 * <html>
 * <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
 *   <div style="background: linear-gradient(135deg, #FF671D, #E9A84A); padding: 20px; text-align: center;">
 *     <h1 style="color: white; margin: 0;">🍽️ BiKitchen</h1>
 *   </div>
 *   
 *   <div style="padding: 30px; background: #fff;">
 *     <h2>¡Gracias por tu pedido, {{to_name}}!</h2>
 *     
 *     <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
 *       <p><strong>Pedido #{{order_number}}</strong></p>
 *       <p>Fecha: {{order_date}}</p>
 *     </div>
 *     
 *     <h3>Detalles del pedido:</h3>
 *     <pre style="background: #f9f9f9; padding: 15px; border-radius: 8px;">{{items_list}}</pre>
 *     
 *     <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
 *       <p>Subtotal: {{subtotal}}</p>
 *       <p>Descuento: {{discount}}</p>
 *       <p style="font-size: 18px;"><strong>Total: {{total}}</strong></p>
 *     </div>
 *     
 *     <div style="background: #FFF8F0; padding: 15px; border-radius: 8px; margin-top: 20px;">
 *       <h4>📍 Entrega</h4>
 *       <p>{{delivery_address}}</p>
 *       <p>{{delivery_date}} - {{delivery_time}}</p>
 *     </div>
 *     
 *     <p style="margin-top: 20px;">Método de pago: {{payment_method}}</p>
 *   </div>
 *   
 *   <div style="background: #333; color: #fff; padding: 20px; text-align: center;">
 *     <p>Ingredientes frescos, sabor de casa</p>
 *     <p>WhatsApp: +506 8506-7200</p>
 *   </div>
 * </body>
 * </html>
 */

export default {
    initEmailService,
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendWelcomeEmail,
    sendPromotionalEmail
};
