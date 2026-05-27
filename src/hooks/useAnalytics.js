import { getAnalytics, logEvent } from 'firebase/analytics';

/**
 * Hook para tracking de eventos con Firebase Analytics
 */
export function useAnalytics() {
    const analytics = getAnalytics();

    // Tracking de página vista
    const trackPageView = (pageName, pageTitle) => {
        logEvent(analytics, 'page_view', {
            page_title: pageTitle,
            page_location: window.location.href,
            page_path: window.location.pathname,
            page_name: pageName
        });
    };

    // Tracking de producto visto
    const trackViewProduct = (product) => {
        logEvent(analytics, 'view_item', {
            currency: 'CRC',
            value: product.price,
            items: [{
                item_id: product.id,
                item_name: product.name,
                item_category: product.category || 'general',
                price: product.price
            }]
        });
    };

    // Tracking de agregar al carrito
    const trackAddToCart = (product, quantity = 1) => {
        logEvent(analytics, 'add_to_cart', {
            currency: 'CRC',
            value: product.price * quantity,
            items: [{
                item_id: product.id,
                item_name: product.name,
                item_category: product.category || 'general',
                price: product.price,
                quantity: quantity
            }]
        });
    };

    // Tracking de remover del carrito
    const trackRemoveFromCart = (product, quantity = 1) => {
        logEvent(analytics, 'remove_from_cart', {
            currency: 'CRC',
            value: product.price * quantity,
            items: [{
                item_id: product.id,
                item_name: product.name,
                price: product.price,
                quantity: quantity
            }]
        });
    };

    // Tracking de inicio de checkout
    const trackBeginCheckout = (cart, total) => {
        logEvent(analytics, 'begin_checkout', {
            currency: 'CRC',
            value: total,
            items: cart.map(item => ({
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        });
    };

    // Tracking de compra completada
    const trackPurchase = (orderId, cart, total, paymentMethod) => {
        logEvent(analytics, 'purchase', {
            transaction_id: orderId,
            currency: 'CRC',
            value: total,
            payment_type: paymentMethod,
            items: cart.map(item => ({
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        });
    };

    // Tracking de búsqueda
    const trackSearch = (searchTerm) => {
        logEvent(analytics, 'search', {
            search_term: searchTerm
        });
    };

    // Tracking de cupón aplicado
    const trackApplyCoupon = (couponCode, discount) => {
        logEvent(analytics, 'select_promotion', {
            promotion_id: couponCode,
            promotion_name: couponCode,
            discount: discount
        });
    };

    // Tracking de compartir
    const trackShare = (contentType, itemId, method) => {
        logEvent(analytics, 'share', {
            content_type: contentType,
            item_id: itemId,
            method: method
        });
    };

    // Tracking de login
    const trackLogin = (method = 'email') => {
        logEvent(analytics, 'login', {
            method: method
        });
    };

    // Tracking de signup
    const trackSignUp = (method = 'email') => {
        logEvent(analytics, 'sign_up', {
            method: method
        });
    };

    // Tracking genérico de evento
    const trackEvent = (eventName, params = {}) => {
        logEvent(analytics, eventName, params);
    };

    return {
        trackPageView,
        trackViewProduct,
        trackAddToCart,
        trackRemoveFromCart,
        trackBeginCheckout,
        trackPurchase,
        trackSearch,
        trackApplyCoupon,
        trackShare,
        trackLogin,
        trackSignUp,
        trackEvent
    };
}

export default useAnalytics;
