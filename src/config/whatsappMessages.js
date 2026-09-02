/**
 * whatsappMessages.js
 * 
 * Configuración centralizada de mensajes de WhatsApp.
 * Los mensajes están optimizados para activar los flujos automáticos del bot.
 * 
 * ⚠️ IMPORTANTE: Cada flujo del bot tiene keywords ÚNICAS.
 * NO usar "Hola" si quieres activar un flujo específico (ej: Pack Semanal)
 * porque "Hola" activa el flujo de BIENVENIDA.
 * 
 * Ver: docs/FLUJOS_USUARIO.md para la lista completa de keywords.
 * 
 * ⚠️ NOTA: Los números de WhatsApp ahora se cargan desde Firebase.
 * Usa el hook useContactConfig() para obtener los números actualizados.
 * Este archivo mantiene valores por defecto solo como fallback.
 */

// Números por defecto (fallback) - Los valores reales vienen de Firebase
// Para cambiar los números, actualiza la colección 'config/contact' en Firebase
export const WHATSAPP_PHONE = '50685067200'; // Número de producción por defecto
export const WHATSAPP_PHONE_ALT = '50688311500';

/**
 * Formatea un número completo (50685067200) al formato visible (+506 8506-7200)
 */
export const formatWhatsAppDisplay = (phone = WHATSAPP_PHONE) =>
    `+506 ${String(phone).replace(/^506/, '').replace(/(\d{4})(\d{4})/, '$1-$2')}`;

/**
 * Número visible en textos estáticos (SEO, páginas legales, schema).
 * Estos contextos no pueden leer Firebase, así que usan el fallback.
 * Si cambia el número en Firebase, actualizar también WHATSAPP_PHONE aquí
 * y el JSON-LD de index.html.
 */
export const WHATSAPP_PHONE_DISPLAY = formatWhatsAppDisplay();

/**
 * Genera una URL de WhatsApp con mensaje prellenado
 */
export const getWhatsAppUrl = (message, phone = WHATSAPP_PHONE) => {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

/**
 * Mensajes optimizados para activar flujos del bot
 * 
 * ⚠️ REGLA CLAVE: Cada mensaje debe usar la keyword ESPECÍFICA del flujo
 * que queremos activar. NO mezclar keywords de diferentes flujos.
 * 
 * Keywords del bot (ver FLUJOS_USUARIO.md):
 * - "hola", "menu" → Bienvenida (menú principal)
 * - "pack semanal", "semanal" → Pack Semanal
 * - "pack quincenal", "quincenal" → Pack Quincenal
 * - "pack mensual", "mensual" → Pack Mensual
 * - "pack navideño", "navidad" → Pack Navideño
 * - "pack familiar", "familiar" → Pack Familiar
 * - "pack almuerzo y cena" → Pack Almuerzo y Cena
 * - "two pack", "parejas" → Two Pack
 * - "pack de proteínas", "proteinas" → Pack Proteínas
 * - "días de entrega" → Días de Entrega
 * - "zonas de cobertura" → Zonas
 * - "información general" → Info General
 * - "quiero pedir", "hacer pedido" → Flujo de Pedido
 * - "promoción mensual", "promo", "desayunos gratis" → Promoción Mensual
 */
export const WHATSAPP_MESSAGES = {
    // ============================================
    // BIENVENIDA / MENÚ PRINCIPAL
    // ⚠️ SOLO estos usan "Hola" para activar el mensaje de bienvenida completo
    // Keywords: hola, menu, menú, volver, inicio
    // ============================================
    // Antes decía "...sobre los planes de BiKitchen": la palabra "BiKitchen" es
    // keyword del flujo "Sobre Nosotros", así que competía con la bienvenida.
    BIENVENIDA: '¡Hola! 😊 Quiero conocer los planes 🍽️',
    MENU: 'Hola',

    // ============================================
    // PACKS SEMANALES
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: semanal, pack semanal
    // ============================================
    PACK_SEMANAL: 'Pack Semanal 📅',

    // ============================================
    // PACKS QUINCENALES
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: quincenal, pack quincenal
    // ============================================
    PACK_QUINCENAL: 'Pack Quincenal 📦',

    // ============================================
    // PACKS MENSUALES
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: mensual, pack mensual
    // ============================================
    PACK_MENSUAL: 'Pack Mensual 📅',

    // ============================================
    // PACK NAVIDEÑO
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: navidad, navideño, pack navideño
    // ============================================
    PACK_NAVIDENO: 'Pack Navideño 🎄',

    // ============================================
    // PACK FAMILIAR
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: familiar, pack familiar
    // ============================================
    PACK_FAMILIAR: 'Pack Familiar 👨‍👩‍👧‍👦',

    // ============================================
    // PACK ALMUERZO Y CENA
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: almuerzo y cena, pack almuerzo
    // ============================================
    PACK_ALMUERZO_CENA: 'Pack Almuerzo y Cena 🍽️',

    // ============================================
    // TWO PACK (PAREJAS)
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: parejas, two pack, para dos
    // ============================================
    TWO_PACK: 'Two Pack 💑',

    // ============================================
    // PACK DE PROTEÍNAS
    // ⚠️ SIN "Hola" - Va directo al flujo del pack
    // Keywords: proteinas, pack de proteínas
    // ============================================
    PACK_PROTEINAS: 'Pack de Proteínas 🍗',

    // ============================================
    // INFORMACIÓN
    // ⚠️ SIN "Hola" - Va directo a la info específica
    // Keywords específicas para cada flujo
    // ============================================
    DIAS_ENTREGA: 'Días de Entrega 🚚',
    ZONAS_COBERTURA: 'Zonas de Cobertura 📍',
    INFORMACION: 'Información General ℹ️',
    RECOMENDACIONES: 'Recomendaciones 📌',

    // ============================================
    // PROMOCIONES
    // ⚠️ SIN "Hola" - Va directo a la promo
    // Keywords: promo, promocion, desayunos gratis
    // ============================================
    PROMOCION_MENSUAL: 'Promo desayunos gratis 🎁',

    // ============================================
    // PEDIDOS
    // ⚠️ SIN "Hola" - Va directo al flujo de pedido
    // Keywords: quiero pedir, hacer pedido, ordenar
    // ============================================
    QUIERO_PEDIR: 'Quiero pedir 🛒',

    // Pack y plato específicos: arrancan con la keyword exacta para que el bot
    // entre al flujo de pedido, y recién después va el detalle para la persona
    // que atiende.
    //
    // ⚠️ OJO: el nombre del pack o del plato ES keyword de otro flujo ("Pack
    // Familiar" activa el flujo Pack Familiar, un plato con "pollo" activa Pack
    // de Proteínas). Poner "Quiero pedir" de primero ayuda, pero esto no se
    // arregla del todo desde el sitio: hace falta un flujo en Kommo que reciba
    // "quiero pedir" junto con el nombre del producto.
    PACK_ORDER: (packName, fromPrice) => `Quiero pedir 🛒\n\n📦 ${packName}\n💰 Desde ${fromPrice}`,

    INDIVIDUAL_ORDER: (productName, price) => `Quiero pedir 🛒\n\n🍽️ ${productName}\n💰 ${price}`,

    // ============================================
    // SOPORTE / AYUDA
    // Estos NO llevan "Hola" a propósito: "hola" activa el menú de bienvenida,
    // así que un cliente con un problema terminaba viendo el menú de ventas en
    // vez de hablar con alguien. Sin keyword de ningún flujo, la conversación
    // cae donde tiene que caer: en una persona.
    // ============================================
    AYUDA_CUENTA: 'Necesito ayuda con mi cuenta 🔐',
    AYUDA_GENERAL: 'Tengo una consulta 💬',
    CONSULTA_PEDIDO: (orderNumber) => `Tengo una consulta sobre mi pedido ${orderNumber} 📦`,
};

/**
 * URLs de WhatsApp pre-construidas para uso común
 */
export const WHATSAPP_URLS = {
    // Menú principal - activa bienvenida del bot
    INICIO: getWhatsAppUrl(WHATSAPP_MESSAGES.BIENVENIDA),

    // Packs
    PACK_SEMANAL: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_SEMANAL),
    PACK_QUINCENAL: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_QUINCENAL),
    PACK_MENSUAL: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_MENSUAL),
    PACK_NAVIDENO: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_NAVIDENO),
    PACK_FAMILIAR: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_FAMILIAR),
    PACK_ALMUERZO_CENA: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_ALMUERZO_CENA),
    TWO_PACK: getWhatsAppUrl(WHATSAPP_MESSAGES.TWO_PACK),
    PACK_PROTEINAS: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_PROTEINAS),

    // Información
    DIAS_ENTREGA: getWhatsAppUrl(WHATSAPP_MESSAGES.DIAS_ENTREGA),
    ZONAS: getWhatsAppUrl(WHATSAPP_MESSAGES.ZONAS_COBERTURA),
    INFO: getWhatsAppUrl(WHATSAPP_MESSAGES.INFORMACION),

    // Promociones
    PROMOCION: getWhatsAppUrl(WHATSAPP_MESSAGES.PROMOCION_MENSUAL),

    // Pedidos
    PEDIR: getWhatsAppUrl(WHATSAPP_MESSAGES.QUIERO_PEDIR),

    // Soporte
    AYUDA: getWhatsAppUrl(WHATSAPP_MESSAGES.AYUDA_GENERAL),
    AYUDA_CUENTA: getWhatsAppUrl(WHATSAPP_MESSAGES.AYUDA_CUENTA),
};

/**
 * Genera URL de WhatsApp para consulta de pedido específico
 */
export const getOrderInquiryUrl = (orderNumber) => {
    return getWhatsAppUrl(WHATSAPP_MESSAGES.CONSULTA_PEDIDO(orderNumber));
};

/**
 * Genera URL de WhatsApp para compartir (sin número destino)
 */
export const getShareWhatsAppUrl = (message) => {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
};

export default WHATSAPP_MESSAGES;
