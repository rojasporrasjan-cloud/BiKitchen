import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send, User, ThumbsUp, MessageSquare } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

/**
 * Componente de estrellas para calificación
 */
export function StarRating({ rating, onRate, size = 20, readonly = false }) {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => !readonly && onRate && onRate(star)}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    className={`transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                >
                    <Star
                        size={size}
                        className={`transition-colors ${
                            (hoverRating || rating) >= star
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-200 text-gray-200'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

/**
 * Mostrar promedio de calificaciones
 */
export function RatingDisplay({ productId, showCount = true }) {
    const [stats, setStats] = useState({ average: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const q = query(
                    collection(db, 'reviews'),
                    where('productId', '==', productId)
                );
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) {
                    setStats({ average: 0, count: 0 });
                } else {
                    const ratings = snapshot.docs.map(doc => doc.data().rating);
                    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                    setStats({ average: Math.round(average * 10) / 10, count: ratings.length });
                }
            } catch (error) {
                console.error('Error fetching ratings:', error);
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchRatings();
        }
    }, [productId]);

    if (loading) {
        return <div className="h-5 w-20 bg-gray-200 animate-pulse rounded" />;
    }

    if (stats.count === 0) {
        return (
            <div className="flex items-center gap-1 text-sm text-gray-400">
                <Star size={14} className="fill-gray-200 text-gray-200" />
                <span>Sin reseñas</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            <StarRating rating={stats.average} readonly size={14} />
            <span className="text-sm font-medium text-gray-700">{stats.average}</span>
            {showCount && (
                <span className="text-sm text-gray-400">({stats.count})</span>
            )}
        </div>
    );
}

/**
 * Modal para escribir reseña
 */
export function ReviewModal({ isOpen, onClose, product, onSubmit }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (rating === 0) {
            toast.error('Por favor selecciona una calificación');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'reviews'), {
                productId: product.id,
                productName: product.name,
                rating,
                comment: comment.trim(),
                authorName: name.trim() || 'Cliente Anónimo',
                createdAt: serverTimestamp(),
                helpful: 0,
                verified: false
            });

            toast.success('¡Gracias por tu reseña!');
            onSubmit && onSubmit();
            onClose();
            setRating(0);
            setComment('');
            setName('');
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Error al enviar la reseña');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[201] px-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold">Calificar producto</h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                {/* Product info */}
                                <div className="text-center pb-4 border-b">
                                    <p className="font-medium text-gray-900">{product?.name}</p>
                                    <p className="text-sm text-gray-500">¿Qué te pareció?</p>
                                </div>

                                {/* Star rating */}
                                <div className="flex flex-col items-center gap-2">
                                    <StarRating rating={rating} onRate={setRating} size={32} />
                                    <p className="text-sm text-gray-500">
                                        {rating === 0 && 'Selecciona una calificación'}
                                        {rating === 1 && 'Muy malo'}
                                        {rating === 2 && 'Malo'}
                                        {rating === 3 && 'Regular'}
                                        {rating === 4 && 'Bueno'}
                                        {rating === 5 && '¡Excelente!'}
                                    </p>
                                </div>

                                {/* Name input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tu nombre (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Cliente Anónimo"
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange outline-none transition-all"
                                    />
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Comentario (opcional)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Cuéntanos tu experiencia..."
                                        rows={3}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange outline-none transition-all resize-none"
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={submitting || rating === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-bikitchen-orange text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Enviar reseña
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Lista de reseñas de un producto
 */
export function ReviewsList({ productId, maxReviews = 5 }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const q = query(
                    collection(db, 'reviews'),
                    where('productId', '==', productId),
                    orderBy('createdAt', 'desc'),
                    limit(maxReviews)
                );
                const snapshot = await getDocs(q);
                const reviewsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setReviews(reviewsData);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchReviews();
        }
    }, [productId, maxReviews]);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p>Aún no hay reseñas</p>
                <p className="text-sm">¡Sé el primero en opinar!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <User size={16} className="text-gray-400" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{review.authorName}</p>
                                <StarRating rating={review.rating} readonly size={12} />
                            </div>
                        </div>
                        {review.verified && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Verificado
                            </span>
                        )}
                    </div>
                    {review.comment && (
                        <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                        <span>
                            {review.createdAt?.toDate?.()?.toLocaleDateString('es-CR') || 'Reciente'}
                        </span>
                        {review.helpful > 0 && (
                            <span className="flex items-center gap-1">
                                <ThumbsUp size={12} />
                                {review.helpful} útil
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Botón para abrir modal de reseña
 */
export function ReviewButton({ product, onReviewSubmit }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 text-sm text-bikitchen-orange hover:text-orange-600 transition-colors"
            >
                <Star size={16} />
                Calificar
            </button>
            <ReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={product}
                onSubmit={onReviewSubmit}
            />
        </>
    );
}

export default {
    StarRating,
    RatingDisplay,
    ReviewModal,
    ReviewsList,
    ReviewButton
};
