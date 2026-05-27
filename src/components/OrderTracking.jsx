import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    CheckCircle2, 
    Clock, 
    ChefHat, 
    Truck, 
    Package, 
    MapPin,
    Phone,
    MessageCircle,
    RefreshCw
} from 'lucide-react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useWhatsApp } from '../hooks/useWhatsApp';

// Estados del pedido en orden
const ORDER_STATES = [
    { 
        id: 'pendiente', 
        label: 'Pedido Recibido', 
        icon: Clock,
        description: 'Tu pedido ha sido recibido y está siendo procesado'
    },
    { 
        id: 'confirmado', 
        label: 'Confirmado', 
        icon: CheckCircle2,
        description: 'Tu pedido ha sido confirmado'
    },
    { 
        id: 'preparando', 
        label: 'En Preparación', 
        icon: ChefHat,
        description: 'Nuestros chefs están preparando tu comida con amor'
    },
    { 
        id: 'en-camino', 
        label: 'En Camino', 
        icon: Truck,
        description: 'Tu pedido va en camino a tu dirección'
    },
    { 
        id: 'entregado', 
        label: 'Entregado', 
        icon: Package,
        description: '¡Pedido entregado! Buen provecho 🎉'
    }
];

/**
 * Componente de tracking de pedido en tiempo real
 */
export default function OrderTracking({ orderId, initialOrder = null }) {
    const [order, setOrder] = useState(initialOrder);
    const [loading, setLoading] = useState(!initialOrder);
    const [error, setError] = useState(null);

    // Escuchar cambios en tiempo real
    useEffect(() => {
        if (!orderId) return;

        const unsubscribe = onSnapshot(
            doc(db, 'orders', orderId),
            (doc) => {
                if (doc.exists()) {
                    setOrder({ id: doc.id, ...doc.data() });
                    setError(null);
                } else {
                    setError('Pedido no encontrado');
                }
                setLoading(false);
            },
            (err) => {
                setError('Error al cargar el pedido');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [orderId]);

    if (loading) {
        return <TrackingSkeletonLoader />;
    }

    if (error) {
        return (
            <div className="bg-red-50 rounded-2xl p-6 text-center">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!order) return null;

    const currentStateIndex = ORDER_STATES.findIndex(s => s.id === order.estado);
    const isCancelled = order.estado === 'cancelado';

    return (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-bikitchen-orange to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-80">Pedido</span>
                    <span className="text-sm opacity-80">
                        {order.createdAt?.toDate?.()?.toLocaleDateString('es-CR')}
                    </span>
                </div>
                <h2 className="text-2xl font-bold">#{order.orderNumber || orderId?.slice(-6).toUpperCase()}</h2>
            </div>

            {/* Estado actual */}
            <div className="p-6 border-b">
                {isCancelled ? (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h3 className="text-lg font-semibold text-red-600">Pedido Cancelado</h3>
                        <p className="text-sm text-gray-500 mt-1">{order.motivoCancelacion || 'El pedido fue cancelado'}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-12 h-12 bg-bikitchen-orange/10 rounded-full flex items-center justify-center"
                            >
                                {(() => {
                                    const CurrentIcon = ORDER_STATES[currentStateIndex]?.icon;
                                    return CurrentIcon ? <CurrentIcon className="text-bikitchen-orange" size={24} /> : null;
                                })()}
                            </motion.div>
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {ORDER_STATES[currentStateIndex]?.label || 'Procesando'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {ORDER_STATES[currentStateIndex]?.description}
                                </p>
                            </div>
                        </div>

                        {/* Tiempo estimado */}
                        {order.estado !== 'entregado' && (
                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                                <Clock size={18} className="text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium">Tiempo estimado de entrega</p>
                                    <p className="text-xs text-gray-500">
                                        {order.horaEntrega || 'Entre 10:00 AM y 2:00 PM'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Timeline */}
            {!isCancelled && (
                <div className="p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Progreso del pedido</h4>
                    <div className="relative">
                        {ORDER_STATES.map((state, index) => {
                            const isCompleted = index <= currentStateIndex;
                            const isCurrent = index === currentStateIndex;
                            const Icon = state.icon;

                            return (
                                <div key={state.id} className="flex gap-4 mb-6 last:mb-0">
                                    {/* Línea conectora */}
                                    {index < ORDER_STATES.length - 1 && (
                                        <div 
                                            className={`absolute left-[19px] w-0.5 h-12 mt-10 ${
                                                index < currentStateIndex ? 'bg-bikitchen-orange' : 'bg-gray-200'
                                            }`}
                                            style={{ top: `${index * 72}px` }}
                                        />
                                    )}

                                    {/* Icono */}
                                    <motion.div
                                        initial={false}
                                        animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                                        transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
                                        className={`
                                            relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                                            ${isCompleted 
                                                ? 'bg-bikitchen-orange text-white' 
                                                : 'bg-gray-100 text-gray-400'
                                            }
                                        `}
                                    >
                                        <Icon size={18} />
                                    </motion.div>

                                    {/* Texto */}
                                    <div className="flex-1 pt-2">
                                        <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {state.label}
                                        </p>
                                        {isCompleted && order[`${state.id}At`] && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(order[`${state.id}At`]).toLocaleTimeString('es-CR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    {/* Check */}
                                    {isCompleted && (
                                        <CheckCircle2 size={18} className="text-green-500 mt-2" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Información de entrega */}
            {order.direccion && (
                <div className="p-6 border-t bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Dirección de entrega</h4>
                    <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-gray-400 mt-0.5" />
                        <div>
                            <p className="font-medium">{order.direccion.canton}</p>
                            <p className="text-sm text-gray-500">{order.direccion.direccionExacta}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Acciones */}
            <div className="p-4 border-t flex gap-2">
                <a
                    href={getWhatsAppUrl('Hola, tengo una consulta sobre mi pedido 📦')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                >
                    <MessageCircle size={18} />
                    <span className="font-medium">Contactar</span>
                </a>
                <button
                    onClick={() => window.location.reload()}
                    className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                    <RefreshCw size={18} className="text-gray-600" />
                </button>
            </div>
        </div>
    );
}

/**
 * Skeleton loader para el tracking
 */
function TrackingSkeletonLoader() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden animate-pulse">
            <div className="bg-gray-200 h-28" />
            <div className="p-6">
                <div className="flex gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-48" />
                    </div>
                </div>
            </div>
            <div className="p-6 border-t">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex gap-4 mb-6">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="flex-1 pt-2">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Mini widget de tracking para mostrar en otras páginas
 */
export function TrackingWidget({ order }) {
    if (!order) return null;

    const currentStateIndex = ORDER_STATES.findIndex(s => s.id === order.estado);
    const progress = ((currentStateIndex + 1) / ORDER_STATES.length) * 100;

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Pedido #{order.orderNumber?.slice(-6)}</span>
                <span className="text-xs px-2 py-1 bg-bikitchen-orange/10 text-bikitchen-orange rounded-full font-medium">
                    {ORDER_STATES[currentStateIndex]?.label}
                </span>
            </div>

            {/* Barra de progreso */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-bikitchen-orange rounded-full"
                />
            </div>

            <div className="flex justify-between mt-2">
                {ORDER_STATES.map((state, i) => (
                    <div
                        key={state.id}
                        className={`w-2 h-2 rounded-full ${
                            i <= currentStateIndex ? 'bg-bikitchen-orange' : 'bg-gray-200'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Hook para tracking de pedido
 */
export function useOrderTracking(orderId) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'orders', orderId),
            (doc) => {
                if (doc.exists()) {
                    setOrder({ id: doc.id, ...doc.data() });
                } else {
                    setError('Pedido no encontrado');
                }
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [orderId]);

    return { order, loading, error };
}
