import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

const OrdersContext = createContext();

export const useOrders = () => {
    const context = useContext(OrdersContext);
    if (!context) {
        throw new Error('useOrders must be used within an OrdersProvider');
    }
    return context;
};

export const OrdersProvider = ({ children }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to real-time updates
    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addOrder = async (cartItems, customerData) => {
        try {
            const displayId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            const newOrder = {
                displayId: displayId,
                client: customerData.name || "Cliente Web",
                plan: cartItems[0]?.name || "Personalizado",
                items: `${cartItems.reduce((acc, item) => acc + item.quantity, 0)} Comidas`,
                date: new Date().toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
                status: "new",
                total: `₡${totalAmount.toLocaleString('es-CR')}`,
                totalValue: totalAmount, // Numeric value for easier calculations
                details: {
                    cart: cartItems,
                    ...customerData
                },
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "orders"), newOrder);
            return { id: docRef.id, ...newOrder };
        } catch (error) {
            console.error("Error adding order:", error);
            throw error;
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, {
                status: newStatus
            });
        } catch (error) {
            console.error("Error updating order status:", error);
        }
    };

    // Helper para parsear el total de forma segura
    const parseOrderTotal = (order) => {
        // Si tiene totalValue numérico, usarlo
        if (typeof order.totalValue === 'number' && !isNaN(order.totalValue)) {
            return order.totalValue;
        }
        
        // Si tiene total como string, parsearlo
        if (typeof order.total === 'string') {
            const cleaned = order.total.replace(/[₡,.\s]/g, '');
            const parsed = parseInt(cleaned, 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        
        // Si total es número directamente
        if (typeof order.total === 'number' && !isNaN(order.total)) {
            return order.total;
        }
        
        return 0;
    };

    const getStats = () => {
        return {
            totalSales: orders.reduce((acc, order) => acc + parseOrderTotal(order), 0),
            activeOrders: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
            inDelivery: orders.filter(o => o.status === 'delivery').length,
            pendingOrders: orders.filter(o => o.status === 'new').length
        };
    };

    // Formatear total para mostrar
    const formatTotal = (order) => {
        const amount = parseOrderTotal(order);
        return `₡${amount.toLocaleString('es-CR')}`;
    };

    return (
        <OrdersContext.Provider value={{ orders, addOrder, updateOrderStatus, getStats, formatTotal, loading }}>
            {children}
        </OrdersContext.Provider>
    );
};
