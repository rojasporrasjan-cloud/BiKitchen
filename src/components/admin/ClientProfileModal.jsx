import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    ShoppingBag,
    Award,
    Star,
    TrendingUp,
    ExternalLink
} from 'lucide-react';

/**
 * Modal to display detailed client profile and history.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - clientProfile: object { nombre, telefono, correo, ... }
 * - clientPoints: object (optional loyalty points)
 * - relatedOrders: array of order objects
 */
export default function ClientProfileModal({ isOpen, onClose, clientProfile, clientPoints, relatedOrders }) {
    if (!isOpen || !clientProfile) return null;

    const { nombre, telefono, correo, direccion, totalOrders, totalSpent, deliveredOrders, coupons, clienteDb } = clientProfile;

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Helper for dates
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-CR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-start shrink-0">
                        <div className="flex items-center gap-4 text-white">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                                {nombre?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{nombre}</h2>
                                <div className="flex items-center gap-2 text-blue-100 text-sm mt-1">
                                    {clienteDb ? (
                                        <span className="bg-green-400/20 text-green-100 px-2 py-0.5 rounded-full border border-green-400/30 flex items-center gap-1">
                                            <User size={12} /> Cliente Registrado
                                        </span>
                                    ) : (
                                        <span className="bg-white/10 px-2 py-0.5 rounded-full">Invitado</span>
                                    )}
                                    {totalOrders > 5 && (
                                        <span className="bg-amber-400/20 text-amber-100 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                                            <Star size={12} /> Frecuente
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Left Column: Info & Stats */}
                            <div className="space-y-6">
                                {/* Contact Info */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Contacto</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Phone size={16} />
                                            </div>
                                            <span className="font-medium">{telefono || 'Sin teléfono'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                                <Mail size={16} />
                                            </div>
                                            <span className="text-sm truncate" title={correo}>{correo || 'Sin correo'}</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-gray-700">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                                <MapPin size={16} />
                                            </div>
                                            <span className="text-sm">{direccion || 'Sin dirección registrada'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Lifetime Stats */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Estadísticas</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="text-xs text-gray-500 mb-1">Pedidos Totales</div>
                                            <div className="text-xl font-bold text-gray-900">{totalOrders}</div>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                            <div className="text-xs text-green-600 mb-1">Entregados</div>
                                            <div className="text-xl font-bold text-green-700">{deliveredOrders}</div>
                                        </div>
                                        <div className="col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp size={14} className="text-blue-600" />
                                                <div className="text-xs text-blue-600 font-medium">Inversión Total</div>
                                            </div>
                                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalSpent)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Loyalty Points (If any) */}
                                {clientPoints && (
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100">
                                        <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Award size={16} /> Puntos de Lealtad
                                        </h3>
                                        <div className="text-3xl font-bold text-amber-600 mb-1">
                                            {clientPoints.puntos_actuales || 0} pts
                                        </div>
                                        <div className="text-xs text-amber-600/80">
                                            Nivel: {clientPoints.nivel || 'Bronce'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Order History */}
                            <div className="md:col-span-2 space-y-6">
                                {/* Coupons Used */}
                                {coupons && coupons.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cupones Usados</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {coupons.map((c, i) => (
                                                <span key={i} className="px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-xs font-medium border border-pink-100">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Orders List */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <ShoppingBag size={18} className="text-gray-400" />
                                            Historial de Pedidos
                                        </h3>
                                        <span className="text-xs text-gray-500">{relatedOrders.length} registros found</span>
                                    </div>

                                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                                        {relatedOrders.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                No hay historial de pedidos disponible.
                                            </div>
                                        ) : (
                                            relatedOrders
                                                .sort((a, b) => {
                                                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                                                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                                                    return dateB - dateA;
                                                })
                                                .map((order) => {
                                                    const statusColors = {
                                                        pending: 'bg-yellow-100 text-yellow-700',
                                                        confirmed: 'bg-blue-100 text-blue-700',
                                                        delivered: 'bg-green-100 text-green-700',
                                                        cancelled: 'bg-red-100 text-red-700',
                                                        in_transit: 'bg-purple-100 text-purple-700'
                                                    };

                                                    return (
                                                        <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-semibold text-gray-800 text-sm">
                                                                        #{order.displayId || 'ID'}
                                                                        <span className="text-gray-400 font-normal ml-2">
                                                                            {formatDate(order.createdAt)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        Entrega: {order.fecha_entrega || order.details?.fechaEntrega || 'Pendiente'}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-gray-900 text-sm">
                                                                        {formatCurrency(order.totalValue || order.total || 0)}
                                                                    </div>
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                                        {order.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {/* Order Items Preview */}
                                                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 mt-2">
                                                                {(order.items || order.details?.cart || [])
                                                                    .map(i => `${i.name || 'Item'} (x${i.quantity || 1})`)
                                                                    .join(', ') || 'Detalles no disponibles'}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
