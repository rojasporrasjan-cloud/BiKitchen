import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, Clock, MapPin, User, Phone } from 'lucide-react';

/**
 * Calendario de entregas para el admin
 */
export default function DeliveryCalendar({ orders = [], onSelectOrder }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState('month'); // 'month' | 'week' | 'day'

    // Obtener días del mes
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const days = [];

        // Días del mes anterior
        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isCurrentMonth: false });
        }

        // Días del mes actual
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({ date, isCurrentMonth: true });
        }

        // Días del mes siguiente
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isCurrentMonth: false });
        }

        return days;
    }, [currentDate]);

    // Agrupar pedidos por fecha
    const ordersByDate = useMemo(() => {
        const grouped = {};
        orders.forEach(order => {
            const dateKey = order.fechaEntrega || order.createdAt?.toDate?.()?.toDateString();
            if (dateKey) {
                const key = new Date(dateKey).toDateString();
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(order);
            }
        });
        return grouped;
    }, [orders]);

    // Pedidos del día seleccionado
    const selectedDayOrders = useMemo(() => {
        return ordersByDate[selectedDate.toDateString()] || [];
    }, [ordersByDate, selectedDate]);

    const navigateMonth = (direction) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const isToday = (date) => date.toDateString() === new Date().toDateString();
    const isSelected = (date) => date.toDateString() === selectedDate.toDateString();

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="text-lg font-semibold min-w-[180px] text-center">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    
                    <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                        {['month', 'week', 'day'].map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                    view === v ? 'bg-white shadow-sm' : 'hover:bg-gray-100'
                                }`}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Calendario */}
                <div className="flex-1 p-4">
                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Días */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map(({ date, isCurrentMonth }, index) => {
                            const dateOrders = ordersByDate[date.toDateString()] || [];
                            const hasOrders = dateOrders.length > 0;
                            
                            return (
                                <motion.button
                                    key={index}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedDate(date)}
                                    className={`
                                        relative aspect-square p-1 rounded-xl transition-colors
                                        ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                        ${isToday(date) ? 'bg-bikitchen-orange/10 text-bikitchen-orange font-bold' : ''}
                                        ${isSelected(date) ? 'bg-bikitchen-orange text-white' : 'hover:bg-gray-100'}
                                    `}
                                >
                                    <span className="text-sm">{date.getDate()}</span>
                                    
                                    {/* Indicador de pedidos */}
                                    {hasOrders && (
                                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                            {dateOrders.slice(0, 3).map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        isSelected(date) ? 'bg-white' : 'bg-bikitchen-orange'
                                                    }`}
                                                />
                                            ))}
                                            {dateOrders.length > 3 && (
                                                <span className={`text-[8px] ${isSelected(date) ? 'text-white' : 'text-bikitchen-orange'}`}>
                                                    +{dateOrders.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Panel lateral - Pedidos del día */}
                <div className="w-80 border-l bg-gray-50 p-4">
                    <h3 className="font-semibold mb-3">
                        {selectedDate.toLocaleDateString('es-CR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                        })}
                    </h3>

                    {selectedDayOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Package size={32} className="mx-auto mb-2 opacity-50" />
                            <p>Sin entregas programadas</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {selectedDayOrders.map((order, index) => (
                                <DeliveryCard 
                                    key={order.id || index} 
                                    order={order} 
                                    onClick={() => onSelectOrder?.(order)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Resumen */}
                    {selectedDayOrders.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total entregas:</span>
                                <span className="font-semibold">{selectedDayOrders.length}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-500">Valor total:</span>
                                <span className="font-semibold text-bikitchen-orange">
                                    ₡{selectedDayOrders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Tarjeta de entrega individual
 */
function DeliveryCard({ order, onClick }) {
    const statusColors = {
        pendiente: 'bg-yellow-100 text-yellow-700',
        confirmado: 'bg-blue-100 text-blue-700',
        preparando: 'bg-purple-100 text-purple-700',
        'en-camino': 'bg-orange-100 text-orange-700',
        entregado: 'bg-green-100 text-green-700',
        cancelado: 'bg-red-100 text-red-700'
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="w-full bg-white rounded-xl p-3 shadow-sm border text-left hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">#{order.orderNumber || order.id?.slice(-6)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.estado] || statusColors.pendiente}`}>
                    {order.estado || 'Pendiente'}
                </span>
            </div>
            
            <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                    <User size={12} />
                    <span className="truncate">{order.cliente?.nombre || 'Cliente'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    <span className="truncate">{order.direccion?.canton || order.cliente?.direccion || 'Sin dirección'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{order.horaEntrega || '10:00 - 14:00'}</span>
                </div>
            </div>

            <div className="mt-2 pt-2 border-t flex justify-between items-center">
                <span className="text-xs text-gray-400">{order.items?.length || 0} items</span>
                <span className="font-semibold text-bikitchen-orange">₡{order.total?.toLocaleString()}</span>
            </div>
        </motion.button>
    );
}

/**
 * Vista compacta del calendario (widget)
 */
export function CalendarWidget({ orders = [], onViewAll }) {
    const today = new Date();
    const todayOrders = orders.filter(o => {
        const orderDate = o.fechaEntrega || o.createdAt?.toDate?.();
        return orderDate && new Date(orderDate).toDateString() === today.toDateString();
    });

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Entregas de Hoy</h3>
                <span className="text-2xl font-bold text-bikitchen-orange">{todayOrders.length}</span>
            </div>

            {todayOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin entregas hoy</p>
            ) : (
                <div className="space-y-2">
                    {todayOrders.slice(0, 3).map((order, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 truncate">{order.cliente?.nombre}</span>
                            <span className="text-gray-400">{order.horaEntrega || '10-14h'}</span>
                        </div>
                    ))}
                    {todayOrders.length > 3 && (
                        <p className="text-xs text-gray-400 text-center">
                            +{todayOrders.length - 3} más
                        </p>
                    )}
                </div>
            )}

            {onViewAll && (
                <button
                    onClick={onViewAll}
                    className="w-full mt-3 text-sm text-bikitchen-orange hover:text-orange-600 font-medium"
                >
                    Ver calendario completo →
                </button>
            )}
        </div>
    );
}
