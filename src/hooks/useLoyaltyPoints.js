import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Configuración del programa - AJUSTADO para ser más realista
const POINTS_CONFIG = {
    pointsPerColon: 0.001, // 1 punto por cada ₡1,000 gastados
    colonesPerPoint: 1000, // ₡1,000 = 1 punto
    pointValue: 100, // Cada punto vale ₡100 al canjear
    minRedeemPoints: 50, // Mínimo 50 puntos para canjear (₡5,000)
    maxRedeemPercent: 30, // Máximo 30% del pedido se puede pagar con puntos
};

// Niveles del programa - Requiere compras significativas para subir
const LOYALTY_LEVELS = [
    { 
        name: 'Bronce', 
        minPoints: 0, 
        icon: '🥉', 
        color: 'from-amber-600 to-amber-700',
        multiplier: 1,
        benefits: ['1 punto por cada ₡1,000']
    },
    { 
        name: 'Plata', 
        minPoints: 150, // ~₡150,000 en compras (~6 pedidos de ₡25k)
        icon: '🥈', 
        color: 'from-gray-400 to-gray-500',
        multiplier: 1.25,
        benefits: ['1.25x puntos', 'Acceso anticipado a promos']
    },
    { 
        name: 'Oro', 
        minPoints: 500, // ~₡500,000 en compras (~20 pedidos de ₡25k)
        icon: '🥇', 
        color: 'from-yellow-400 to-yellow-500',
        multiplier: 1.5,
        benefits: ['1.5x puntos', 'Envío prioritario', 'Ofertas exclusivas']
    },
    { 
        name: 'Platino', 
        minPoints: 1500, // ~₡1,500,000 en compras (~60 pedidos de ₡25k)
        icon: '💎', 
        color: 'from-cyan-400 to-blue-500',
        multiplier: 2,
        benefits: ['2x puntos', 'Envío gratis', 'Regalos sorpresa', 'Soporte VIP']
    }
];

export default function useLoyaltyPoints() {
    const { currentUser } = useAuth() || {};
    const [pointsData, setPointsData] = useState({
        currentPoints: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        history: []
    });
    const [loading, setLoading] = useState(true);

    // Cargar datos desde Firestore
    useEffect(() => {
        const loadPointsFromFirestore = async () => {
            if (!currentUser) {
                setPointsData({
                    currentPoints: 0,
                    totalEarned: 0,
                    totalRedeemed: 0,
                    history: []
                });
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'loyalty', currentUser.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setPointsData(docSnap.data());
                } else {
                    // Crear documento inicial para el usuario
                    const initialData = {
                        currentPoints: 0,
                        totalEarned: 0,
                        totalRedeemed: 0,
                        history: [],
                        createdAt: new Date().toISOString()
                    };
                    await setDoc(docRef, initialData);
                    setPointsData(initialData);
                }
            } catch (error) {
                console.error('Error loading loyalty points:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPointsFromFirestore();
    }, [currentUser]);

    // Guardar en Firestore
    const saveToFirestore = async (newData) => {
        if (!currentUser) return;
        
        try {
            const docRef = doc(db, 'loyalty', currentUser.uid);
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

    // Canjear puntos
    const redeemPoints = async (points, orderNumber) => {
        if (!currentUser) {
            return { success: false, error: 'Debes iniciar sesión' };
        }
        
        if (points > pointsData.currentPoints) {
            return { success: false, error: 'No tienes suficientes puntos' };
        }
        
        if (points < POINTS_CONFIG.minRedeemPoints) {
            return { success: false, error: `Mínimo ${POINTS_CONFIG.minRedeemPoints} puntos para canjear` };
        }

        const discount = points * POINTS_CONFIG.pointValue;

        const newHistory = [
            {
                id: Date.now().toString(),
                type: 'redeemed',
                points: -points,
                description: `Canjeado en ${orderNumber}`,
                discount: discount,
                date: new Date().toISOString()
            },
            ...pointsData.history
        ];

        const newData = {
            ...pointsData,
            currentPoints: pointsData.currentPoints - points,
            totalRedeemed: pointsData.totalRedeemed + points,
            history: newHistory.slice(0, 50)
        };

        setPointsData(newData);
        await saveToFirestore(newData);

        return { success: true, discount };
    };

    // Calcular máximo de puntos canjeables para un pedido
    const getMaxRedeemablePoints = (orderTotal) => {
        const maxByPercent = Math.floor((orderTotal * POINTS_CONFIG.maxRedeemPercent / 100) / POINTS_CONFIG.pointValue);
        const maxByBalance = pointsData.currentPoints;
        return Math.min(maxByPercent, maxByBalance);
    };

    // Convertir puntos a colones
    const pointsToColones = (points) => {
        return points * POINTS_CONFIG.pointValue;
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

    return {
        points: pointsData.currentPoints,
        totalEarned: pointsData.totalEarned,
        totalRedeemed: pointsData.totalRedeemed,
        history: pointsData.history,
        currentLevel: getCurrentLevel(),
        nextLevel: getNextLevel(),
        progressToNextLevel: getProgressToNextLevel(),
        loading,
        addPoints,
        redeemPoints,
        calculatePointsForPurchase,
        getMaxRedeemablePoints,
        pointsToColones,
        config: POINTS_CONFIG,
        levels: LOYALTY_LEVELS
    };
}
