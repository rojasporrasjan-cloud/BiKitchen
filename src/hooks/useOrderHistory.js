import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'bikitchen_order_history';

/**
 * Hook Senior para la gestión del historial de pedidos.
 * Implementa sincronización reactiva, deduplicación y normalización de datos.
 */
export default function useOrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Carga inicial desde LocalStorage (Para respuesta instantánea / Optimistic UI)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setOrders(JSON.parse(saved));
            }
        } catch (error) {
            console.error('[OrderHistory] Error cargando caché local:', error);
            
        }
    }, []);

    // 2. Sincronización proactiva con Firestore
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const pedidosRef = collection(db, 'pedidos');
        const userEmail = user.email?.toLowerCase();
        
        // Mantenemos un mapa para deduplicar resultados de diferentes queries
        const ordersMap = new Map();

        const processSnapshot = (snapshot, sourceTag) => {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const normalizedOrder = {
                    id: doc.id,
                    orderNumber: data.numeroOrden || doc.id.slice(0, 8),
                    items: data.items || [],
                    subtotal: data.subtotal || 0,
                    discount: data.descuento || 0,
                    coupon: data.cupon || null,
                    total: data.total || 0,
                    customer: {
                        name: data.cliente,
                        phone: data.telefono,
                        email: data.correo
                    },
                    delivery: {
                        address: data.direccion || data.detalles_entrega?.direccion || '',
                        date: data.fecha_entrega,
                        time: data.horario_preferido || '9:00 AM - 2:00 PM'
                    },
                    paymentMethod: data.metodo_pago,
                    status: data.status || 'pending',
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
                };
                ordersMap.set(doc.id, normalizedOrder);
            });

            // Convertir mapa a array y ordenar por fecha descendente
            const mergedOrders = Array.from(ordersMap.values())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setOrders(mergedOrders);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedOrders));
            setLoading(false);
        };

        // QUERY A: Por UID (Más robusta, para pedidos nuevos)
        const qByUid = query(pedidosRef, where('userId', '==', user.uid));
        const unsubByUid = onSnapshot(qByUid, 
            (snaps) => processSnapshot(snaps, 'UID'),
            (err) => console.error('[OrderHistory] Error en query UID:', err)
        );

        // QUERY B: Por Correo (Para pedidos antiguos o invitados)
        // Nota: Si el usuario tiene un email en mayúsculas en Auth, 
        // buscamos por la versión exacta y la normalizada por seguridad.
        const qByEmail = query(pedidosRef, where('correo', '==', userEmail));
        const unsubByEmail = onSnapshot(qByEmail, 
            (snaps) => processSnapshot(snaps, 'Email (Lower)'),
            (err) => console.error('[OrderHistory] Error en query Email:', err)
        );

        // Limpiar suscripciones al desmontar
        return () => {
            unsubByUid();
            unsubByEmail();
        };
    }, [auth.currentUser]);

    /**
     * Agrega un pedido de forma optimista tras el checkout.
     * @param {Object} order Datos de la orden
     */
    const addOrderToHistory = (order) => {
        const newOrder = {
            id: order.id || `temp-${Date.now()}`,
            orderNumber: order.orderNumber,
            items: order.items,
            subtotal: order.subtotal,
            discount: order.discount || 0,
            coupon: order.coupon || null,
            total: order.total,
            customer: {
                name: order.customerName,
                phone: order.customerPhone,
                email: order.customerEmail
            },
            delivery: {
                address: order.address,
                date: order.deliveryDate,
                time: order.deliveryTime
            },
            paymentMethod: order.paymentMethod,
            status: order.status || 'pending',
            createdAt: new Date().toISOString()
        };
        
        setOrders(prev => {
            const exists = prev.find(o => o.orderNumber === newOrder.orderNumber);
            if (exists) return prev;
            const updated = [newOrder, ...prev];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        return newOrder;
    };

    const getStats = () => {
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalItems = orders.reduce((sum, order) => 
            sum + (Array.isArray(order.items) ? order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0) : 0), 0
        );
        
        return {
            totalOrders,
            totalSpent,
            totalItems,
            averageOrder: totalOrders > 0 ? totalSpent / totalOrders : 0
        };
    };

    return {
        orders,
        loading,
        addOrderToHistory,
        getStats,
        hasOrders: orders.length > 0
    };
}
