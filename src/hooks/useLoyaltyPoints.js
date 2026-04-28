import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// Configuración del programa (BiPuntos)
const POINTS_CONFIG = {
    pointsPerColon: 0.02, // 2 puntos por cada ₡100 gastados (200k = 4,000 pts)
    colonesPerPoint: 50,  // ₡50 = 1 punto
    welcomeBonus: 500,     // 500 puntos de bienvenida
    referralReward: 200,   // 200 puntos por referido
    // pointValue y maxRedeemPercent ya no se usan directamente para pagar "cash", 
    // se usan los puntos en la "Tienda de Recompensas" para canjear productos/cupones.
};

// Niveles del programa
const LOYALTY_LEVELS = [
    { 
        name: 'Bronce', 
        minPoints: 0, 
        icon: '🥉', 
        color: 'from-amber-600 to-amber-700',
        multiplier: 1,
        benefits: ['Gana 2 BiPuntos por cada ₡100', 'Acceso a Tienda de Recompensas']
    },
    { 
        name: 'Plata', 
        minPoints: 1500, // ~₡75,000 en compras cumulativas (con tasa 2%)
        icon: '🥈', 
        color: 'from-gray-400 to-gray-500',
        multiplier: 1.2, // 1.2x puntos
        benefits: ['Gana 2.4 BiPuntos por cada ₡100 (1.2x)', 'Acceso a Tienda de Recompensas']
    },
    { 
        name: 'Oro', 
        minPoints: 5000, // ~₡250,000 en compras cumulativas
        icon: '🥇', 
        color: 'from-yellow-400 to-yellow-500',
        multiplier: 1.5, // 1.5x puntos
        benefits: ['Gana 3 BiPuntos por cada ₡100 (1.5x)', 'Acceso a Tienda de Recompensas']
    },
    { 
        name: 'Platino', 
        minPoints: 15000, // ~₡750,000 en compras cumulativas
        icon: '💎', 
        color: 'from-cyan-400 to-blue-500',
        multiplier: 2, // 2x puntos
        benefits: ['Gana 4 BiPuntos por cada ₡100 (2x)', 'Acceso a Tienda de Recompensas']
    }
];

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

        const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
        
        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
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
                await setDoc(docRef, initialData);
                // No llamamos a setLoading(false) aquí: el próximo snapshot lo hará
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Guardar en Firestore
    const saveToFirestore = async (newData) => {
        if (!currentUser) return;
        
        try {
            const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
            await setDoc(docRef, {
                ...newData,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving loyalty points:', error);
        }
    };

    // Obtener nivel actual
    const getCurrentLevel = () => {
        const totalPoints = pointsData.totalEarned;
        let currentLevel = LOYALTY_LEVELS[0];
        
        for (const level of LOYALTY_LEVELS) {
            if (totalPoints >= level.minPoints) {
                currentLevel = level;
            }
        }
        
        return currentLevel;
    };

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

    // Calcular puntos a ganar por una compra
    const calculatePointsForPurchase = (amount) => {
        const level = getCurrentLevel();
        const basePoints = Math.floor(amount * POINTS_CONFIG.pointsPerColon);
        return Math.floor(basePoints * level.multiplier);
    };

    // Agregar puntos (después de una compra)
    const addPoints = async (amount, orderNumber) => {
        if (!currentUser) return 0;
        
        const pointsEarned = calculatePointsForPurchase(amount);
        
        const newHistory = [
            {
                id: Date.now().toString(),
                type: 'earned',
                points: pointsEarned,
                description: `Compra ${orderNumber}`,
                amount: amount,
                date: new Date().toISOString()
            },
            ...pointsData.history
        ];

        const newData = {
            ...pointsData,
            currentPoints: pointsData.currentPoints + pointsEarned,
            totalEarned: pointsData.totalEarned + pointsEarned,
            history: newHistory.slice(0, 50) // Mantener últimos 50 registros
        };

        setPointsData(newData);
        await saveToFirestore(newData);
        
        return pointsEarned;
    };

    // Canjear puntos (ahora es en tienda por productos específicos)
    const redeemItem = async (pointsCost, itemName, metadata = {}) => {
        if (!currentUser) return { success: false, error: 'Debes iniciar sesión' };
        
        if (pointsCost > pointsData.currentPoints) {
            return { success: false, error: 'No tienes suficientes puntos' };
        }

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

        setPointsData(newData);
        await saveToFirestore(newData);

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
        await saveToFirestore(newData);
        
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
