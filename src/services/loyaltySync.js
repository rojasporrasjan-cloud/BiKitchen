import { db } from '../firebase/config';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const POINTS_CONFIG = {
    pointsPerColon: 0.02, // 2 puntos por cada ₡100 gastados
};

/**
 * Busca todos los pedidos previos de un cliente por email (cuando era guest)
 * y calcula los puntos que debería haber recibido
 */
export const syncLoyaltyPointsOnRegistration = async (email, uid) => {
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        console.warn('[LoyaltySync] Email inválido para sincronización:', email);
        return { success: false, error: 'Email inválido' };
    }

    const cleanEmail = email.toLowerCase().trim();

    try {

        // 1. Buscar todos los pedidos previos (confirmados o pagados)
        const ordersQuery = query(
            collection(db, 'pedidos'),
            where('correo', '==', cleanEmail)
        );

        const orderSnap = await getDocs(ordersQuery);

        if (orderSnap.empty) {

            // Crear documento de loyalty vacío con bono de bienvenida
            const loyaltyRef = doc(db, 'loyalty', cleanEmail);
            const welcomeBonus = 500;

            const initialData = {
                currentPoints: welcomeBonus,
                totalEarned: welcomeBonus,
                totalRedeemed: 0,
                completedMissions: ['welcome'],
                history: [
                    {
                        id: 'welcome-bonus',
                        type: 'earned',
                        points: welcomeBonus,
                        description: '¡Bienvenido! Bono inicial BiKitchen',
                        date: new Date().toISOString()
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: serverTimestamp(),
                uid: uid,
                syncedFromRegistration: true
            };

            await setDoc(loyaltyRef, initialData);

            return {
                pointsEarned: 0,
                ordersProcessed: 0,
                welcomeBonus: welcomeBonus,
                totalPoints: welcomeBonus
            };
        }

        // 2. Procesar cada pedido y calcular puntos
        let totalPointsEarned = 0;
        const history = [];
        const ordersProcessed = [];

        orderSnap.forEach(orderDoc => {
            const orderData = orderDoc.data();
            const total = orderData.total || 0;
            const status = orderData.status || '';
            const orderNum = orderData.numeroOrden || orderDoc.id.slice(0, 8);

            // Solo contar pedidos confirmados o con pago completado
            if (['confirmed', 'completed', 'delivered'].includes(status) ||
                orderData.paymentStatus === 'paid' ||
                orderData.paymentConfirmed === true) {

                const pointsForThisOrder = Math.floor(total * POINTS_CONFIG.pointsPerColon);
                totalPointsEarned += pointsForThisOrder;
                ordersProcessed.push(orderNum);

                // Crear entrada en historial
                history.push({
                    id: `sync-${orderDoc.id}`,
                    type: 'earned',
                    points: pointsForThisOrder,
                    description: `Compra ${orderNum} (sincronizada al registrarse)`,
                    amount: total,
                    date: orderData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                });
            }
        });

        // 3. Crear documento de loyalty con puntos históricos + bono de bienvenida
        const welcomeBonus = 500;
        const totalPoints = totalPointsEarned + welcomeBonus;

        history.unshift({
            id: 'welcome-bonus-sync',
            type: 'earned',
            points: welcomeBonus,
            description: '¡Bienvenido! Bono inicial BiKitchen',
            date: new Date().toISOString()
        });

        const loyaltyRef = doc(db, 'loyalty', cleanEmail);

        // Chequear si el documento ya existe (evitar duplicados en race condition)
        const existingDoc = await getDoc(loyaltyRef);
        if (existingDoc.exists()) {
            return {
                success: false,
                error: 'Documento ya existe',
                alreadySynced: true
            };
        }

        const loyaltyData = {
            currentPoints: totalPoints,
            totalEarned: totalPoints,
            totalRedeemed: 0,
            completedMissions: ['welcome'],
            history: history.slice(0, 50), // Últimos 50 registros
            createdAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
            uid: uid,
            syncedFromRegistration: true,
            syncedOrders: ordersProcessed,
            syncTimestamp: new Date().toISOString()
        };

        await setDoc(loyaltyRef, loyaltyData);


        return {
            success: true,
            pointsEarned: totalPointsEarned,
            ordersProcessed: ordersProcessed.length,
            welcomeBonus: welcomeBonus,
            totalPoints: totalPoints
        };

    } catch (error) {
        console.error('[LoyaltySync] Error al sincronizar puntos:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Agrega puntos por email (para clientes guest o después de una compra)
 * Usa transacción de Firestore para evitar race conditions
 */
export const awardPointsByEmail = async (email, amount, orderNumber) => {
    if (!email || !amount) {
        console.warn('[LoyaltySync] Email o monto inválido para agregar puntos');
        return { success: false, points: 0 };
    }

    const cleanEmail = email.toLowerCase().trim();

    // Defensive auth check: warn if email doesn't match current user
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email?.toLowerCase() !== cleanEmail) {
        console.warn('[LoyaltySync] Email mismatch in awardPointsByEmail', {
            provided: cleanEmail,
            currentUser: currentUser.email?.toLowerCase()
        });
    }

    const pointsToAdd = Math.floor(amount * POINTS_CONFIG.pointsPerColon);

    try {

        const loyaltyRef = doc(db, 'loyalty', cleanEmail);
        let finalPoints = 0;

        // Usar transacción para evitar race conditions
        await runTransaction(db, async (transaction) => {
            const loyaltySnap = await transaction.get(loyaltyRef);

            let loyaltyData = {};

            if (loyaltySnap.exists()) {
                loyaltyData = loyaltySnap.data();

                // FIX 7: Idempotencia — verificar si ya procesamos esta orden
                if (loyaltyData.processedOrders?.includes(orderNumber)) {
                    console.warn(`[LoyaltySync] Orden ${orderNumber} ya fue procesada para ${cleanEmail}. Ignorando.`);
                    throw new Error('_duplicate');
                }
            } else {
                loyaltyData = {
                    currentPoints: 0,
                    totalEarned: 0,
                    totalRedeemed: 0,
                    history: [],
                    completedMissions: [],
                    createdAt: new Date().toISOString()
                };
            }

            // Agregar entrada al historial
            const newHistoryEntry = {
                id: `order-${Date.now()}`,
                type: 'earned',
                points: pointsToAdd,
                description: `Compra ${orderNumber}`,
                amount: amount,
                date: new Date().toISOString()
            };

            const updatedHistory = [newHistoryEntry, ...(loyaltyData.history || [])].slice(0, 50);

            const currentPoints = (loyaltyData.currentPoints || 0) + pointsToAdd;
            const totalEarned = (loyaltyData.totalEarned || 0) + pointsToAdd;

            // FIX 7: Agregar orderNumber a processedOrders para prevenir duplicados
            const processedOrders = loyaltyData.processedOrders || [];
            if (!processedOrders.includes(orderNumber)) {
                processedOrders.push(orderNumber);
            }

            const updatedData = {
                ...loyaltyData,
                currentPoints: currentPoints,
                totalEarned: totalEarned,
                history: updatedHistory,
                processedOrders: processedOrders,
                updatedAt: serverTimestamp()
            };

            transaction.set(loyaltyRef, updatedData, { merge: true });
            finalPoints = currentPoints;
        });


        return {
            success: true,
            points: pointsToAdd,
            total: finalPoints
        };

    } catch (error) {
        // FIX 7: Detectar si fue un duplicado
        if (error.message === '_duplicate') {
            return {
                success: true,
                _duplicate: true,
                points: 0,
                total: 0
            };
        }

        console.error('[LoyaltySync] Error al agregar puntos:', error);
        return {
            success: false,
            error: error.message,
            points: 0
        };
    }
};

/**
 * Función auxiliar para sincronizar puntos de un pedido específico
 * (Para casos donde se necesita actualizar puntos de pedidos existentes)
 */
export const awardPointsForOrder = async (email, orderId, orderData) => {
    if (!email || !orderData) return null;

    const cleanEmail = email.toLowerCase().trim();

    // Defensive auth check: warn if email doesn't match current user
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email?.toLowerCase() !== cleanEmail) {
        console.warn('[LoyaltySync] Email mismatch in awardPointsForOrder', {
            provided: cleanEmail,
            currentUser: currentUser.email?.toLowerCase()
        });
    }

    try {
        const total = orderData.total || 0;
        const points = Math.floor(total * POINTS_CONFIG.pointsPerColon);
        const orderNum = orderData.numeroOrden || orderId.slice(0, 8);

        // Obtener documento actual de loyalty
        const loyaltyRef = doc(db, 'loyalty', cleanEmail);
        const loyaltySnap = await getDoc(loyaltyRef);

        if (!loyaltySnap.exists()) {
            console.warn(`[LoyaltySync] No se encontró documento de loyalty para ${cleanEmail}`);
            return null;
        }

        const loyaltyData = loyaltySnap.data();

        // Actualizar puntos (evitar duplicados)
        if (loyaltyData.syncedOrders?.includes(orderNum)) {
            return null;
        }

        // Agregar entrada al historial
        const newHistory = [
            {
                id: `sync-${orderId}`,
                type: 'earned',
                points: points,
                description: `Compra ${orderNum}`,
                amount: total,
                date: orderData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            },
            ...loyaltyData.history
        ];

        const updatedData = {
            ...loyaltyData,
            currentPoints: loyaltyData.currentPoints + points,
            totalEarned: loyaltyData.totalEarned + points,
            history: newHistory.slice(0, 50),
            syncedOrders: [...(loyaltyData.syncedOrders || []), orderNum],
            updatedAt: serverTimestamp()
        };

        await setDoc(loyaltyRef, updatedData, { merge: true });

        return { success: true, points };

    } catch (error) {
        console.error('[LoyaltySync] Error al otorgar puntos:', error);
        return null;
    }
};
