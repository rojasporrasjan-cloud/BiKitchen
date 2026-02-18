import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ShoppingBag, CreditCard, Star, Package, AlertTriangle, Check } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Tipos de notificación
const NOTIFICATION_TYPES = {
    NEW_ORDER: { icon: ShoppingBag, color: 'bg-green-500', label: 'Nuevo Pedido' },
    PAYMENT: { icon: CreditCard, color: 'bg-blue-500', label: 'Pago' },
    REVIEW: { icon: Star, color: 'bg-yellow-500', label: 'Reseña' },
    DELIVERY: { icon: Package, color: 'bg-purple-500', label: 'Entrega' },
    LOW_STOCK: { icon: AlertTriangle, color: 'bg-red-500', label: 'Stock Bajo' },
    GENERAL: { icon: Bell, color: 'bg-gray-500', label: 'General' }
};

/**
 * Hook para escuchar nuevos pedidos en tiempo real
 */
export function useOrderNotifications(enabled = true) {
    const [lastOrderTime, setLastOrderTime] = useState(Date.now());

    useEffect(() => {
        if (!enabled) return;

        const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
        
        const q = query(
            collection(db, 'pedidos'),
            where('createdAt', '>', fiveMinutesAgo),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const order = change.doc.data();
                    const orderTime = order.createdAt?.toMillis?.() || Date.now();
                    
                    if (orderTime > lastOrderTime) {
                        playNotificationSound();
                        showOrderNotification(order, change.doc.id);
                        setLastOrderTime(orderTime);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [enabled, lastOrderTime]);
}

/**
 * Reproducir sonido de notificación
 */
function playNotificationSound() {
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (e) {}
}

/**
 * Mostrar notificación de nuevo pedido
 */
function showOrderNotification(order, orderId) {
    toast.custom((t) => (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto ring-1 ring-black/5 overflow-hidden`}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                            🎉 ¡Nuevo Pedido!
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                            {order.cliente?.nombre || 'Cliente'} - ₡{order.total?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            #{orderId?.slice(-6).toUpperCase()}
                        </p>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 flex justify-end">
                <a
                    href={`/admin/orders?id=${orderId}`}
                    className="text-sm font-medium text-bikitchen-orange hover:text-orange-600"
                    onClick={() => toast.dismiss(t.id)}
                >
                    Ver pedido →
                </a>
            </div>
        </motion.div>
    ), { duration: 10000, position: 'top-right' });
}

/**
 * Centro de notificaciones (dropdown)
 */
export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Cargar notificaciones recientes
    useEffect(() => {
        const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
        
        const q = query(
            collection(db, 'pedidos'),
            where('createdAt', '>', oneHourAgo),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                type: 'NEW_ORDER',
                title: 'Nuevo pedido',
                message: `${doc.data().cliente?.nombre || 'Cliente'} - ₡${doc.data().total?.toLocaleString()}`,
                time: doc.data().createdAt?.toDate?.() || new Date(),
                read: false
            }));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, []);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const formatTime = (date) => {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Ahora';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
        return `Hace ${Math.floor(diff / 3600)}h`;
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="font-semibold">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-bikitchen-orange hover:underline">
                                        Marcar leídas
                                    </button>
                                )}
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Sin notificaciones</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => {
                                        const config = NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.GENERAL;
                                        const Icon = config.icon;
                                        return (
                                            <div
                                                key={notif.id}
                                                className={`p-3 border-b last:border-0 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-orange-50/50' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                        <Icon size={16} className="text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                                        <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{formatTime(notif.time)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default NotificationCenter;
