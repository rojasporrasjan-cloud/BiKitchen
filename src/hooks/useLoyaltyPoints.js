import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';

// Las reglas del programa viven en un solo lugar: src/config/loyalty.js
import {
    TASA_PUNTOS,
    BONO_BIENVENIDA,
    PUNTOS_REFERIDO,
    NIVELES,
    nivelPorPuntos,
    calcularPuntos
} from '../config/loyalty';

const POINTS_CONFIG = {
    pointsPerColon: TASA_PUNTOS,
    welcomeBonus: BONO_BIENVENIDA,
    referralReward: PUNTOS_REFERIDO
};

const LOYALTY_LEVELS = NIVELES;

export default function useLoyaltyPoints() {
    const { currentUser } = useAuth() || {};
    const [pointsData, setPointsData] = useState({
        currentPoints: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        history: [],
        completedMissions: []
    });
    const [loading, setLoading] = useState(true);

    // Cargar datos desde Firestore en tiempo real
    useEffect(() => {
        if (!currentUser) {
            setPointsData({
                currentPoints: 0,
                totalEarned: 0,
                totalRedeemed: 0,
                history: [],
                completedMissions: []
            });
            setLoading(false);
            return;
        }

        // FIX #3: Validar email antes de usarlo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedEmail = currentUser.email?.toLowerCase().trim();

        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            console.error('[Loyalty] Email inválido en currentUser:', currentUser.email);
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'loyalty', normalizedEmail);
        let isMounted = true;  // Rastrear si el componente está montado

        // FIX #1: Try-catch en onSnapshot para manejar errores de creación
        const unsubscribe = onSnapshot(
            docRef,
            async (docSnap) => {
                if (!isMounted) return;  // No actualizar si el componente se desmontó

                try {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setPointsData({
                            ...data,
                            completedMissions: data.completedMissions || []
                        });
                        setLoading(false);
                    } else {
                        // Crear documento inicial si no existe
                        console.log('[Loyalty] Creando cuenta de puntos para nuevo usuario...');
                        const initialData = {
                            currentPoints: POINTS_CONFIG.welcomeBonus,
                            totalEarned: POINTS_CONFIG.welcomeBonus,
                            totalRedeemed: 0,
                            completedMissions: ['welcome'],
                            history: [
                                {
                                    id: 'welcome-bonus',
                                    type: 'earned',
                                    points: POINTS_CONFIG.welcomeBonus,
                                    description: '¡Bienvenido! Bono inicial BiKitchen',
                                    date: new Date().toISOString()
                                }
                            ],
                            createdAt: new Date().toISOString()
                        };
                        try {
                            await setDoc(docRef, initialData);
                            if (isMounted) setLoading(false);
                        } catch (error) {
                            console.error('[Loyalty] Error creando documento inicial:', error);
                            if (isMounted) setLoading(false);
                        }
                    }
                } catch (snapshotError) {
                    console.error('[Loyalty] Error procesando snapshot:', snapshotError);
                    if (isMounted) setLoading(false);
                }
            },
            (error) => {
                // Ignorar errores de permisos si el usuario no está autenticado
                if (error.code === 'permission-denied') {
                    console.warn('[Loyalty] Sin permisos para acceder a puntos (posiblemente no autenticado)');
                } else {
                    console.error('[Loyalty] Error escuchando documento de puntos:', error);
                }
                if (isMounted) setLoading(false);
            }
        );

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [currentUser]);

    // Guardar en Firestore
    // FIX #2: Retornar resultado para que llamadores sepan si funcionó
    const saveToFirestore = async (newData) => {
        if (!currentUser) {
            console.warn('[Loyalty] No hay usuario logueado para guardar puntos');
            return { success: false, error: 'No hay usuario' };
        }

        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const normalizedEmail = currentUser.email?.toLowerCase().trim();

            if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
                console.error('[Loyalty] Email inválido para guardar:', currentUser.email);
                return { success: false, error: 'Email inválido' };
            }

            const docRef = doc(db, 'loyalty', normalizedEmail);
            await setDoc(docRef, {
                ...newData,
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error('[Loyalty] Error guardando puntos en Firestore:', error);
            return { success: false, error: error.message };
        }
    };

    // Obtener nivel actual
    const getCurrentLevel = () => nivelPorPuntos(pointsData.totalEarned);

    // Obtener siguiente nivel
    const getNextLevel = () => {
        const totalPoints = pointsData.totalEarned;
        
        for (const level of LOYALTY_LEVELS) {
            if (totalPoints < level.minPoints) {
                return level;
            }
        }
        
        return null; // Ya está en el nivel máximo
    };

    // Calcular puntos a ganar por una compra (con el multiplicador del nivel)
    const calculatePointsForPurchase = (amount) => calcularPuntos(amount, getCurrentLevel());

    // Agregar puntos (después de una compra)
    const addPoints = async (amount, orderNumber) => {
        if (!currentUser) return 0;

        const pointsEarned = calculatePointsForPurchase(amount);

        // Capturar estado actual antes de actualizar
        const snapshotBeforeUpdate = pointsData;

        // FIX 7: Idempotencia — verificar si ya procesamos esta orden
        if (snapshotBeforeUpdate.processedOrders?.includes(orderNumber)) {
            console.warn(`[Loyalty] Orden ${orderNumber} ya fue procesada. Ignorando.`);
            return 0;
        }

        const newHistory = [
            {
                id: Date.now().toString(),
                type: 'earned',
                points: pointsEarned,
                description: `Compra ${orderNumber}`,
                amount: amount,
                date: new Date().toISOString()
            },
            ...snapshotBeforeUpdate.history
        ];

        // FIX 7: Agregar orderNumber a processedOrders
        const processedOrders = snapshotBeforeUpdate.processedOrders || [];
        if (!processedOrders.includes(orderNumber)) {
            processedOrders.push(orderNumber);
        }

        const newData = {
            ...snapshotBeforeUpdate,
            currentPoints: snapshotBeforeUpdate.currentPoints + pointsEarned,
            totalEarned: snapshotBeforeUpdate.totalEarned + pointsEarned,
            history: newHistory.slice(0, 50), // Mantener últimos 50 registros
            processedOrders: processedOrders
        };

        setPointsData(newData);
        const saveResult = await saveToFirestore(newData);

        if (!saveResult.success) {
            console.error('[Loyalty] Error al guardar puntos de compra:', saveResult.error);
            // Revertir SOLO los puntos de esta transacción, no todo el estado
            setPointsData(prevState => ({
                ...prevState,
                currentPoints: prevState.currentPoints - pointsEarned,
                totalEarned: prevState.totalEarned - pointsEarned,
                history: prevState.history.filter(h => h.id !== newHistory[0].id)
            }));
        }

        return pointsEarned;
    };

    // Canjear puntos (ahora es en tienda por productos específicos)
    const redeemItem = async (pointsCost, itemName, metadata = {}) => {
        if (!currentUser) return { success: false, error: 'Debes iniciar sesión' };

        if (pointsCost > pointsData.currentPoints) {
            return { success: false, error: 'No tienes suficientes puntos' };
        }

        const originalPointsData = pointsData; // Guardar para revertir si falla

        const newHistory = [
            {
                id: Date.now().toString(),
                type: 'redeemed',
                points: -pointsCost,
                description: `Canje por: ${itemName}`,
                couponCode: metadata.code || null, // Guardar el código generado
                date: new Date().toISOString()
            },
            ...pointsData.history
        ];

        const newData = {
            ...pointsData,
            currentPoints: pointsData.currentPoints - pointsCost,
            totalRedeemed: pointsData.totalRedeemed + pointsCost,
            history: newHistory.slice(0, 50)
        };

        // El saldo se descuenta con increment(), no escribiendo el número que
        // tenía la pantalla. Los puntos entran por otro lado (el servidor al
        // cobrar la tarjeta, o el admin al confirmar un pedido): si se guardara
        // el total calculado acá, un canje hecho justo después de que entraran
        // puntos los borraría. El resto del documento sí se escribe completo.
        setPointsData(newData);

        let saveResult = { success: false, error: 'No hay usuario' };
        try {
            const normalizedEmail = currentUser.email?.toLowerCase().trim();
            const docRef = doc(db, 'loyalty', normalizedEmail);
            // `points` se descuenta también: es el espejo que escriben el
            // otorgamiento (OrdersContext, nmi-charge) y la auditoría. Si solo
            // bajara `currentPoints`, el espejo iría quedando alto y cualquiera
            // que lo mire —o cualquier respaldo que caiga en él— vería un saldo
            // que el cliente ya gastó.
            await updateDoc(docRef, {
                currentPoints: increment(-pointsCost),
                points: increment(-pointsCost),
                totalRedeemed: increment(pointsCost),
                history: newHistory.slice(0, 50),
                updatedAt: new Date().toISOString()
            });
            saveResult = { success: true };
        } catch (error) {
            console.error('[Loyalty] Error al guardar canje:', error);
            saveResult = { success: false, error: error.message };
        }

        if (!saveResult.success) {
            setPointsData(originalPointsData); // Revertir estado
            return { success: false, error: 'Error al procesar canje. Por favor intenta de nuevo.' };
        }

        return { success: true };
    };

    // Calcular máximo de puntos canjeables (deprecated logic for store, keeping for compat)
    const getMaxRedeemablePoints = (orderTotal) => {
        return pointsData.currentPoints;
    };

    // Progreso al siguiente nivel
    const getProgressToNextLevel = () => {
        const nextLevel = getNextLevel();
        if (!nextLevel) return 100;
        
        const currentLevel = getCurrentLevel();
        const pointsInCurrentLevel = pointsData.totalEarned - currentLevel.minPoints;
        const pointsNeededForNext = nextLevel.minPoints - currentLevel.minPoints;
        
        return Math.min((pointsInCurrentLevel / pointsNeededForNext) * 100, 100);
    };

    // Completar una misión
    const completeMission = async (missionId, pointsAwarded, missionName, handle = null) => {
        if (!currentUser) return { success: false, error: 'Inicia sesión' };

        // Verificar si ya se completó
        const completed = pointsData.completedMissions || [];
        if (completed.includes(missionId)) {
            return { success: false, error: 'Misión ya completada' };
        }

        const originalPointsData = pointsData; // Guardar para revertir si falla

        const newHistory = [
            {
                id: `mission-${missionId}-${Date.now()}`,
                type: 'earned',
                points: pointsAwarded,
                description: `Misión: ${missionName}${handle ? ` (@${handle})` : ''}`,
                date: new Date().toISOString()
            },
            ...pointsData.history
        ];

        const newData = {
            ...pointsData,
            currentPoints: pointsData.currentPoints + pointsAwarded,
            totalEarned: pointsData.totalEarned + pointsAwarded,
            completedMissions: [...completed, missionId],
            history: newHistory.slice(0, 50)
        };

        setPointsData(newData);
        const saveResult = await saveToFirestore(newData);

        if (!saveResult.success) {
            console.error('[Loyalty] Error al guardar misión completada:', saveResult.error);
            setPointsData(originalPointsData); // Revertir estado
            return { success: false, error: 'Error al completar misión. Por favor intenta de nuevo.' };
        }

        return { success: true, points: pointsAwarded };
    };

    return {
        points: pointsData.currentPoints,
        totalEarned: pointsData.totalEarned,
        totalRedeemed: pointsData.totalRedeemed,
        history: pointsData.history,
        completedMissions: pointsData.completedMissions || [],
        currentLevel: getCurrentLevel(),
        nextLevel: getNextLevel(),
        progressToNextLevel: getProgressToNextLevel(),
        loading,
        addPoints,
        redeemItem,
        completeMission,
        getMaxRedeemablePoints,
        config: POINTS_CONFIG,
        levels: LOYALTY_LEVELS
    };
}
