import React, { useState } from 'react';
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    Calendar,
    Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrders } from '../../context/OrdersContext';

export default function DashboardView() {
    const { orders, getStats } = useOrders();
    const stats = getStats();
    const [timeRange, setTimeRange] = useState('week');

    // Mock data - En producción vendría de Firebase
    const salesData = {
        today: 145000,
        week: 890000,
        month: 3450000,
        growth: 12.5
    };

    const topProducts = [
        { name: 'Pack Regular', sales: 45, revenue: 1890000 },
        { name: 'Pack Keto', sales: 38, revenue: 1672000 },
        { name: 'Pack Vegetariano', sales: 32, revenue: 1344000 },
        { name: 'Pack Sin Carbos', sales: 28, revenue: 1176000 }
    ];

    const lowStockItems = [
        { name: 'Pollo Orgánico', current: 5, min: 20, unit: 'kg', status: 'critical' },
        { name: 'Quinoa Tricolor', current: 12, min: 15, unit: 'kg', status: 'warning' },
        { name: 'Brócoli Fresco', current: 8, min: 10, unit: 'kg', status: 'warning' },
        { name: 'Salmón del Atlántico', current: 3, min: 8, unit: 'kg', status: 'critical' }
    ];

    const recentOrders = orders.slice(0, 5);

    const StatCard = ({ icon: Icon, label, value, change, color = 'blue' }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${color}-50`}>
                    <Icon className={`text-${color}-600`} size={24} />
                </div>
                {change && (
                    <div className={`flex items-center gap-1 text-xs font-bold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
        </motion.div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Resumen general de operaciones</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                        <option value="today">Hoy</option>
                        <option value="week">Esta Semana</option>
                        <option value="month">Este Mes</option>
                    </select>
                    <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2">
                        <Download size={16} />
                        <span className="hidden sm:inline">Exportar</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard
                    icon={DollarSign}
                    label="Ventas Totales"
                    value={`₡${stats.totalSales.toLocaleString('es-CR')}`}
                    change={salesData.growth}
                    color="green"
                />
                <StatCard
                    icon={ShoppingCart}
                    label="Pedidos Activos"
                    value={stats.activeOrders}
                    change={8.2}
                    color="blue"
                />
                <StatCard
                    icon={Users}
                    label="Clientes Nuevos"
                    value="24"
                    change={15.3}
                    color="purple"
                />
                <StatCard
                    icon={Package}
                    label="En Producción"
                    value={orders.filter(o => o.status === 'kitchen').length}
                    color="orange"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Products */}
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Productos Más Vendidos</h2>
                        <TrendingUp className="text-orange-500" size={20} />
                    </div>
                    <div className="space-y-4">
                        {topProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                                        <p className="text-xs text-gray-500">{product.sales} ventas</p>
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <div className="font-bold text-gray-900">₡{product.revenue.toLocaleString('es-CR')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Stock Bajo</h2>
                        <AlertTriangle className="text-orange-500" size={20} />
                    </div>
                    <div className="space-y-3">
                        {lowStockItems.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border-l-4 ${item.status === 'critical'
                                    ? 'bg-red-50 border-red-500'
                                    : 'bg-yellow-50 border-yellow-500'
                                }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-sm text-gray-900">{item.name}</h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.status === 'critical'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {item.status === 'critical' ? 'Crítico' : 'Bajo'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>Actual: {item.current}{item.unit}</span>
                                    <span>Mín: {item.min}{item.unit}</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.status === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                        style={{ width: `${(item.current / item.min) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                        Ver Inventario Completo
                    </button>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Pedidos Recientes</h2>
                    <Calendar className="text-gray-400" size={20} />
                </div>
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ID</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order) => (
                                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 text-sm font-mono text-gray-600">{order.displayId}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.client}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600">{order.plan}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                                                order.status === 'kitchen' ? 'bg-blue-100 text-blue-700' :
                                                    order.status === 'packaging' ? 'bg-purple-100 text-purple-700' :
                                                        order.status === 'delivery' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-green-100 text-green-700'
                                            }`}>
                                            {order.status === 'new' ? 'Nuevo' :
                                                order.status === 'kitchen' ? 'Cocina' :
                                                    order.status === 'packaging' ? 'Empaque' :
                                                        order.status === 'delivery' ? 'En Ruta' :
                                                            'Entregado'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">{order.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
