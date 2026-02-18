/**
 * Facebook Pixel Service
 * Servicio para trackear eventos de conversión en Facebook
 * Pixel ID: 825371743662986
 * 
 * Production-ready setup for Meta Ads optimization
 */

// Event deduplication: track fired events to prevent duplicates
const firedEvents = new Map();

/**
 * Verifica si Facebook Pixel está cargado
 */
const isFbqLoaded = () => {
    return typeof window !== 'undefined' && typeof window.fbq === 'function';
};

/**
 * Inicializa el Pixel con el ID proporcionado
 * @param {string} pixelId - ID del Pixel de Facebook
 */
export const initPixel = (pixelId = '825371743662986') => {
    if (!isFbqLoaded()) {
        console.warn('[FB Pixel] Facebook Pixel not loaded yet');
        return;
    }

    // Check if already initialized to avoid duplicate ID error
    if (window.fbq.getState && window.fbq.getState().pixels && window.fbq.getState().pixels.length > 0) {
        // Already initialized, check if it's the same ID
        const initializedPixels = window.fbq.getState().pixels;
        const exists = initializedPixels.some(p => p.id === pixelId);
        if (exists) {
            console.log('[FB Pixel] Already initialized with ID:', pixelId);
            return;
        }
    }

    // Fallback simple check using internal flag if getState is not available (older versions)
    if (window._fbq_initialized) {
        console.log('[FB Pixel] Already initialized (flag check)');
        return;
    }

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    window._fbq_initialized = true;
    console.log('[FB Pixel] Initialized with ID:', pixelId);
};

/**
 * Genera un ID único para el evento basado en nombre y parámetros clave
 */
const getEventId = (eventName, params = {}) => {
    const key = params.content_name || params.content_ids?.[0] || params.search_string || '';
    return `${eventName}_${key}_${Date.now()}`;
};

/**
 * Verifica si un evento ya fue disparado recientemente (últimos 2 segundos)
 */
const wasRecentlyFired = (eventName, params = {}) => {
    const key = `${eventName}_${params.content_name || params.content_ids?.[0] || ''}`;
    const lastFired = firedEvents.get(key);
    const now = Date.now();

    if (lastFired && (now - lastFired) < 2000) {
        return true; // Evento disparado hace menos de 2 segundos
    }

    firedEvents.set(key, now);

    // Limpiar eventos antiguos (más de 5 segundos)
    for (const [k, time] of firedEvents.entries()) {
        if (now - time > 5000) {
            firedEvents.delete(k);
        }
    }

    return false;
};

/**
 * Track evento genérico con protección contra duplicados
 * @param {string} eventName - Nombre del evento
 * @param {object} params - Parámetros adicionales
 * @param {boolean} allowDuplicates - Permitir duplicados (default: false)
 */
export const trackEvent = (eventName, params = {}, allowDuplicates = false) => {
    if (!isFbqLoaded()) {
        console.warn('[FB Pixel] Pixel not loaded yet');
        return;
    }

    // Prevenir duplicados a menos que se permita explícitamente
    if (!allowDuplicates && wasRecentlyFired(eventName, params)) {
        console.log(`[FB Pixel] Event ${eventName} skipped (duplicate prevention)`);
        return;
    }

    try {
        window.fbq('track', eventName, params);
        console.log(`[FB Pixel] ✓ Event tracked: ${eventName}`, params);
    } catch (error) {
        console.error('[FB Pixel] Error tracking event:', error);
    }
};

/**
 * Track evento personalizado
 * @param {string} eventName - Nombre del evento personalizado
 * @param {object} params - Parámetros adicionales
 */
export const trackCustomEvent = (eventName, params = {}) => {
    if (isFbqLoaded()) {
        try {
            window.fbq('trackCustom', eventName, params);
            console.log(`[FB Pixel] Custom event tracked: ${eventName}`, params);
        } catch (error) {
            console.error('[FB Pixel] Error tracking custom event:', error);
        }
    }
};

// ==================== EVENTOS ESTÁNDAR ====================

/**
 * Track cuando un usuario ve contenido (automático en PageView)
 */
export const trackPageView = () => {
    trackEvent('PageView');
};

/**
 * Track cuando un usuario ve un producto
 * @param {object} product - Información del producto
 */
export const trackViewContent = (product) => {
    trackEvent('ViewContent', {
        content_name: product.name || product.titulo,
        content_category: product.category || 'Pack',
        content_ids: [product.id],
        content_type: 'product',
        value: product.price || product.precio || 0,
        currency: 'CRC'
    });
};

/**
 * Track cuando un usuario agrega al carrito
 * @param {object} item - Item agregado
 */
export const trackAddToCart = (item) => {
    trackEvent('AddToCart', {
        content_name: item.name,
        content_ids: [item.id],
        content_type: 'product',
        value: item.price * (item.quantity || 1),
        currency: 'CRC',
        quantity: item.quantity || 1
    });
};

/**
 * Track cuando un usuario inicia el checkout
 * @param {array} items - Items en el carrito
 * @param {number} total - Total del carrito
 */
export const trackInitiateCheckout = (items, total) => {
    trackEvent('InitiateCheckout', {
        content_ids: items.map(item => item.id),
        contents: items.map(item => ({
            id: item.id,
            quantity: item.quantity || 1,
            item_price: item.price
        })),
        content_type: 'product',
        value: total,
        currency: 'CRC',
        num_items: items.length
    });
};

/**
 * Track cuando se completa una compra
 * @param {object} orderData - Datos del pedido
 */
export const trackPurchase = (orderData) => {
    trackEvent('Purchase', {
        content_ids: orderData.items?.map(item => item.id) || [],
        contents: orderData.items?.map(item => ({
            id: item.id,
            quantity: item.quantity || 1,
            item_price: item.price
        })) || [],
        content_type: 'product',
        value: orderData.total,
        currency: 'CRC',
        num_items: orderData.items?.length || 0,
        order_id: orderData.orderNumber || orderData.id
    });
};

/**
 * Track cuando un usuario busca
 * @param {string} searchQuery - Término de búsqueda
 */
export const trackSearch = (searchQuery) => {
    trackEvent('Search', {
        search_string: searchQuery
    });
};

/**
 * Track cuando un usuario se registra
 * @param {string} method - Método de registro (email, google, etc)
 */
export const trackCompleteRegistration = (method = 'email') => {
    trackEvent('CompleteRegistration', {
        content_name: 'Registro BiKitchen',
        status: 'completed',
        registration_method: method
    });
};

/**
 * Track cuando un usuario inicia sesión
 */
export const trackLogin = () => {
    trackCustomEvent('Login', {
        content_name: 'Usuario inició sesión'
    });
};

/**
 * Track cuando un usuario contacta por WhatsApp
 * @param {string} message - Mensaje enviado
 */
export const trackContact = (message = '') => {
    trackEvent('Contact', {
        content_name: 'WhatsApp Contact',
        message_type: 'whatsapp'
    });
};

/**
 * Track cuando un usuario ve la lista de productos
 * @param {string} category - Categoría vista
 */
export const trackViewCategory = (category) => {
    trackCustomEvent('ViewCategory', {
        content_category: category
    });
};

/**
 * Track cuando un usuario agrega información de pago
 */
export const trackAddPaymentInfo = () => {
    trackEvent('AddPaymentInfo', {
        content_name: 'Información de pago agregada'
    });
};

/**
 * Track cuando un usuario comparte contenido
 * @param {string} contentType - Tipo de contenido compartido
 */
export const trackShare = (contentType) => {
    trackCustomEvent('Share', {
        content_type: contentType
    });
};

// ==================== EVENTOS PERSONALIZADOS ====================

/**
 * Track cuando un usuario ve un pack específico
 * @param {string} packName - Nombre del pack
 */
export const trackViewPack = (packName) => {
    trackCustomEvent('ViewPack', {
        pack_name: packName
    });
};

/**
 * Track cuando un usuario ve una promoción
 * @param {string} promoName - Nombre de la promoción
 */
export const trackViewPromotion = (promoName) => {
    trackCustomEvent('ViewPromotion', {
        promotion_name: promoName
    });
};

/**
 * Track cuando un usuario calcula su ahorro
 * @param {number} savings - Ahorro calculado
 */
export const trackCalculateSavings = (savings) => {
    trackCustomEvent('CalculateSavings', {
        savings_amount: savings,
        currency: 'CRC'
    });
};

/**
 * Track cuando un usuario compara packs
 */
export const trackComparePacks = () => {
    trackCustomEvent('ComparePacks', {
        content_name: 'Usuario comparó packs'
    });
};

/**
 * Track cuando un usuario solicita información
 * @param {string} infoType - Tipo de información solicitada
 */
export const trackRequestInfo = (infoType) => {
    trackCustomEvent('RequestInfo', {
        info_type: infoType
    });
};

/**
 * Track cuando un usuario ve el menú semanal
 */
export const trackViewMenu = () => {
    trackCustomEvent('ViewMenu', {
        content_name: 'Menú Semanal'
    });
};

/**
 * Track cuando un usuario aplica un cupón
 * @param {string} couponCode - Código del cupón
 */
export const trackApplyCoupon = (couponCode) => {
    trackCustomEvent('ApplyCoupon', {
        coupon_code: couponCode
    });
};

/**
 * Track cuando un usuario ve su historial de pedidos
 */
export const trackViewOrderHistory = () => {
    trackCustomEvent('ViewOrderHistory', {
        content_name: 'Historial de Pedidos'
    });
};

export default {
    // Inicialización
    initPixel,

    // Eventos estándar
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackSearch,
    trackCompleteRegistration,
    trackLogin,
    trackContact,
    trackViewCategory,
    trackAddPaymentInfo,
    trackShare,

    // Eventos personalizados
    trackViewPack,
    trackViewPromotion,
    trackCalculateSavings,
    trackComparePacks,
    trackRequestInfo,
    trackViewMenu,
    trackApplyCoupon,
    trackViewOrderHistory,

    // Funciones genéricas
    trackEvent,
    trackCustomEvent
};
