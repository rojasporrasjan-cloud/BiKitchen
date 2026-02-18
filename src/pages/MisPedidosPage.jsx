import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import BackButton from '../components/BackButton';
import useOrderHistory from '../hooks/useOrderHistory';
import { 
    Package, Clock, CheckCircle, Truck, XCircle, ChevronDown,
    ShoppingBag, Calendar, MapPin, CreditCard, ArrowRight,
    Receipt, TrendingUp, Utensils, RefreshCw, Eye, X
} from 'lucide-react';

const STATUS_CONFIG = {
    pending: { 
        label: 'Pendiente', 
        color: 'bg-yellow-100 text-yellow-700',
        icon: Clock,
        description: 'Tu pedido está siendo procesado'
    },
    confirmed: { 
        label: 'Confirmado', 
        color: 'bg-blue-100 text-blue-700',
        icon: CheckCircle,
        description: 'Pedido confirmado, pronto comenzaremos a prepararlo'
    },
    preparing: { 
        label: 'En Preparación', 
        color: 'bg-orange-100 text-orange-700',
        icon: Package,
        description: 'Estamos preparando tus comidas'
    },
    delivered: { 
        label: 'Entregado', 
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        description: '¡Pedido entregado! Esperamos que lo disfrutes'
    },
    cancelled: { 
        label: 'Cancelado', 
        color: 'bg-red-100 text-red-700',
        icon: XCircle,
        description: 'Este pedido fue cancelado'
    }
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatPrice = (price) => `₡${(price || 0).toLocaleString('es-CR')}`;

// Componente de detalle del pedido
function OrderDetail({ order, onClose }) {
    const { getOrderInquiryUrl } = useWhatsApp();
    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const StatusIcon = status.icon;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-bikitchen-orange to-orange-500 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{order.orderNumber}</h2>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
                            <X size={24} />
                        </button>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${status.color}`}>
                        <StatusIcon size={16} />
                        {status.label}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Items */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <ShoppingBag size={18} />
                            Productos
                        </h3>
                        <div className="space-y-2">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {item.quantity}× {item.name}
                                        </p>
                                    </div>
                                    <span className="text-gray-600">
                                        {formatPrice(item.price * item.quantity)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        {order.discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento {order.coupon && `(${order.coupon})`}</span>
                                <span>-{formatPrice(order.discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span className="text-bikitchen-orange">{formatPrice(order.total)}</span>
                        </div>
                    </div>

                    {/* Delivery Info */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Truck size={18} />
                            Entrega
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-gray-400 mt-0.5" />
                                <span className="text-gray-600">{order.delivery.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-gray-400" />
                                <span className="text-gray-600">
                                    {order.delivery.date} • {order.delivery.time === 'mañana' ? '8am-12pm' : '12pm-6pm'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CreditCard size={18} />
                            Pago
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                            {order.paymentMethod === 'whatsapp' ? 'Coordinado por WhatsApp' : 
                             order.paymentMethod === 'sinpe' ? 'SINPE Móvil' : 
                             'Transferencia bancaria'}
                        </p>
                    </div>

                    {/* Date */}
                    <div className="text-center text-sm text-gray-400">
                        Pedido realizado el {formatDate(order.createdAt)}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4">
                    <a
                        href={getOrderInquiryUrl(order.orderNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                        Consultar por WhatsApp
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Card de pedido
function OrderCard({ order, onClick }) {
    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const StatusIcon = status.icon;
    const itemCount = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={onClick}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                        <p className="text-xs text-gray-500">
                            {formatDate(order.createdAt)}
                        </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon size={14} />
                        {status.label}
                    </div>
                </div>

                {/* Items preview */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, index) => (
                            <div 
                                key={index}
                                className="w-8 h-8 rounded-lg bg-bikitchen-orange/10 flex items-center justify-center text-xs border-2 border-white"
                            >
                                🍽️
                            </div>
                        ))}
                        {order.items.length > 3 && (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium border-2 border-white">
                                +{order.items.length - 3}
                            </div>
                        )}
                    </div>
                    <span className="text-sm text-gray-600">
                        {itemCount} {itemCount === 1 ? 'comida' : 'comidas'}
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="font-bold text-bikitchen-orange">
                        {formatPrice(order.total)}
                    </span>
                    <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-bikitchen-orange transition-colors">
                        Ver detalle
                        <Eye size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default function MisPedidosPage() {
    const { orders, getStats, hasOrders } = useOrderHistory();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filter, setFilter] = useState('all');

    const stats = getStats();

    const filteredOrders = filter === 'all' 
        ? orders 
        : orders.filter(order => order.status === filter);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero */}
                <section className="relative pt-32 pb-12 overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500">
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>
                    
                    <div className="container relative z-10">
                        <BackButton className="mb-6" />

                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full text-base font-bold mb-6 border border-white/30 shadow-xl"
                            >
                                <Receipt size={18} />
                                Historial de Compras
                            </motion.div>
                            
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-2xl"
                            >
                                Mis Pedidos
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl text-white/90 font-medium"
                            >
                                Revisa el estado de tus pedidos
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Stats */}
                {hasOrders && (
                    <section className="py-8">
                        <div className="container">
                            <div className="max-w-4xl mx-auto">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <motion.div 
                                        className="bg-white rounded-3xl p-6 text-center border-2 border-orange-100 shadow-lg hover:shadow-xl transition-all"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                                            <ShoppingBag className="text-white" size={28} />
                                        </div>
                                        <p className="text-3xl font-black text-gray-900 mb-1">{stats.totalOrders}</p>
                                        <p className="text-sm text-gray-600 font-bold">Pedidos</p>
                                    </motion.div>
                                    <motion.div 
                                        className="bg-white rounded-3xl p-6 text-center border-2 border-green-100 shadow-lg hover:shadow-xl transition-all"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                            <Utensils className="text-white" size={28} />
                                        </div>
                                        <p className="text-3xl font-black text-gray-900 mb-1">{stats.totalItems}</p>
                                        <p className="text-sm text-gray-600 font-bold">Comidas</p>
                                    </motion.div>
                                    <motion.div 
                                        className="bg-white rounded-3xl p-6 text-center border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                            <TrendingUp className="text-white" size={28} />
                                        </div>
                                        <p className="text-3xl font-black text-gray-900 mb-1">{formatPrice(stats.totalSpent)}</p>
                                        <p className="text-sm text-gray-600 font-bold">Total gastado</p>
                                    </motion.div>
                                    <motion.div 
                                        className="bg-white rounded-3xl p-6 text-center border-2 border-purple-100 shadow-lg hover:shadow-xl transition-all"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                                            <Receipt className="text-white" size={28} />
                                        </div>
                                        <p className="text-3xl font-black text-gray-900 mb-1">{formatPrice(stats.averageOrder)}</p>
                                        <p className="text-sm text-gray-600 font-bold">Promedio</p>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Orders List */}
                <section className="py-8">
                    <div className="container">
                        <div className="max-w-4xl mx-auto">
                            {hasOrders ? (
                                <>
                                    {/* Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                                        {[
                                            { id: 'all', label: 'Todos' },
                                            { id: 'pending', label: 'Pendientes' },
                                            { id: 'confirmed', label: 'Confirmados' },
                                            { id: 'preparing', label: 'En preparación' },
                                            { id: 'delivered', label: 'Entregados' }
                                        ].map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => setFilter(f.id)}
                                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                                                    filter === f.id
                                                        ? 'bg-bikitchen-orange text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Orders Grid */}
                                    {filteredOrders.length > 0 ? (
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {filteredOrders.map((order) => (
                                                <OrderCard 
                                                    key={order.id} 
                                                    order={order}
                                                    onClick={() => setSelectedOrder(order)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-500">No hay pedidos con este filtro</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <Package size={64} className="mx-auto text-gray-300 mb-6" />
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        Aún no tienes pedidos
                                    </h2>
                                    <p className="text-gray-500 mb-8">
                                        Cuando hagas tu primer pedido, aparecerá aquí
                                    </p>
                                    <Link
                                        to="/packs"
                                        className="inline-flex items-center gap-2 bg-bikitchen-orange text-white px-8 py-4 rounded-xl font-bold hover:bg-bikitchen-orange-dark transition-colors"
                                    >
                                        Ver Nuestros Packs
                                        <ArrowRight size={20} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Reorder CTA */}
                {hasOrders && (
                    <section className="py-12 bg-gradient-to-r from-bikitchen-orange to-orange-500">
                        <div className="container">
                            <div className="max-w-3xl mx-auto text-center text-white">
                                <RefreshCw size={40} className="mx-auto mb-4 opacity-80" />
                                <h2 className="text-2xl font-bold mb-2">¿Te gustó tu último pedido?</h2>
                                <p className="text-white/80 mb-6">
                                    Repite tu pedido favorito con un solo clic
                                </p>
                                <Link
                                    to="/packs"
                                    className="inline-flex items-center gap-2 bg-white text-bikitchen-orange px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    Hacer Nuevo Pedido
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                <Footer />

                {/* Order Detail Modal */}
                <AnimatePresence>
                    {selectedOrder && (
                        <OrderDetail 
                            order={selectedOrder} 
                            onClose={() => setSelectedOrder(null)} 
                        />
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
