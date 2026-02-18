import React, { useState, useEffect } from 'react';
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
    Truck,
    RefreshCw,
    Clock,
    Trash2,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, getDocs, where, orderBy, limit, writeBatch, doc, getCountFromServer } from 'firebase/firestore';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminCard from '../../components/admin/AdminCard';
import { cachedFetch, invalidateCache } from '../../utils/firestoreCache';
import { useOrders } from '../../context/OrdersContext';


/**
 * DashboardView - Panel de Control Principal
 * Conectado a Firebase para mostrar estadísticas reales
 */
export default function DashboardView() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPedidos: 0,
        pedidosHoy: 0,
        pedidosPendientes: 0,
        pedidosConfirmados: 0,
        pedidosEnRuta: 0,
        pedidosEntregados: 0,
        totalClientes: 0,
        totalVentas: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    const { orders: contextOrders, loading: contextLoading } = useOrders();
    // Cache de pedidos históricos (para totales y estadísticas globales)
    const [historicalOrders, setHistoricalOrders] = useState([]);

    // Cargar datos históricos desde Firebase (con caché)
    useEffect(() => {
        loadHistoricalData();
        // Inicializar menús por defecto si no existen (Fix para error "No hay menús configurados")
        import('../../utils/firestoreMenus').then(({ ensureDesayunosExist }) => {
            ensureDesayunosExist().catch(err => console.error('Error initializing menus:', err));
        });
    }, []);

    // Recalcular estadísticas cuando cambia el contexto o los datos históricos
    useEffect(() => {
        if (contextLoading && historicalOrders.length === 0) return;

        calculateStats();
    }, [contextOrders, historicalOrders, contextLoading]);

    const loadHistoricalData = async (force = false) => {
        if (force) {
            setLoading(true);
            invalidateCache('dashboard_pedidos');
            invalidateCache('dashboard_clientes_count');
            invalidateCache('dashboard_inventario');
        }

        try {
            // Cargar pedidos históricos (cache 10 min)
            const pedidos = await cachedFetch('dashboard_pedidos', async () => {
                const snap = await getDocs(collection(db, 'pedidos'));
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }, 'dashboard');
            setHistoricalOrders(pedidos || []);

            // Cargar clientes (cache 10 min)
            const totalClientes = await cachedFetch('dashboard_clientes_count', async () => {
                try {
                    const q = query(collection(db, 'clientes'));
                    const agg = await getCountFromServer(q);
                    return (agg?.data?.().count) ?? 0;
                } catch (e) {
                    const snap = await getDocs(collection(db, 'clientes'));
                    return snap.size;
                }
            }, 'dashboard');

            // Cargar inventario (cache 10 min)
            const inventarioRaw = await cachedFetch('dashboard_inventario', async () => {
                const snap = await getDocs(collection(db, 'inventario'));
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }, 'dashboard');

            const inventario = (inventarioRaw || []).map((item) => {
                const data = item;
                let status = 'good';
                if (data.stock <= data.min * 0.25) status = 'critical';
                else if (data.stock <= data.min) status = 'warning';
                return { ...data, status };
            });
            const stockBajo = inventario.filter(i => i.status === 'critical' || i.status === 'warning').slice(0, 4);

            // Actualizar estados que dependen puramente de histórico/inventario
            setStats(prev => ({ ...prev, totalClientes }));
            setLowStockItems(stockBajo);

        } catch (error) {
            console.error('Error loading historical:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Métricas Operativas (Usar Contexto - Tiempo Real)
        // Usamos contextOrders para lo que requiere inmediatez (estados activos)
        // Nota: contextOrders tiene un límite (ej. 100), pero suficiente para operaciones diarias
        const liveOrders = contextOrders || [];

        const pedidosHoy = liveOrders.filter(p => {
            let pDate;
            try {
                pDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
                // Validar si la fecha es válida
                if (isNaN(pDate.getTime())) return false;
            } catch (e) {
                return false;
            }
            return pDate.toISOString().split('T')[0] === today || p.fecha_entrega === today;
        }).length;

        const pedidosPendientes = liveOrders.filter(p =>
            p.status === 'pending' || p.status === 'new' || p.status === 'pending_payment'
        ).length;

        const pedidosConfirmados = liveOrders.filter(p => p.status === 'confirmed').length;
        const pedidosEnRuta = liveOrders.filter(p => p.status === 'in_transit' || p.deliveryStatus === 'in_transit').length;

        // Pedidos recientes (siempre del contexto para ver cambios al instante)
        const recent = [...liveOrders]
            .sort((a, b) => {
                const getDate = (d) => {
                    try {
                        if (!d) return 0;
                        const date = d.toDate ? d.toDate() : new Date(d);
                        return isNaN(date.getTime()) ? 0 : date.getTime();
                    } catch { return 0; }
                };
                return getDate(b.createdAt) - getDate(a.createdAt);
            })
            .slice(0, 5);

        // 2. Métricas Históricas (Usar Historical - Caché)
        // Para totales acumulados, usamos la carga completa
        const allOrders = historicalOrders.length > 0 ? historicalOrders : liveOrders;

        const totalPedidos = allOrders.length;
        const pedidosEntregados = allOrders.filter(p => p.status === 'delivered' || p.deliveryStatus === 'delivered').length;

        // Calcular ventas totales (Historical)
        const totalVentas = allOrders
            .filter(p => ['confirmed', 'delivered'].includes(p.status) || p.deliveryStatus === 'delivered')
            .reduce((acc, p) => {
                let precio = 0;
                if (typeof p.total === 'number') precio = p.total;
                else if (typeof p.total === 'string') precio = parseInt(p.total.replace(/\D/g, '')) || 0;
                return acc + precio;
            }, 0);

        // Top Productos (Historical)
        const planCounts = {};
        allOrders.forEach(p => {
            const plan = p.plan || 'Sin Plan';
            planCounts[plan] = (planCounts[plan] || 0) + 1;
        });
        const topProductsList = Object.entries(planCounts)
            .map(([name, sales]) => ({ name, sales, revenue: sales * 25000 })) // Estimado
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 4);

        setStats(prev => ({
            ...prev,
            totalPedidos,
            pedidosHoy,
            pedidosPendientes,
            pedidosConfirmados,
            pedidosEnRuta,
            pedidosEntregados, // Histórico
            totalVentas // Histórico
        }));
        setRecentOrders(recent);
        setTopProducts(topProductsList);
    };

    const refreshData = () => {
        loadHistoricalData(true);
    };

    const StatCard = ({ icon: Icon, label, value, change, color = 'blue', delay = 0 }) => {
        const gradients = {
            green: 'from-green-400 to-emerald-500',
            blue: 'from-blue-400 to-cyan-500',
            purple: 'from-purple-400 to-pink-500',
            orange: 'from-orange-400 to-red-500'
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay }}
                className="bg-gradient-to-br from-white via-orange-50/20 to-white rounded-3xl p-6 shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradients[color]} shadow-lg`}>
                        <Icon className="text-white" size={24} />
                    </div>
                    {change && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: delay + 0.2 }}
                            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                            {change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(change)}%
                        </motion.div>
                    )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
                <div className="text-sm text-gray-600 font-medium">{label}</div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw size={32} className="animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20 md:pb-0">
            {/* Header */}
            <AdminPageHeader
                icon={BarChart3}
                title="Dashboard"
                subtitle="Resumen general de operaciones y estadísticas en tiempo real"
                stats={[
                    { value: stats.totalPedidos, label: 'Pedidos' },
                    { value: stats.totalClientes, label: 'Clientes' },
                    { value: `₡${(stats.totalVentas / 1000).toFixed(0)}K`, label: 'Ventas' }
                ]}
                actions={[
                    <button
                        key="refresh"
                        onClick={refreshData}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors w-full md:w-auto justify-center"
                    >
                        <RefreshCw size={16} />
                        Actualizar (Histórico)
                    </button>
                ]}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    icon={DollarSign}
                    label="Ventas Totales"
                    value={`₡${stats.totalVentas.toLocaleString('es-CR')}`}
                    color="green"
                    delay={0.1}
                />
                <StatCard
                    icon={ShoppingCart}
                    label="Total Pedidos"
                    value={stats.totalPedidos}
                    color="blue"
                    delay={0.2}
                />
                <StatCard
                    icon={Users}
                    label="Total Clientes"
                    value={stats.totalClientes}
                    color="purple"
                    delay={0.3}
                />
                <StatCard
                    icon={Truck}
                    label="Entregas Hoy"
                    value={stats.pedidosHoy}
                    color="orange"
                    delay={0.4}
                />
            </div>

            {/* Estados de Pedidos */}
            <AdminCard
                title="Estado de Pedidos"
                icon={Package}
                gradient={true}
                delay={0.5}
            >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-yellow-50 rounded-xl p-3 md:p-4 border border-yellow-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                            <Clock className="text-yellow-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-yellow-700">{stats.pedidosPendientes}</div>
                            <div className="text-xs text-yellow-600 font-medium">Pendientes</div>
                        </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-blue-700">{stats.pedidosConfirmados}</div>
                            <div className="text-xs text-blue-600 font-medium">Confirmados</div>
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 md:p-4 border border-purple-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                            <Truck className="text-purple-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-purple-700">{stats.pedidosEnRuta}</div>
                            <div className="text-xs text-purple-600 font-medium">En Ruta</div>
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 md:p-4 border border-green-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                            <ArrowUp className="text-green-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-green-700">{stats.pedidosEntregados}</div>
                            <div className="text-xs text-green-600 font-medium">Entregados</div>
                        </div>
                    </div>
                </div>
            </AdminCard>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Top Products */}
                <AdminCard
                    className="lg:col-span-2"
                    title="Planes Más Vendidos"
                    icon={TrendingUp}
                    delay={0.6}
                >
                    {topProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin datos de ventas aún</p>
                        </div>
                    ) : (
                        <div className="space-y-3 md:space-y-4">
                            {topProducts.map((product, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-sm md:text-base">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{product.name}</h3>
                                            <p className="text-xs text-gray-500">{product.sales} pedidos</p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-2 md:ml-4">
                                        <div className="font-bold text-gray-900 text-sm md:text-base">₡{product.revenue.toLocaleString('es-CR')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </AdminCard>

                {/* Low Stock Alert */}
                <AdminCard
                    title="Stock Bajo"
                    icon={AlertTriangle}
                    delay={0.7}
                >
                    {lowStockItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Package size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin alertas de stock</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lowStockItems.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border-l-4 ${item.status === 'critical'
                                    ? 'bg-red-50 border-red-500'
                                    : 'bg-yellow-50 border-yellow-500'
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-sm text-gray-900 truncate pr-2">{item.name}</h3>
                                        <span className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${item.status === 'critical'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item.status === 'critical' ? 'Crítico' : 'Bajo'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>Actual: {item.stock} {item.unit}</span>
                                        <span>Mín: {item.min} {item.unit}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.status === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                            style={{ width: `${Math.min((item.stock / item.min) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link
                        to="/admin/inventory"
                        className="block w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors text-center active:bg-gray-300"
                    >
                        Ver Inventario Completo
                    </Link>
                </AdminCard>
            </div>

            {/* Recent Orders */}
            <AdminCard
                title="Pedidos Recientes"
                icon={ShoppingCart}
                delay={0.8}
            >
                <div className="flex items-center justify-end mb-4">
                    <Link to="/admin/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium p-2 -mr-2">
                        Ver todos →
                    </Link>
                </div>
                {recentOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay pedidos recientes</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Entrega</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order) => {
                                        const status = order.deliveryStatus || 'pending';
                                        return (
                                            <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.cliente || 'Sin nombre'}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600">{order.plan || '-'}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600">{order.fecha_entrega || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                                                            status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {status === 'pending' ? 'Pendiente' :
                                                            status === 'in_transit' ? 'En Ruta' :
                                                                status === 'delivered' ? 'Entregado' : status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {recentOrders.map((order) => {
                                const status = order.deliveryStatus || 'pending';
                                return (
                                    <div key={order.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-gray-900">{order.cliente || 'Sin nombre'}</div>
                                                <div className="text-xs text-gray-500">{order.plan || '-'}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                                                    status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {status === 'pending' ? 'Pendiente' :
                                                    status === 'in_transit' ? 'En Ruta' :
                                                        status === 'delivered' ? 'Entregado' : status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200/50 mt-1">
                                            <Truck size={12} />
                                            <span>Entrega: {order.fecha_entrega || 'Por definir'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </AdminCard>
        </div>
    );
}
