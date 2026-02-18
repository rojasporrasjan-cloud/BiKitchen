import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    doc,
    updateDoc,
    increment
} from 'firebase/firestore';
import { cachedFetch, invalidateCache } from '../utils/firestoreCache';

/**
 * Hook para manejar reseñas de productos
 */
export function useReviews(productId) {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ average: 0, count: 0, distribution: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar reseñas
    const fetchReviews = useCallback(async () => {
        if (!productId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const cacheKey = `reviews_${productId}`;
            const reviewsData = await cachedFetch(cacheKey, async () => {
                const q = query(
                    collection(db, 'reviews'),
                    where('productId', '==', productId),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }, 'reviews');
            
            setReviews(reviewsData);
            
            // Calcular estadísticas
            if (reviewsData.length > 0) {
                const ratings = reviewsData.map(r => r.rating);
                const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                
                // Distribución de calificaciones
                const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                ratings.forEach(r => distribution[r]++);
                
                setStats({
                    average: Math.round(average * 10) / 10,
                    count: reviewsData.length,
                    distribution
                });
            } else {
                setStats({ average: 0, count: 0, distribution: {} });
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    // Marcar reseña como útil
    const markHelpful = async (reviewId) => {
        try {
            const reviewRef = doc(db, 'reviews', reviewId);
            await updateDoc(reviewRef, {
                helpful: increment(1)
            });
            
            // Actualizar estado local
            setReviews(prev => prev.map(r => 
                r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r
            ));

            // Invalidar cachés relacionados
            if (productId) {
                invalidateCache(`reviews_${productId}`);
                invalidateCache(`ratings_${productId}`);
            }
        } catch (err) {
            console.error('Error marking helpful:', err);
        }
    };

    // Cargar al montar
    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    return {
        reviews,
        stats,
        loading,
        error,
        refetch: fetchReviews,
        markHelpful
    };
}

/**
 * Hook para obtener estadísticas de múltiples productos
 */
export function useProductsRatings(productIds = []) {
    const [ratings, setRatings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllRatings = async () => {
            if (productIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const ratingsMap = {};
                
                // Fetch en paralelo para mejor rendimiento
                await Promise.all(productIds.map(async (productId) => {
                    const key = `ratings_${productId}`;
                    const res = await cachedFetch(key, async () => {
                        const q = query(
                            collection(db, 'reviews'),
                            where('productId', '==', productId)
                        );
                        const snapshot = await getDocs(q);
                        if (!snapshot.empty) {
                            const reviewRatings = snapshot.docs.map(doc => doc.data().rating);
                            const average = reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length;
                            return {
                                average: Math.round(average * 10) / 10,
                                count: reviewRatings.length
                            };
                        }
                        return { average: 0, count: 0 };
                    }, 'ratings');
                    ratingsMap[productId] = res;
                }));
                
                setRatings(ratingsMap);
            } catch (error) {
                console.error('Error fetching ratings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllRatings();
    }, [productIds.join(',')]);

    return { ratings, loading };
}

export default useReviews;
