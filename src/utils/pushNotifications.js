import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

// VAPID Key pública - Genera una en Firebase Console > Project Settings > Cloud Messaging
// Por ahora usamos una key de prueba, deberás reemplazarla
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY';

/**
 * Convierte la VAPID key de base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Solicitar permiso y suscribir al usuario a notificaciones push
 */
export async function subscribeToPushNotifications(userId, isAdmin = false) {
    try {
        // Verificar soporte
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return { success: false, error: 'Push notifications no soportadas en este navegador' };
        }

        // Solicitar permiso
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return { success: false, error: 'Permiso de notificaciones denegado' };
        }

        // Obtener service worker
        const registration = await navigator.serviceWorker.ready;

        // Verificar si ya está suscrito
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // Crear nueva suscripción
            // NOTA: Cuando tengas tu VAPID key real, descomenta esto:
            // subscription = await registration.pushManager.subscribe({
            //     userVisibleOnly: true,
            //     applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            // });
            
            // Por ahora, guardamos solo el permiso
            subscription = { endpoint: 'browser-notification-' + userId };
        }

        // Guardar suscripción en Firestore
        await saveSubscription(userId, subscription, isAdmin);

        // Mostrar notificación de confirmación
        new Notification('¡Notificaciones activadas! 🔔', {
            body: isAdmin 
                ? 'Recibirás alertas de nuevos pedidos y actividad importante.'
                : 'Te avisaremos sobre el estado de tus pedidos y promociones.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png'
        });

        return { success: true, subscription };
    } catch (error) {
        console.error('Error subscribing to push:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Guardar suscripción en Firestore
 */
async function saveSubscription(userId, subscription, isAdmin) {
    const subscriptionData = {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys ? {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
        } : null,
        isAdmin,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        active: true
    };

    await setDoc(doc(db, 'push_subscriptions', userId), subscriptionData);
}

/**
 * Cancelar suscripción a notificaciones
 */
export async function unsubscribeFromPushNotifications(userId) {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
        }

        // Eliminar de Firestore
        await deleteDoc(doc(db, 'push_subscriptions', userId));

        return { success: true };
    } catch (error) {
        console.error('Error unsubscribing:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verificar si el usuario está suscrito
 */
export async function checkSubscriptionStatus(userId) {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return { subscribed: false, permission: 'unsupported' };
        }

        const permission = Notification.permission;
        
        if (permission !== 'granted') {
            return { subscribed: false, permission };
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        return { 
            subscribed: !!subscription, 
            permission,
            subscription 
        };
    } catch (error) {
        return { subscribed: false, permission: 'error', error: error.message };
    }
}

/**
 * Enviar notificación local (cuando la app está abierta)
 */
export function sendLocalNotification(title, body, options = {}) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: options.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: options.tag || 'bikitchen-notification',
            ...options
        });
    }
}

/**
 * Tipos de notificaciones predefinidas
 */
export const NOTIFICATION_TYPES = {
    // Para clientes
    ORDER_CONFIRMED: {
        title: '¡Pedido Confirmado! ✅',
        getBody: (orderNumber) => `Tu pedido ${orderNumber} ha sido confirmado. Pronto comenzaremos a prepararlo.`,
        url: '/mis-pedidos'
    },
    ORDER_PREPARING: {
        title: 'Preparando tu pedido 👨‍🍳',
        getBody: (orderNumber) => `Estamos preparando tu pedido ${orderNumber} con mucho cariño.`,
        url: '/mis-pedidos'
    },
    ORDER_SHIPPED: {
        title: '¡Tu pedido va en camino! 🚚',
        getBody: (orderNumber) => `Tu pedido ${orderNumber} está en camino. ¡Prepárate para recibirlo!`,
        url: '/mis-pedidos'
    },
    ORDER_DELIVERED: {
        title: '¡Pedido Entregado! 🎉',
        getBody: (orderNumber) => `Tu pedido ${orderNumber} ha sido entregado. ¡Buen provecho!`,
        url: '/mis-pedidos'
    },
    NEW_PROMOTION: {
        title: '¡Nueva Promoción! 🎁',
        getBody: (message) => message,
        url: '/promociones'
    },
    WELCOME: {
        title: '¡Bienvenido a BiKitchen! 🍽️',
        getBody: () => 'Gracias por registrarte. Usa el código BIENVENIDO5 para un 5% de descuento.',
        url: '/packs'
    },

    // Para admin
    NEW_ORDER: {
        title: '🔔 Nuevo Pedido',
        getBody: (orderNumber, total) => `Pedido ${orderNumber} recibido por ₡${total.toLocaleString()}`,
        url: '/admin/orders'
    },
    NEW_CLIENT: {
        title: '👤 Nuevo Cliente',
        getBody: (name) => `${name} se ha registrado en BiKitchen`,
        url: '/admin/clients'
    },
    // LOW_INVENTORY se quitó junto con el módulo de Inventario: apuntaba a
    // /admin/inventory, que ya no existe.

    // Notificación personalizada
    custom: {
        title: 'BiKitchen',
        getBody: (message) => message,
        url: '/'
    }
};

/**
 * Crear notificación para guardar en Firestore (para envío posterior)
 */
export async function createNotification(userId, type, data = {}) {
    const notificationType = NOTIFICATION_TYPES[type];
    if (!notificationType && type !== 'custom') {
        console.error('Tipo de notificación no válido:', type);
        return;
    }

    // Para notificaciones personalizadas, usar datos directos
    const isCustom = type === 'custom';
    
    const notification = {
        userId,
        type,
        title: isCustom ? (data.title || 'BiKitchen') : notificationType.title,
        body: isCustom 
            ? (data.message || '') 
            : (typeof notificationType.getBody === 'function' 
                ? notificationType.getBody(data.orderNumber || data.message || data.name || data.item)
                : notificationType.getBody),
        url: isCustom ? (data.url || '/') : notificationType.url,
        data,
        read: false,
        sent: false,
        createdAt: Timestamp.now()
    };

    // Guardar en colección de notificaciones
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, notification);

    // Intentar enviar notificación local si el usuario está en la app
    if (Notification.permission === 'granted') {
        sendLocalNotification(notification.title, notification.body, { 
            tag: `${type}-${Date.now()}`,
            data: { url: notification.url }
        });
    }

    return notification;
}

/**
 * Obtener notificaciones no leídas de un usuario
 */
export async function getUnreadNotifications(userId) {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting notifications:', error);
        return [];
    }
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId) {
    try {
        await setDoc(doc(db, 'notifications', notificationId), {
            read: true,
            readAt: Timestamp.now()
        }, { merge: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}
