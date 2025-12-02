import React, { useState, useMemo } from 'react';
import { 
    Search, 
    Package, 
    DollarSign, 
    Calendar,
    X,
    User,
    Phone,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    FileText,
    Printer,
    Download,
    Eye,
    CreditCard,
    Truck,
    ShoppingBag,
    MessageCircle,
    History,
    ChevronDown,
    Filter,
    CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../context/OrdersContext';

// Estados de pedido simplificados
const ORDER_STATUS = {
    new: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700', icon: Truck },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

// Filtros disponibles
const FILTER_OPTIONS = [
    { id: 'all', label: 'Todos' },
    { id: 'new', label: 'Pendientes' },
    { id: 'confirmed', label: 'Confirmados' },
    { id: 'delivered', label: 'Entregados' },
    { id: 'cancelled', label: 'Cancelados' }
];

// Filtros de fecha
const DATE_FILTERS = [
    { id: 'all', label: 'Todas las fechas' },
    { id: 'today', label: 'Hoy' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' }
];

export default function OrdersView() {
    const { orders, updateOrderStatus, getStats, formatTotal, loading } = useOrders();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [dateFilter, setDateFilter] = useState('all');
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const stats = getStats();

    // Helper para verificar filtro de fecha
    const matchesDateFilter = (order) => {
        if (dateFilter === 'all') return true;
        
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
        if (!orderDate || isNaN(orderDate.getTime())) return true;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
            case 'today':
                return orderDate >= today;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return orderDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return orderDate >= monthAgo;
            default:
                return true;
        }
    };

    // Filtrar pedidos
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = 
                order.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.displayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.details?.phone?.includes(searchTerm);
            
            const matchesStatus = activeFilter === 'all' || order.status === activeFilter;
            const matchesDate = matchesDateFilter(order);
            
            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, activeFilter, dateFilter]);

    // Ordenar por fecha (más recientes primero)
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
    });

    const handleStatusChange = async (orderId, newStatus) => {
        await updateOrderStatus(orderId, newStatus);
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Sin fecha';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-CR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Exportar a CSV
    const exportToCSV = () => {
        const headers = ['ID', 'Cliente', 'Teléfono', 'Plan', 'Items', 'Total', 'Estado', 'Fecha'];
        const rows = sortedOrders.map(order => [
            order.displayId,
            order.client,
            order.details?.phone || '',
            order.plan,
            order.items,
            formatTotal(order),
            ORDER_STATUS[order.status]?.label || order.status,
            formatDate(order.createdAt)
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pedidos-bikitchen-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>
                        <p className="text-gray-500">Gestiona y visualiza todos los pedidos recibidos.</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm"
                        >
                            <Download size={16} /> Exportar CSV
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm"
                        >
                            <Printer size={16} /> Imprimir
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Ventas Totales</div>
                            <div className="text-2xl font-bold text-gray-800">₡{stats.totalSales.toLocaleString('es-CR')}</div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Total Pedidos</div>
                            <div className="text-2xl font-bold text-gray-800">{orders.length}</div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Pendientes</div>
                            <div className="text-2xl font-bold text-gray-800">
                                {orders.filter(o => o.status === 'new').length}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Hoy</div>
                            <div className="text-2xl font-bold text-gray-800">
                                {orders.filter(o => {
                                    const orderDate = o.createdAt?.toDate?.();
                                    const today = new Date();
                                    return orderDate && 
                                        orderDate.getDate() === today.getDate() &&
                                        orderDate.getMonth() === today.getMonth();
                                }).length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, ID o teléfono..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Date Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDateDropdown(!showDateDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                        >
                            <CalendarDays size={16} />
                            {DATE_FILTERS.find(f => f.id === dateFilter)?.label}
                            <ChevronDown size={16} />
                        </button>
                        
                        {showDateDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                                {DATE_FILTERS.map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => {
                                            setDateFilter(filter.id);
                                            setShowDateDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                                            dateFilter === filter.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Status Filters */}
                    <div className="flex gap-2">
                        {FILTER_OPTIONS.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeFilter === filter.id
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Productos</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-500">
                                        Cargando pedidos...
                                    </td>
                                </tr>
                            ) : sortedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-500">
                                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p>No hay pedidos que mostrar</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedOrders.map(order => {
                                    const status = ORDER_STATUS[order.status] || ORDER_STATUS.new;
                                    const StatusIcon = status.icon;
                                    
                                    return (
                                        <tr 
                                            key={order.id} 
                                            className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-gray-800">{order.displayId}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-gray-800">{order.client}</div>
                                                <div className="text-sm text-gray-500">{order.details?.phone || 'Sin teléfono'}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-sm text-gray-600">{order.plan}</div>
                                                <div className="text-xs text-gray-400">{order.items}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-orange-500">{formatTotal(order)}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    <StatusIcon size={12} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(order);
                                                    }}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-orange-500"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Detail Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedOrder(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">
                                        Pedido {selectedOrder.displayId}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(selectedOrder.createdAt)}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {/* Status & Actions */}
                                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-500">Estado:</span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${ORDER_STATUS[selectedOrder.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                                            {ORDER_STATUS[selectedOrder.status]?.label || 'Desconocido'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedOrder.status === 'new' && (
                                            <button 
                                                onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                                                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                                            >
                                                Confirmar
                                            </button>
                                        )}
                                        {selectedOrder.status === 'confirmed' && (
                                            <button 
                                                onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                                                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                Marcar Entregado
                                            </button>
                                        )}
                                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                                            <button 
                                                onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                                                className="px-4 py-2 bg-white border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Información del Cliente
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <User size={18} className="text-gray-400" />
                                            <span className="font-medium text-gray-800">{selectedOrder.client}</span>
                                        </div>
                                        {selectedOrder.details?.phone && (
                                            <div className="flex items-center gap-3">
                                                <Phone size={18} className="text-gray-400" />
                                                <span className="text-gray-600">{selectedOrder.details.phone}</span>
                                            </div>
                                        )}
                                        {selectedOrder.details?.address && (
                                            <div className="flex items-start gap-3">
                                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                                <span className="text-gray-600">{selectedOrder.details.address}</span>
                                            </div>
                                        )}
                                        {selectedOrder.details?.email && (
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-gray-400" />
                                                <span className="text-gray-600">{selectedOrder.details.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Products */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Productos del Pedido
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                                        {selectedOrder.details?.cart?.length > 0 ? (
                                            <div className="divide-y divide-gray-50">
                                                {selectedOrder.details.cart.map((item, idx) => (
                                                    <div key={idx} className="p-4 flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-800">
                                                                {item.name}
                                                            </div>
                                                            {item.planLabel && (
                                                                <div className="text-sm text-orange-500">
                                                                    {item.planLabel}
                                                                </div>
                                                            )}
                                                            {item.desc && (
                                                                <div className="text-sm text-gray-500 mt-1">
                                                                    {item.desc}
                                                                </div>
                                                            )}
                                                            {/* Especificaciones adicionales */}
                                                            {item.protein && (
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    Proteína: {item.protein}
                                                                </div>
                                                            )}
                                                            {item.extras?.length > 0 && (
                                                                <div className="text-xs text-gray-400">
                                                                    Extras: {item.extras.join(', ')}
                                                                </div>
                                                            )}
                                                            {item.notes && (
                                                                <div className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded inline-block">
                                                                    📝 {item.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-gray-800">
                                                                ₡{(item.price * item.quantity).toLocaleString('es-CR')}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                x{item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-gray-500">
                                                <p className="font-medium">{selectedOrder.plan}</p>
                                                <p className="text-sm">{selectedOrder.items}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedOrder.details?.notes && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                            Notas del Pedido
                                        </h3>
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                            <p className="text-amber-800">{selectedOrder.details.notes}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Info */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Información de Pago
                                    </h3>
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-500">Método de pago:</span>
                                            <span className="flex items-center gap-2 text-gray-800">
                                                <CreditCard size={16} />
                                                {selectedOrder.details?.paymentMethod || 'Por definir'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <span className="font-semibold text-gray-800">Total:</span>
                                            <span className="text-2xl font-bold text-orange-500">{formatTotal(selectedOrder)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Acciones Rápidas
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOrder.details?.phone && (
                                            <a
                                                href={`https://wa.me/506${selectedOrder.details.phone.replace(/\D/g, '')}?text=Hola ${selectedOrder.client}, gracias por tu pedido ${selectedOrder.displayId} en BiKitchen! 🍽️`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                <MessageCircle size={16} />
                                                WhatsApp
                                            </a>
                                        )}
                                        <button 
                                            onClick={() => {
                                                const phone = selectedOrder.details?.phone;
                                                if (phone) {
                                                    window.location.href = `tel:${phone}`;
                                                }
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            <Phone size={16} />
                                            Llamar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                                <button 
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Printer size={18} />
                                    Imprimir
                                </button>
                                <button 
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-6 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
