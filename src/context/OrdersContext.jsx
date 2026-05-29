import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    where,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    increment,
    deleteDoc,
    getDocs,
    limit,
    runTransaction,
    writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ADMIN_EMAILS } from '../config/admins';

const OrdersContext = createContext();

export const useOrders = () => {
    const context = useContext(OrdersContext);
    if (!context) {
        throw new Error('useOrders must be used within an OrdersProvider');
    }
    return context;
};

/**
 * OrdersProvider - Proveedor de contexto para pedidos
 * UNIFICADO: Usa la colección 'pedidos' para todo
 * Esta es la misma colección que usa el checkout, delivery y producción
 * NOTA: Solo carga pedidos si el usuario es admin (para evitar errores de permisos)
 */
export const OrdersProvider = ({ children }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Verificar si el usuario es admin antes de suscribirse a pedidos
    // Comprueba tanto la lista estática ADMIN_EMAILS como el campo isAdmin en Firestore
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setIsAdmin(false);
                setOrders([]);
                setLoading(false);
                return;
            }

            // Verificación primaria: lista estática de emails admin
            if (ADMIN_EMAILS.includes(user.email)) {
                setIsAdmin(true);
                return;
            }

            // Verificación secundaria: campo isAdmin en Firestore users/{uid}
            try {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                if (userSnap.exists() && userSnap.data().isAdmin === true) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    setOrders([]);
                    setLoading(false);
                }
            } catch {
                setIsAdmin(false);
                setOrders([]);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Subscribe to real-time updates desde 'pedidos' (solo si es admin)
    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"), limit(500));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => {
                const data = doc.data({ serverTimestamps: 'estimate' });
                // Normalizar campos para compatibilidad con OrdersView
                return {
                    id: doc.id,
                    ...data,
                    // Mapear campos de 'pedidos' a formato esperado por OrdersView
                    displayId: data.numeroOrden || doc.id.slice(0, 8),
                    // Normalizar fecha de creación: Fallback agresivo a cualquier fecha disponible
                    createdAt: data.createdAt || data.created_at || data.timestamp || data.fecha || data.paidAt || data.updatedAt || new Date(),
                    client: data.cliente || 'Sin nombre',
                    plan: data.plan || 'Personalizado',
                    total: typeof data.total === 'number' ? `₡${data.total.toLocaleString('es-CR')}` : data.total,
                    totalValue: typeof data.total === 'number' ? data.total : 0,
                    status: data.status === 'new' ? 'pending' : (data.status || 'pending'),
                    date: (() => {
                        const ts = data.createdAt || data.created_at || data.timestamp || data.fecha || data.paidAt || data.updatedAt;
                        if (!ts) return '-';
                        const d = ts.toDate ? ts.toDate() : new Date(ts);
                        return isNaN(d.getTime()) ? '-' : d.toLocaleString('es-CR', {
                            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
                        });
                    })(),
                    // Mantener campos originales de Firebase para compatibilidad
                    telefono: data.telefono,
                    correo: data.correo,
                    direccion: data.direccion,
                    // También mapear a 'details' para compatibilidad con código legacy
                    details: {
                        phone: data.telefono,
                        email: data.correo,
                        address: data.direccion,
                        zona: data.zona_envio,
                        costoEnvio: data.costo_envio,
                        paymentMethod: data.metodo_pago
                    }
                };
            });
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setOrders([]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    // Agregar pedido manual (desde admin) - usa la misma estructura que el checkout
    const addOrder = async (cartItems, customerData, orderNumber, createdBy) => {
        try {
            const numeroOrden = orderNumber || `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const shippingCost = Number(customerData.shippingCost) || 0;

            // Discount Calculation
            const discount = Number(customerData.discount) || 0;
            const discountType = customerData.discountType || 'percentage'; // 'percentage' or 'amount'

            let discountValue = 0;
            if (discount > 0) {
                if (discountType === 'percentage') {
                    discountValue = totalAmount * (discount / 100);
                } else {
                    discountValue = discount;
                }
            }

            const finalTotal = Math.max(0, totalAmount - discountValue + shippingCost);

            // Estructura compatible con 'pedidos' (igual que CheckoutSteps)
            const normalizedEmail = customerData.email?.toLowerCase().trim() || '';
            const newOrder = {
                numeroOrden: numeroOrden,
                cliente: customerData.name || "Cliente Manual",
                telefono: customerData.phone || '',
                correo: normalizedEmail,
                // direccion: customerData.address || '', // This field is now part of detalles_entrega
                plan: cartItems[0]?.name || "Personalizado",
                // Si no hay fecha, es "envío por confirmar" -> null
                fecha_entrega: customerData.deliveryDate || null,
                horario_preferido: customerData.timeSlot || 'AM',
                observaciones: customerData.notes || '',

                // Shipping info
                zona_envio: customerData.zoneName || 'GAM',
                zona_id: customerData.zoneId || null,
                costo_envio: customerData.shippingCost || 0,

                detalles_entrega: {
                    direccion: customerData.address || '',
                    ciudad: '',
                    cod_postal: '',
                    pais: 'Costa Rica',
                    telefono: customerData.phone || '',
                    instrucciones: customerData.notes || ''
                },

                details: {
                    phone: customerData.phone || '',
                    email: customerData.email || '',
                    address: customerData.address || '',
                    notes: customerData.notes || '',
                    paymentMethod: customerData.paymentMethod || 'Efectivo',

                    // Shipping details stored in 'details' too for consistency
                    zoneId: customerData.zoneId || null,
                    zona: customerData.zoneName || 'GAM',
                    costoEnvio: customerData.shippingCost || 0,
                    fechaEntrega: customerData.deliveryDate || null
                },
                menu: cartItems.map(item => ({
                    nombre: item.name || 'Sin nombre',
                    cantidad: item.quantity || 1,
                    precio: item.price || 0,
                    proteinas: item.proteinas || null, // null is allowed, undefined is not
                    desc: item.desc || '',
                    category: item.category || 'individuales',
                    size: item.size || '' // preserve size label like (500g), prevent undefined
                })),
                subtotal: totalAmount,
                descuento: discountValue,
                datos_descuento: {
                    valor: discount,
                    tipo: discountType
                },
                total: finalTotal,
                metodo_pago: customerData.paymentMethod || 'Efectivo',
                status: 'pending',
                deliveryStatus: 'pending',
                createdAt: new Date().toISOString(),
                source: 'admin', // Marcar que viene del admin
                createdBy: createdBy || 'admin' // Guardar quién lo creó
            };

            const docRef = await addDoc(collection(db, "pedidos"), newOrder);
            return { id: docRef.id, ...newOrder };
        } catch (error) {
            console.error("Error adding order:", error);
            throw error;
        }
    };

    const updateOrderStatus = async (orderId, newStatus, additionalUpdates = {}) => {
        try {
            let orderRef = doc(db, "pedidos", orderId);
            let orderSnap;
            
            try {
                // Try fetching by doc ID first
                orderSnap = await getDoc(orderRef);
            } catch (err) {
                // If it's a malformed ID error, we skip to fallback
            }

            if (!orderSnap?.exists?.()) {
                const q = query(collection(db, "pedidos"), where("numeroOrden", "==", orderId));
                const querySnap = await getDocs(q);
                
                if (!querySnap.empty) {
                    orderRef = doc(db, "pedidos", querySnap.docs[0].id);
                    orderSnap = await getDoc(orderRef);
                } else {
                    console.error("Order not found by ID or numeroOrden:", orderId);
                    return;
                }
            }

            const orderData = orderSnap.data();

            // Si se confirma el pago, usar transacción para marcar pointsAwarded de forma atómica
            // (previene doble-otorgamiento si dos admins confirman el mismo pedido a la vez)
            let shouldAwardPoints = false;
            if (newStatus === 'confirmed' && !orderData.pointsAwarded) {
                await runTransaction(db, async (transaction) => {
                    const freshSnap = await transaction.get(orderRef);
                    if (!freshSnap.exists() || freshSnap.data().pointsAwarded) return;
                    transaction.update(orderRef, {
                        status: newStatus,
                        paymentConfirmed: true,
                        pointsAwarded: true,
                        pointsAwardedAt: new Date().toISOString(),
                        ...additionalUpdates
                    });
                    shouldAwardPoints = true;
                });

                if (!shouldAwardPoints) {
                    // Los puntos ya fueron otorgados por otra instancia — solo actualizar status
                    await updateDoc(orderRef, { status: newStatus, ...additionalUpdates });
                    return;
                }
            } else {
                await updateDoc(orderRef, { status: newStatus, ...additionalUpdates });
                if (newStatus !== 'confirmed' || orderData.pointsAwarded) return;
            }

            // Actualización secundaria: marcar paymentStatus y referralPoints
            // (la transacción ya escribió status/pointsAwarded/paymentConfirmed)
            const secondaryUpdates = { paymentStatus: 'paid' };

            if (shouldAwardPoints) {
                // Calcular puntos a dar (2 puntos por cada ₡100)
                const pointsToAward = orderData.pointsToAward || Math.floor((orderData.total || 0) * 0.02);


                // Si el pedido tiene correo, guardar los puntos en Firestore
                if (orderData.correo && pointsToAward > 0) {
                    try {
                        // Crear/actualizar documento de puntos del usuario
                        const pointsRef = doc(db, "loyalty", orderData.correo.toLowerCase());
                        const pointsSnap = await getDoc(pointsRef);

                        if (pointsSnap.exists()) {
                            // Actualizar puntos existentes
                            await updateDoc(pointsRef, {
                                points: increment(pointsToAward),
                                totalEarned: increment(pointsToAward),
                                lastUpdated: new Date().toISOString()
                            });
                        } else {
                            // Crear nuevo documento de puntos
                            await setDoc(pointsRef, {
                                email: orderData.correo.toLowerCase(),
                                points: pointsToAward,
                                totalEarned: pointsToAward,
                                totalRedeemed: 0,
                                createdAt: new Date().toISOString(),
                                lastUpdated: new Date().toISOString()
                            });
                        }
                    } catch (pointsError) {
                        console.error("❌ Error awarding points:", pointsError);
                    }
                }

                // NUEVO: Otorgar puntos por referido
                if (orderData.referral_uid && !orderData.referralPointsAwarded) {
                    try {
                        const rrPoints = 1000; // REFERRAL_REWARD_POINTS aligned with ReferidosPage.jsx
                        const userRef = doc(db, "users", orderData.referral_uid);
                        const userSnap = await getDoc(userRef);
                        
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            const userEmail = userData.email?.toLowerCase();
                            
                            if (userEmail) {
                                const lRef = doc(db, "loyalty", userEmail);
                                const lSnap = await getDoc(lRef);
                                
                                const referralHistory = {
                                    id: `ref_${orderId}_${Date.now()}`,
                                    type: 'referral_bonus',
                                    points: rrPoints,
                                    description: `Bono por referir a ${orderData.cliente || 'un amigo'}`,
                                    date: new Date().toISOString()
                                };

                                if (lSnap.exists()) {
                                    await updateDoc(lRef, {
                                        points: increment(rrPoints),
                                        totalEarned: increment(rrPoints),
                                        lastUpdated: new Date().toISOString(),
                                        history: [referralHistory, ...(lSnap.data().history || [])]
                                    });
                                } else {
                                    await setDoc(lRef, {
                                        email: userEmail,
                                        points: rrPoints,
                                        totalEarned: rrPoints,
                                        totalRedeemed: 0,
                                        createdAt: new Date().toISOString(),
                                        lastUpdated: new Date().toISOString(),
                                        history: [referralHistory]
                                    });
                                }
                                secondaryUpdates.referralPointsAwarded = true;
                            }
                        }
                    } catch (refError) {
                        console.error("Error awarding referral points:", refError);
                    }
                }
            }

            await updateDoc(orderRef, secondaryUpdates);
        } catch (error) {
            console.error("Error updating order status:", error);
        }
    };

    // Función para confirmar pago manualmente
    const confirmPayment = async (orderId) => {
        await updateOrderStatus(orderId, 'confirmed');
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
        // Ventas: sólo pedidos confirmados o entregados (consistente con Dashboard)
        const sales = orders
            .filter(o => (o.status === 'confirmed' || o.status === 'delivered') || o.deliveryStatus === 'delivered')
            .reduce((acc, order) => acc + parseOrderTotal(order), 0);

        const delivered = orders.filter(o => o.status === 'delivered' || o.deliveryStatus === 'delivered').length;

        return {
            totalSales: sales,
            activeOrders: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
            inDelivery: orders.filter(o => o.status === 'in_transit' || o.status === 'delivery').length,
            pending: orders.filter(o => o.status === 'pending_payment' || o.status === 'pending' || o.status === 'new').length,
            pendingOrders: orders.filter(o => o.status === 'pending_payment' || o.status === 'pending' || o.status === 'new').length,
            delivered
        };
    };

    // Eliminar todos los pedidos (para limpiar antes de ir live) — usa writeBatch para atomicidad
    const deleteAllOrders = async () => {
        try {
            const ordersSnapshot = await getDocs(collection(db, "pedidos"));
            const batchSize = 400; // Firestore permite max 500 ops por batch
            let deleted = 0;

            for (let i = 0; i < ordersSnapshot.docs.length; i += batchSize) {
                const batch = writeBatch(db);
                ordersSnapshot.docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
                await batch.commit();
                deleted += Math.min(batchSize, ordersSnapshot.docs.length - i);
            }

            return deleted;
        } catch (error) {
            console.error("Error deleting all orders:", error);
            throw error;
        }
    };

    // Formatear total para mostrar
    const formatTotal = (order) => {
        const amount = parseOrderTotal(order);
        return `₡${amount.toLocaleString('es-CR')}`;
    };

    // Eliminar pedido por ID
    const deleteOrder = async (orderId) => {
        try {
            await deleteDoc(doc(db, 'pedidos', orderId));
        } catch (error) {
            console.error('Error deleting order:', error);
            throw error;
        }
    };

    const contextValue = React.useMemo(() => ({
        orders, addOrder, updateOrderStatus, confirmPayment, getStats, formatTotal, deleteAllOrders, deleteOrder, loading
    }), [orders, loading]);

    return (
        <OrdersContext.Provider value={contextValue}>
            {children}
        </OrdersContext.Provider>
    );
};
