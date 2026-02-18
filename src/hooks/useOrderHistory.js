import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bikitchen_order_history';

export default function useOrderHistory() {
    const [orders, setOrders] = useState([]);

    // Cargar historial del localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setOrders(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading order history:', error);
        }
    }, []);

    // Guardar en localStorage
    const saveToStorage = (newOrders) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
        } catch (error) {
            console.error('Error saving order history:', error);
        }
    };

    // Agregar pedido al historial
    const addOrderToHistory = (order) => {
        const newOrder = {
            id: Date.now().toString(),
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
            status: 'pending', // pending, confirmed, preparing, delivered, cancelled
            createdAt: new Date().toISOString()
        };
        
        const newOrders = [newOrder, ...orders];
        setOrders(newOrders);
        saveToStorage(newOrders);
        return newOrder;
    };

    // Actualizar estado de un pedido
    const updateOrderStatus = (orderId, status) => {
        const newOrders = orders.map(order => 
            order.id === orderId ? { ...order, status } : order
        );
        setOrders(newOrders);
        saveToStorage(newOrders);
    };

    // Obtener pedido por ID
    const getOrderById = (orderId) => {
        return orders.find(order => order.id === orderId);
    };

    // Obtener pedidos recientes (últimos 30 días)
    const getRecentOrders = () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return orders.filter(order => 
            new Date(order.createdAt) >= thirtyDaysAgo
        );
    };

    // Limpiar historial
    const clearHistory = () => {
        setOrders([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    // Estadísticas
    const getStats = () => {
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalItems = orders.reduce((sum, order) => 
            sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0), 0
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
        addOrderToHistory,
        updateOrderStatus,
        getOrderById,
        getRecentOrders,
        clearHistory,
        getStats,
        hasOrders: orders.length > 0
    };
}
