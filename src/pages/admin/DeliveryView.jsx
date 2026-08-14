import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Phone, Check, Calendar, Navigation, Clock, Package, RefreshCw, CheckCircle, AlertCircle, ChevronDown, Map, Save, GripVertical } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { db } from '../../firebase/config';
import { cachedFetch, invalidateCache } from '../../utils/firestoreCache';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getClientWhatsAppUrl } from '../../utils/phoneUtils';
import { getScheduleFromOrder } from '../../utils/orderDates';

/**
 * DeliveryView - Vista de Reparto
 * Conectada a Firebase para mostrar pedidos reales del día
 * Permite marcar entregas como completadas
 */
export default function DeliveryView() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditingRoute, setIsEditingRoute] = useState(false);
    const [savingRoute, setSavingRoute] = useState(false);

    // Cargar pedidos de Firebase por fecha
    useEffect(() => {
        loadDeliveries();
    }, [selectedDate]);

    const loadDeliveries = async (force = false) => {
        setLoading(true);
        try {
            const cacheKey = `deliveries_${selectedDate}`;
            if (force) invalidateCache(cacheKey);

            const pedidos = await cachedFetch(cacheKey, async () => {
                // Mismo criterio que Producción y la Hoja de Despacho. Antes se
                // buscaba por fecha_entrega == selectedDate, y eso dejaba fuera las
                // semanas 2, 3 y 4 de los packs mensuales: solo la primera entrega
                // tiene esa fecha guardada, el resto vive en el calendario del pedido.
                // El repartidor no los veía y esos clientes no recibían su comida.
                const targetDate = new Date(selectedDate + 'T12:00:00');
                const pastDate = new Date(targetDate);
                pastDate.setDate(pastDate.getDate() - 40); // cubre packs de hasta 4 semanas
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

            // Ordenar: primero por routeOrder, luego por zona (agrupación), luego alfabético
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

    // Guardar orden de ruta
    const saveRouteOrder = async () => {
        setSavingRoute(true);
        try {
            const batchPromises = deliveries.map((d, index) => {
                const pedidoRef = doc(db, 'pedidos', d.id);
                return updateDoc(pedidoRef, { routeOrder: index + 1 });
            });
            await Promise.all(batchPromises);
            setIsEditingRoute(false);
        } catch (error) {
            console.error('Error guardando ruta:', error);
            alert('Error al guardar el orden de la ruta');
        }
        setSavingRoute(false);
    };

    // Actualizar estado de entrega en Firebase
    const updateDeliveryStatus = async (pedidoId, newStatus) => {
        try {
            const pedidoRef = doc(db, 'pedidos', pedidoId);
            await updateDoc(pedidoRef, {
                deliveryStatus: newStatus,
                deliveryUpdatedAt: new Date().toISOString()
            });

            // Actualizar estado local
            setDeliveries(prev => prev.map(d =>
                d.id === pedidoId ? { ...d, deliveryStatus: newStatus } : d
            ));
        } catch (error) {
            console.error('Error actualizando estado:', error);
            alert('Error al actualizar el estado de entrega');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'in_transit': return 'bg-blue-100 text-blue-700';
            case 'delivered': return 'bg-green-100 text-green-700';
            case 'failed': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'in_transit': return 'En Ruta';
            case 'delivered': return 'Entregado';
            case 'failed': return 'Fallido';
            default: return 'Pendiente';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return Clock;
            case 'in_transit': return Truck;
            case 'delivered': return CheckCircle;
            case 'failed': return AlertCircle;
            default: return Clock;
        }
    };

    // Estadísticas
    const stats = {
        total: deliveries.length,
        pending: deliveries.filter(d => d.deliveryStatus === 'pending').length,
        inTransit: deliveries.filter(d => d.deliveryStatus === 'in_transit').length,
        delivered: deliveries.filter(d => d.deliveryStatus === 'delivered').length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <AdminPageHeader
                icon={Truck}
                title="Reparto del Día"
                subtitle="Gestión de entregas y rutas de distribución"
                gradient="from-orange-500 via-amber-400 to-yellow-400"
                stats={[
                    { value: stats.total, label: 'Total' },
                    { value: stats.pending, label: 'Pendientes' },
                    { value: stats.delivered, label: 'Entregados' }
                ]}
                actions={[
                    <div key="date" className="relative">
                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 pointer-events-none" />
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl bg-white text-gray-700 text-sm font-medium border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer appearance-none min-w-[200px]"
                        >
                            {/* Generar fechas válidas (Lunes, Miércoles, Sábado) +/- 30 días */}
                            {(() => {
                                const dates = [];
                                const now = new Date();
                                const days = [-30, 30]; // Rango de días
                                const deliveryDays = [1, 3, 6]; // Lun, Mié, Sáb

                                for (let i = -30; i <= 30; i++) {
                                    const d = new Date();
                                    d.setDate(now.getDate() + i);
                                    if (deliveryDays.includes(d.getDay())) {
                                        const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                        const label = d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' });
                                        // Capitalize
                                        const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
                                        dates.push({ val, label: labelCap, isToday: i === 0 });
                                    }
                                }
                                // Asegurar que la fecha seleccionada esté en la lista (si es una excepción o fecha vieja/futura fuera de rango)
                                if (!dates.find(d => d.val === selectedDate)) {
                                    const d = new Date(selectedDate + 'T00:00:00');
                                    if (!isNaN(d.getTime())) {
                                        const label = d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' });
                                        dates.push({ val: selectedDate, label: label.charAt(0).toUpperCase() + label.slice(1) + ' (Excepción)', sort: d.getTime() });
                                        dates.sort((a, b) => (a.sort || new Date(a.val)) - (b.sort || new Date(b.val)));
                                    }
                                }

                                return dates.map((d, idx) => (
                                    <option key={d.val} value={d.val}>
                                        {d.isToday ? 'HOY - ' : ''}{d.label}
                                    </option>
                                ));
                            })()}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>,
                    <div key="actions" className="flex items-center gap-2">
                        {isEditingRoute ? (
                            <button
                                onClick={saveRouteOrder}
                                disabled={savingRoute}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg font-medium"
                            >
                                {savingRoute ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                Guardar Ruta
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditingRoute(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                            >
                                <Map size={16} /> Organizar Ruta
                            </button>
                        )}
                        <button
                            onClick={() => loadDeliveries(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                ]}

            />

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-white via-gray-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Total</span>
                        <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-xl shadow-lg">
                            <Package size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-white via-yellow-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Pendientes</span>
                        <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl shadow-lg">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.pending}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-white via-blue-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">En Ruta</span>
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-xl shadow-lg">
                            <Truck size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.inTransit}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-white via-green-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Entregados</span>
                        <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl shadow-lg">
                            <CheckCircle size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.delivered}</div>
                </motion.div>
            </motion.div>

            {/* Deliveries List */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw size={32} className="animate-spin mx-auto text-orange-500 mb-4" />
                    <p className="text-gray-500">Cargando entregas...</p>
                </div>
            ) : deliveries.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay entregas programadas para esta fecha</p>
                    <p className="text-sm text-gray-400 mt-1">Selecciona otra fecha o crea nuevos pedidos</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <Reorder.Group 
                        axis="y" 
                        values={deliveries} 
                        onReorder={setDeliveries} 
                        className="divide-y divide-gray-100"
                    >
                        {deliveries.map((delivery, index) => {
                            const StatusIcon = getStatusIcon(delivery.deliveryStatus);
                            const zonaText = delivery.zona || delivery.detalles_entrega?.zona || 'Sin Zona';
                            return (
                                <Reorder.Item
                                    key={delivery.id}
                                    value={delivery}
                                    dragListener={isEditingRoute}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-4 hover:bg-gray-50 transition-colors flex gap-4 ${isEditingRoute ? 'cursor-grab active:cursor-grabbing bg-orange-50/30' : ''}`}
                                >
                                    {isEditingRoute && (
                                        <div className="flex items-center text-gray-400">
                                            <GripVertical size={24} />
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between flex-1">
                                        {/* Info del cliente */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-bold text-gray-900">{delivery.cliente || 'Sin nombre'}</span>
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-900 text-white flex items-center gap-1">
                                                    <Navigation size={12} />
                                                    Parada {index + 1}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${getStatusColor(delivery.deliveryStatus)}`}>
                                                    <StatusIcon size={12} />
                                                    {getStatusLabel(delivery.deliveryStatus)}
                                                </span>
                                            </div>

                                            <div className="space-y-1 text-sm text-gray-600">
                                                {zonaText !== 'Sin Zona' && (
                                                    <div className="flex items-center gap-2 font-medium text-orange-700">
                                                        <Map size={14} />
                                                        <span>{zonaText}</span>
                                                    </div>
                                                )}
                                                {(delivery.direccion || delivery.detalles_entrega?.direccion || delivery.details?.address) && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-gray-400" />
                                                        <span>{delivery.direccion || delivery.detalles_entrega?.direccion || delivery.details?.address}</span>
                                                    </div>
                                                )}
                                                {delivery.telefono && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={14} className="text-gray-400" />
                                                        <span>{delivery.telefono}</span>
                                                    </div>
                                                )}
                                                {delivery.plan && (
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} className="text-gray-400" />
                                                        <span>{delivery.plan}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {delivery.observaciones && (
                                                <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                                                    ⚠️ {delivery.observaciones}
                                                </div>
                                            )}
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex items-center gap-2">
                                            {delivery.deliveryStatus === 'pending' && (
                                                <button
                                                    onClick={() => updateDeliveryStatus(delivery.id, 'in_transit')}
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                                >
                                                    <Truck size={16} />
                                                    En Ruta
                                                </button>
                                            )}
                                            {delivery.deliveryStatus === 'in_transit' && (
                                                <button
                                                    onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                                                    className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                                                >
                                                    <Check size={16} />
                                                    Entregado
                                                </button>
                                            )}
                                            {delivery.deliveryStatus === 'delivered' && (
                                                <button
                                                    onClick={() => updateDeliveryStatus(delivery.id, 'pending')}
                                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                                >
                                                    <RefreshCw size={16} />
                                                    Revertir
                                                </button>
                                            )}

                                            {getClientWhatsAppUrl(delivery.telefono) && (
                                                <a
                                                    href={getClientWhatsAppUrl(delivery.telefono)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                                    title="WhatsApp"
                                                >
                                                    <Phone size={18} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>
                </div>
            )}

            {/* Quick Actions */}
            {deliveries.length > 0 && stats.pending > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Truck className="text-orange-500" size={24} />
                            <div>
                                <p className="font-medium text-orange-800">
                                    {stats.pending} entrega{stats.pending !== 1 ? 's' : ''} pendiente{stats.pending !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-orange-600">
                                    {stats.delivered} de {stats.total} completadas ({Math.round((stats.delivered / stats.total) * 100)}%)
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const pendingCount = deliveries.filter(d => d.deliveryStatus === 'pending').length;
                                if (!window.confirm(`¿Iniciar ruta para ${pendingCount} entrega${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}?`)) return;
                                deliveries
                                    .filter(d => d.deliveryStatus === 'pending')
                                    .forEach(d => updateDeliveryStatus(d.id, 'in_transit'));
                            }}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                        >
                            Iniciar Todas las Rutas
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
