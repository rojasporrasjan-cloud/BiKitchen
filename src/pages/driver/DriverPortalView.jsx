import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Phone, Check, RefreshCw, CheckCircle, AlertCircle, Clock, Map, Package, LogOut, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import { cachedFetch, invalidateCache } from '../../utils/firestoreCache';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getClientWhatsAppUrl } from '../../utils/phoneUtils';
import { getScheduleFromOrder } from '../../utils/orderDates';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DriverPortalView() {
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();
    
    // El portal de repartidores siempre asume "HOY"
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeliveries();
        
        // Timer para recargar automáticamente cada 5 minutos por si el admin cambia la ruta
        const interval = setInterval(() => {
            loadDeliveries(true);
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    const loadDeliveries = async (force = false) => {
        setLoading(true);
        try {
            const cacheKey = `deliveries_${selectedDate}`;
            if (force) invalidateCache(cacheKey);

            const pedidos = await cachedFetch(cacheKey, async () => {
                const targetDate = new Date(selectedDate + 'T12:00:00');
                const pastDate = new Date(targetDate);
                pastDate.setDate(pastDate.getDate() - 40);
                const pastDateStr = pastDate.toISOString().split('T')[0];

                const q = query(
                    collection(db, 'pedidos'),
                    where('fecha_entrega', '>=', pastDateStr)
                );
                const snapshot = await getDocs(q);

                return snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        deliveryStatus: doc.data().deliveryStatus || 'pending'
                    }))
                    .filter(pedido => {
                        if (pedido.status === 'cancelled') return false;
                        return getScheduleFromOrder(pedido).includes(selectedDate);
                    });
            }, 'dashboard');

            pedidos.sort((a, b) => {
                if (a.routeOrder !== undefined && b.routeOrder !== undefined) {
                    return a.routeOrder - b.routeOrder;
                }
                if (a.routeOrder !== undefined) return -1;
                if (b.routeOrder !== undefined) return 1;

                const zonaA = a.zona || a.detalles_entrega?.zona || 'Sin Zona';
                const zonaB = b.zona || b.detalles_entrega?.zona || 'Sin Zona';
                if (zonaA !== zonaB) {
                    return zonaA.localeCompare(zonaB);
                }
                return (a.cliente || '').localeCompare(b.cliente || '');
            });

            setDeliveries(pedidos);
        } catch (error) {
            console.error('Error cargando entregas:', error);
            setDeliveries([]);
        }
        setLoading(false);
    };

    const updateDeliveryStatus = async (pedidoId, newStatus) => {
        try {
            const pedidoRef = doc(db, 'pedidos', pedidoId);
            await updateDoc(pedidoRef, {
                deliveryStatus: newStatus,
                deliveryUpdatedAt: new Date().toISOString()
            });

            setDeliveries(prev => prev.map(d =>
                d.id === pedidoId ? { ...d, deliveryStatus: newStatus } : d
            ));
            
            // Vibrar dispositivo si es posible
            if (navigator.vibrate) {
                navigator.vibrate(newStatus === 'delivered' ? [100, 50, 100] : 100);
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            alert('Error al actualizar el estado de entrega');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const stats = {
        total: deliveries.length,
        pending: deliveries.filter(d => d.deliveryStatus === 'pending').length,
        inTransit: deliveries.filter(d => d.deliveryStatus === 'in_transit').length,
        delivered: deliveries.filter(d => d.deliveryStatus === 'delivered').length
    };

    // Separar lista para que la actual (En ruta) o la siguiente salgan de primero
    const activeDeliveries = deliveries.filter(d => d.deliveryStatus !== 'delivered');
    const completedDeliveries = deliveries.filter(d => d.deliveryStatus === 'delivered');

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Topbar flotante (App style) */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-inner">
                        <Truck className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 leading-tight">Mi Ruta</h1>
                        <p className="text-xs text-gray-500 font-medium">BiKitchen Reparto</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => loadDeliveries(true)} 
                        className="p-2 text-gray-400 hover:text-orange-500 bg-gray-50 rounded-full active:bg-gray-100 transition-colors"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-red-400 hover:text-red-500 bg-red-50 rounded-full active:bg-red-100 transition-colors"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Dashboard - Horizontal Scrollable */}
            <div className="px-4 py-4 flex gap-3 overflow-x-auto snap-x pb-2 hide-scrollbar">
                <div className="snap-center min-w-[140px] bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-1">
                    <p className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1"><Package size={14}/> Total</p>
                    <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                </div>
                <div className="snap-center min-w-[140px] bg-orange-50 rounded-2xl p-4 shadow-sm border border-orange-100 flex-1">
                    <p className="text-xs text-orange-600 font-semibold mb-1 flex items-center gap-1"><Clock size={14}/> Pendientes</p>
                    <p className="text-2xl font-black text-orange-700">{stats.pending + stats.inTransit}</p>
                </div>
                <div className="snap-center min-w-[140px] bg-green-50 rounded-2xl p-4 shadow-sm border border-green-100 flex-1">
                    <p className="text-xs text-green-600 font-semibold mb-1 flex items-center gap-1"><CheckCircle size={14}/> Entregados</p>
                    <p className="text-2xl font-black text-green-700">{stats.delivered}</p>
                </div>
            </div>

            {/* Main List */}
            <div className="px-4 space-y-4">
                {loading && deliveries.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Cargando tu ruta...</p>
                    </div>
                ) : deliveries.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 mt-4">
                        <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Ruta Completada!</h2>
                        <p className="text-gray-500">No hay entregas pendientes para hoy.</p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1 mt-2">En Ruta ({activeDeliveries.length})</h2>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {activeDeliveries.map((delivery, index) => (
                                    <DeliveryCard 
                                        key={delivery.id} 
                                        delivery={delivery} 
                                        index={index + 1}
                                        onUpdateStatus={updateDeliveryStatus} 
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {completedDeliveries.length > 0 && (
                            <>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1 mt-8">Completados ({completedDeliveries.length})</h2>
                                <div className="space-y-4 opacity-75">
                                    {completedDeliveries.map((delivery, index) => (
                                        <DeliveryCard 
                                            key={delivery.id} 
                                            delivery={delivery} 
                                            index={'✓'}
                                            onUpdateStatus={updateDeliveryStatus} 
                                            isCompleted={true}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}

// Subcomponente para cada tarjeta (Optimizado para Touch/Celular)
function DeliveryCard({ delivery, index, onUpdateStatus, isCompleted = false }) {
    const zonaText = delivery.zona || delivery.detalles_entrega?.zona || 'Sin Zona';
    const address = delivery.direccion || delivery.detalles_entrega?.direccion || delivery.details?.address || '';
    const phone = delivery.telefono || '';
    const isTransit = delivery.deliveryStatus === 'in_transit';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-3xl overflow-hidden shadow-sm border ${isCompleted ? 'bg-gray-50 border-gray-200' : isTransit ? 'bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-500/20' : 'bg-white border-gray-100'}`}
        >
            <div className="p-5">
                {/* Header Parada */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${isCompleted ? 'bg-green-100 text-green-700' : isTransit ? 'bg-blue-500 text-white' : 'bg-gray-900 text-white'}`}>
                            {index}
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg leading-tight ${isCompleted ? 'text-gray-600 line-through decoration-2 decoration-green-400' : 'text-gray-900'}`}>
                                {delivery.cliente || 'Sin Nombre'}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Map size={12} className={isTransit ? 'text-blue-500' : 'text-orange-500'} />
                                <span className={`text-xs font-bold uppercase tracking-wide ${isTransit ? 'text-blue-700' : 'text-orange-600'}`}>
                                    {zonaText}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detalles */}
                <div className="bg-white/60 rounded-2xl p-4 space-y-3 mb-4 text-sm border border-black/5">
                    {address && (
                        <div className="flex items-start gap-2 text-gray-700 font-medium">
                            <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                            <p className="leading-snug">{address}</p>
                        </div>
                    )}
                    {phone && (
                        <div className="flex items-center justify-between gap-2 bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-700 font-bold">
                                <Phone size={16} className="text-gray-400" />
                                {phone}
                            </div>
                            {getClientWhatsAppUrl(phone) && (
                                <a 
                                    href={getClientWhatsAppUrl(phone)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] font-bold rounded-lg flex items-center gap-1 hover:bg-[#25D366]/20 active:scale-95 transition-all text-xs"
                                >
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    )}
                    
                    {delivery.observaciones && (
                        <div className="flex items-start gap-2 text-orange-800 bg-orange-100/50 p-3 rounded-xl border border-orange-200/50">
                            <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold">{delivery.observaciones}</p>
                        </div>
                    )}
                </div>

                {/* Botones de Acción (Grandes) */}
                <div className="flex gap-2">
                    {isCompleted ? (
                        <button 
                            onClick={() => onUpdateStatus(delivery.id, 'pending')}
                            className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex justify-center items-center gap-2 text-sm"
                        >
                            <RefreshCw size={18} />
                            Revertir Entrega
                        </button>
                    ) : isTransit ? (
                        <button 
                            onClick={() => onUpdateStatus(delivery.id, 'delivered')}
                            className="flex-1 py-4 bg-gradient-to-r from-green-400 to-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-500/30 active:scale-95 transition-all flex justify-center items-center gap-2 text-lg"
                        >
                            <CheckCircle size={24} />
                            ENTREGADO
                        </button>
                    ) : (
                        <button 
                            onClick={() => onUpdateStatus(delivery.id, 'in_transit')}
                            className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2 text-sm"
                        >
                            <Navigation size={18} />
                            Ir Hacia Allá
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
