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
    BarChart3,
    Instagram,
    Facebook,
    Globe,
    Compass,
    Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, getDocs, where, orderBy, limit, writeBatch, doc, getCountFromServer } from 'firebase/firestore';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminCard from '../../components/admin/AdminCard';
import { cachedFetch, invalidateCache } from '../../utils/firestoreCache';
import { useOrders } from '../../context/OrdersContext';
import { parseFirebaseDate } from '../../utils/dateUtils';


/**
 * DashboardView - Panel de Control Principal
 * Conectado a Firebase para mostrar estadísticas reales
 */
export default function DashboardView() {
    const [loading, setLoading] = useState(true);
    const [totalClientes, setTotalClientes] = useState(0);
    const [lowStockItems, setLowStockItems] = useState([]);
    
    const [timeRange, setTimeRange] = useState('all'); // 'all', 'month', 'week', 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedSource, setSelectedSource] = useState('all');
    const [showAudit, setShowAudit] = useState(false);
    
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

    // No effects for calculation anymore, everything is Memoized

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
            setTotalClientes(totalClientes);
            setLowStockItems(stockBajo);

        } catch (error) {
            console.error('Error loading historical:', error);
        } finally {
            setLoading(false);
        }
    };

    const dashboardData = React.useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        // 1. Unificación de Fuentes (The Merge)
        const combinedOrdersMap = new Map();
        historicalOrders.forEach(o => { if (o.id) combinedOrdersMap.set(o.id, o); });
        (contextOrders || []).forEach(o => { if (o.id) combinedOrdersMap.set(o.id, o); });
        
        const allOrders = Array.from(combinedOrdersMap.values());

        // 2. Filtro por Canal (Marketing)
        const filterBySource = (list) => {
            if (selectedSource === 'all') return list;
            return list.filter(o => {
                const src = (o.fuente || o.source || 'Directo').toLowerCase().trim();
                const sourceMatches = {
                    'google': src.includes('google'),
                    'facebook': src.includes('facebook') || src.includes('instagram') || src.includes('meta'),
                    'tiktok': src.includes('tiktok'),
                    'directo': src === 'directo' || src === 'desconocido' || src === ''
                }[selectedSource];
                return sourceMatches ?? src.includes(selectedSource);
            });
        }
        const filteredBySource = filterBySource(allOrders);

        // 3. Filtro por Rango (Nuclear Engine)
        const filterByRange = (ordersList) => {
            if (timeRange === 'all') return ordersList;
            const nowTime = now.getTime();
            let startLimit = null;
            let endLimit = nowTime + 86400000; 

            if (timeRange === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                weekAgo.setHours(0, 0, 0, 0); 
                startLimit = weekAgo.getTime();
            } else if (timeRange === 'month') {
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                monthAgo.setHours(0, 0, 0, 0);
                startLimit = monthAgo.getTime();
            } else if (timeRange === 'custom') {
                const parseManualDate = (dateStr, isEnd) => {
                    if (!dateStr) return null;
                    if (dateStr.includes('-') && !dateStr.includes('/')) {
                        const d = new Date(dateStr + (isEnd ? 'T23:59:59' : 'T00:00:00'));
                        return isNaN(d.getTime()) ? null : d.getTime();
                    }
                    if (dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            let d, m, y;
                            const p1 = parseInt(parts[0], 10), p2 = parseInt(parts[1], 10), p3 = parseInt(parts[2], 10);
                            if (p1 <= 12 && p2 > 12) { m = p1; d = p2; y = p3; } 
                            else if (p1 > 12 && p2 <= 12) { d = p1; m = p2; y = p3; }
                            else { d = p1; m = p2; y = p3; }
                            const dateObj = new Date(y, m - 1, d);
                            if (isEnd) dateObj.setHours(23, 59, 59, 999); else dateObj.setHours(0, 0, 0, 0);
                            return dateObj.getTime();
                        }
                    }
                    const d = new Date(dateStr);
                    return isNaN(d.getTime()) ? null : d.getTime();
                };
                startLimit = parseManualDate(customStartDate, false);
                endLimit = parseManualDate(customEndDate, true) || (nowTime + 86400000);
            }
            if (startLimit === null && timeRange !== 'all') return [];

            const result = ordersList.filter(p => {
                const pDate = parseFirebaseDate(p.createdAt) || parseFirebaseDate(p.fecha_entrega) || parseFirebaseDate(p.timestamp);
                if (!pDate) return false;
                const pTime = pDate.getTime();
                return pTime >= startLimit && pTime <= endLimit;
            });
            return result;
        };

        const filteredHistorical = filterByRange(filteredBySource);

        // 4. Métricas de Operación (Hoy)
        const liveOrders = contextOrders || [];
        const dashboardStats = {
            pedidosHoy: liveOrders.filter(p => {
                const pDate = parseFirebaseDate(p.createdAt) || parseFirebaseDate(p.fecha_entrega);
                return pDate && pDate.toISOString().split('T')[0] === todayStr;
            }).length,
            pedidosPendientes: liveOrders.filter(p => ['pending', 'new', 'pending_payment'].includes(p.status)).length,
            pedidosConfirmados: liveOrders.filter(p => p.status === 'confirmed').length,
            pedidosEnRuta: liveOrders.filter(p => p.status === 'in_transit' || p.deliveryStatus === 'in_transit').length
        };

        // 5. Ventas y Reportes
        const paidStatuses = ['pending', 'pending_payment', 'confirmed', 'preparing', 'making', 'ready', 'in_transit', 'delivered', 'pagado', 'confirmado', 'entregado'];
        const filteredForRevenue = filteredHistorical.filter(p => {
            const s = (p.status || '').toLowerCase().trim();
            const ds = (p.deliveryStatus || '').toLowerCase().trim();
            return paidStatuses.includes(s) || ds === 'delivered' || ds === 'entregado';
        });

        const totalVentas = filteredForRevenue.reduce((acc, p) => {
            let precio = 0;
            if (typeof p.total === 'number') precio = p.total;
            else if (typeof p.total === 'string') precio = parseInt(p.total.split(',')[0].replace(/\D/g, '')) || 0;
            else if (p.totalValue) precio = p.totalValue;
            else if (p.subtotal) precio = Number(p.subtotal) || 0;
            return acc + precio;
        }, 0);

        // Top Productos y Fuentes
        const planCounts = {};
        const sourceCounts = {};
        filteredHistorical.forEach(p => {
            const plan = p.plan || 'Sin Plan';
            planCounts[plan] = (planCounts[plan] || 0) + 1;
            let src = (p.fuente || p.source || 'Directo').toLowerCase();
            if (src.includes('instagram')) src = 'Instagram';
            else if (src.includes('facebook')) src = 'Facebook';
            else if (src.includes('google')) src = 'Google';
            else if (src.includes('tiktok')) src = 'TikTok';
            else if (src.includes('admin')) src = 'Admin / Manual';
            else src = 'Directo';
            sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        });

        return {
            stats: { 
                ...dashboardStats, 
                totalPedidos: filteredHistorical.length, 
                totalVentas,
                pedidosEntregados: filteredHistorical.filter(p => {
                    const s = (p.status || '').toLowerCase().trim();
                    const ds = (p.deliveryStatus || '').toLowerCase().trim();
                    return s === 'delivered' || ds === 'delivered' || s === 'entregado';
                }).length
            },
            recentOrders: [...filteredBySource].sort((a, b) => {
                const dateA = parseFirebaseDate(a.createdAt) || parseFirebaseDate(a.fecha_entrega);
                const dateB = parseFirebaseDate(b.createdAt) || parseFirebaseDate(b.fecha_entrega);
                return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
            }).slice(0, 5),
            topProducts: Object.entries(planCounts).map(([name, sales]) => ({ name, sales, revenue: sales * 25000 })).sort((a, b) => b.sales - a.sales).slice(0, 4),
            topSources: Object.entries(sourceCounts).map(([name, count]) => ({
                name, count, percentage: filteredHistorical.length > 0 ? Math.round((count / filteredHistorical.length) * 100) : 0
            })).sort((a, b) => b.count - a.count),
            auditOrders: filteredForRevenue.map(p => ({
                id: p.id, numero: p.numeroOrden || p.orderNumber || 'S/N', cliente: p.cliente || 'Desconocido',
                total: p.total, status: p.status, fecha: parseFirebaseDate(p.createdAt) || parseFirebaseDate(p.fecha_entrega),
                metodo: p.metodo_pago || p.paymentMethod || '?'
            })).sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0))
        };
    }, [historicalOrders, contextOrders, timeRange, customStartDate, customEndDate, selectedSource]);

    const refreshData = () => {
        loadHistoricalData(true);
    };

    // Auditoría de Diagnóstico Silenciosa (Solo se dispara al cambiar filtros)
    React.useEffect(() => {
        if (selectedSource === 'all') return;
        
        console.group(`[DashboardAudit] Reporte para ${selectedSource} (${timeRange})`);
        console.log(`Ventas en rango: ₡${dashboardData.stats.totalVentas.toLocaleString('es-CR')}`);
        console.log(`Total pedidos: ${dashboardData.stats.totalPedidos}`);
        
        if (dashboardData.auditOrders.length > 0) {
            console.table(dashboardData.auditOrders.slice(0, 10));
        }
        console.groupEnd();
    }, [selectedSource, timeRange, dashboardData.stats.totalVentas, dashboardData.stats.totalPedidos]);

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
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
            {/* Header */}
            <AdminPageHeader
                icon={BarChart3}
                title="Dashboard"
                subtitle="Resumen general de operaciones y estadísticas en tiempo real"
                stats={[
                    { value: dashboardData.stats.totalPedidos, label: 'Pedidos' },
                    { value: totalClientes, label: 'Clientes' },
                    { value: `₡${(dashboardData.stats.totalVentas / 1000).toFixed(0)}K`, label: 'Ventas' }
                ]}
                actions={[
                    <button
                        key="refresh"
                        onClick={refreshData}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors w-full md:w-auto justify-center"
                    >
                        <RefreshCw size={16} />
                        Actualizar
                    </button>
                ]}
            />

            {/* Selector de Periodo Dedicado (Visible y No Sticky) */}
            <div className="py-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Periodo de Análisis</h3>
                            <p className="text-[10px] text-gray-500 font-medium tracking-tight">Segmentación para reportes de Google Ads</p>
                        </div>
                    </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-full sm:w-auto">
                    <button
                        onClick={() => setTimeRange('week')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${timeRange === 'week' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        SEMANA
                    </button>
                    <button
                        onClick={() => setTimeRange('month')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${timeRange === 'month' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        MES
                    </button>
                    <button
                        onClick={() => setTimeRange('all')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${timeRange === 'all' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        TODO
                    </button>
                    <button
                        onClick={() => setTimeRange('custom')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all ${timeRange === 'custom' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        PERSONALIZADO
                    </button>
                </div>
            </div>

            {/* Selector de Fechas y Filtros (Solo si es personalizado) */}
            {timeRange === 'custom' && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50/50 p-4 rounded-3xl border border-orange-100 mt-2"
                >
                    <div>
                        <label className="block text-[10px] font-black uppercase text-orange-600 mb-1 ml-1 tracking-widest">Desde</label>
                        <input 
                            type="date" 
                            value={customStartDate} 
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-orange-200 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-orange-600 mb-1 ml-1 tracking-widest">Hasta</label>
                        <input 
                            type="date" 
                            value={customEndDate} 
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-orange-200 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-orange-600 mb-1 ml-1 tracking-widest">Canal de Venta</label>
                        <select 
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-orange-200 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                            <option value="all">Todas las Fuentes</option>
                            <option value="google">Google Ads</option>
                            <option value="facebook">Facebook / Instagram</option>
                            <option value="tiktok">TikTok</option>
                            <option value="directo">Directo / Orgánico</option>
                        </select>
                    </div>
                </motion.div>
            )}
        </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    icon={DollarSign}
                    label={
                        timeRange === 'all' ? "Ventas Totales" : 
                        timeRange === 'week' ? "Ventas (Semana)" :
                        timeRange === 'month' ? "Ventas (Mes)" :
                        "Ventas (Personalizado)"
                    }
                    value={`₡${dashboardData.stats.totalVentas.toLocaleString('es-CR')}`}
                    color="green"
                    delay={0.1}
                />
                <StatCard
                    icon={ShoppingCart}
                    label={
                        timeRange === 'all' ? "Total Pedidos" : 
                        timeRange === 'week' ? "Pedidos (Semana)" :
                        timeRange === 'month' ? "Pedidos (Mes)" :
                        "Pedidos (Custom)"
                    }
                    value={dashboardData.stats.totalPedidos}
                    color="blue"
                    delay={0.2}
                />
                <StatCard
                    icon={Users}
                    label="Total Clientes"
                    value={totalClientes}
                    color="purple"
                    delay={0.3}
                />
                <StatCard
                    icon={Truck}
                    label="Entregas Hoy"
                    value={dashboardData.stats.pedidosHoy}
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
                            <div className="text-xl md:text-2xl font-bold text-yellow-700">{dashboardData.stats.pedidosPendientes}</div>
                            <div className="text-xs text-yellow-600 font-medium">Pendientes</div>
                        </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-blue-700">{dashboardData.stats.pedidosConfirmados}</div>
                            <div className="text-xs text-blue-600 font-medium">Confirmados</div>
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 md:p-4 border border-purple-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                            <Truck className="text-purple-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-purple-700">{dashboardData.stats.pedidosEnRuta}</div>
                            <div className="text-xs text-purple-600 font-medium">En Ruta</div>
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 md:p-4 border border-green-100 flex items-center md:block gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                            <ArrowUp className="text-green-600" size={20} />
                        </div>
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-green-700">{dashboardData.stats.pedidosEntregados}</div>
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
                    {dashboardData.topProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin datos de ventas aún</p>
                        </div>
                    ) : (
                        <div className="space-y-3 md:space-y-4">
                            {dashboardData.topProducts.map((product, idx) => (
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

                {/* Sales Channel Distribution */}
                <AdminCard
                    title="Canales de Venta (Origen)"
                    icon={Users}
                    delay={0.65}
                >
                    {dashboardData.topSources.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Users size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin datos de origen aún</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {dashboardData.topSources.map((source, idx) => {
                                const Icon = {
                                    'Instagram': Instagram,
                                    'Facebook': Facebook,
                                    'Google': Globe,
                                    'Directo': Compass,
                                    'TikTok': Smartphone,
                                    'Admin / Manual': Users
                                }[source.name] || Globe;

                                const brandColor = {
                                    'Instagram': 'from-purple-500 via-pink-500 to-orange-500',
                                    'Facebook': 'from-blue-600 to-blue-700',
                                    'Google': 'from-red-500 via-yellow-500 to-green-500', // Intentar emular colores Google
                                    'Directo': 'from-orange-400 to-orange-600',
                                    'TikTok': 'from-black via-gray-800 to-cyan-500',
                                    'Admin / Manual': 'from-gray-400 to-gray-600'
                                }[source.name] || 'from-gray-400 to-gray-600';

                                const iconBg = {
                                    'Instagram': 'bg-pink-100 text-pink-600',
                                    'Facebook': 'bg-blue-100 text-blue-600',
                                    'Google': 'bg-red-100 text-red-600',
                                    'Directo': 'bg-orange-100 text-orange-600',
                                    'TikTok': 'bg-gray-100 text-black',
                                    'Admin / Manual': 'bg-slate-100 text-slate-600'
                                }[source.name] || 'bg-gray-100 text-gray-600';

                                const sourceParamMap = {
                                    'Instagram': 'meta',
                                    'Facebook': 'meta',
                                    'Google': 'google',
                                    'TikTok': 'tiktok',
                                    'Admin / Manual': 'manual',
                                    'Directo': 'directo'
                                };

                                return (
                                    <Link 
                                        key={idx} 
                                        to={`/admin/orders?source=${sourceParamMap[source.name] || 'all'}&range=${timeRange}`}
                                        className="group block hover:bg-gray-50 p-2 -m-2 rounded-xl transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
                                                    <Icon size={18} />
                                                </div>
                                                <span className="font-bold text-gray-800 tracking-tight">{source.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-gray-900">{source.count}</span>
                                                <span className="text-[10px] text-gray-400 ml-1 font-bold">({source.percentage}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${source.percentage}%` }}
                                                transition={{ duration: 1, delay: 0.5 + (idx * 0.1), ease: "easeOut" }}
                                                className={`h-full rounded-full bg-gradient-to-r ${brandColor} shadow-sm shadow-black/10`}
                                            />
                                        </div>
                                    </Link>
                                );
                            })}
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
                {dashboardData.recentOrders.length === 0 ? (
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
                                    {dashboardData.recentOrders.map((order) => {
                                        const status = order.status || 'pending';
                                        const statusConfig = {
                                            pending_payment: { label: 'Pendiente Pago', color: 'bg-orange-100 text-orange-700' },
                                            pending: { label: 'Por Confirmar', color: 'bg-yellow-100 text-yellow-700' },
                                            confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
                                            preparing: { label: 'En Cocina', color: 'bg-indigo-100 text-indigo-700' },
                                            ready: { label: 'Listo', color: 'bg-purple-100 text-purple-700' },
                                            in_transit: { label: 'En Camino', color: 'bg-cyan-100 text-cyan-700' },
                                            delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700' },
                                            cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
                                        };
                                        const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

                                        return (
                                            <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.cliente || 'Sin nombre'}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600">{order.plan || '-'}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600">{order.fecha_entrega || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${config.color}`}>
                                                        {config.label}
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
                            {dashboardData.recentOrders.map((order) => {
                                const status = order.status || 'pending';
                                const statusConfig = {
                                    pending_payment: { label: 'Pago Pendiente', color: 'bg-orange-100 text-orange-700' },
                                    pending: { label: 'Por Confirmar', color: 'bg-yellow-100 text-yellow-700' },
                                    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
                                    preparing: { label: 'En Cocina', color: 'bg-indigo-100 text-indigo-700' },
                                    ready: { label: 'Listo', color: 'bg-purple-100 text-purple-700' },
                                    in_transit: { label: 'En Camino', color: 'bg-cyan-100 text-cyan-700' },
                                    delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700' },
                                    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
                                };
                                const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

                                return (
                                    <div key={order.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-gray-900">{order.cliente || 'Sin nombre'}</div>
                                                <div className="text-xs text-gray-500">{order.plan || '-'}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${config.color}`}>
                                                {config.label}
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

            {/* Audit Breakdown (Auditoría Solicitada por Usuario) */}
            <AdminCard
                title={`Desglose de Auditoría (${dashboardData.auditOrders.length} pedidos)`}
                icon={TrendingUp}
                delay={0.9}
            >
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs text-gray-500 font-medium">
                        Estos son los pedidos que suman el total de <span className="font-bold text-gray-900 border-b-2 border-green-500">₡{dashboardData.stats.totalVentas.toLocaleString('es-CR')}</span>
                    </p>
                    <button 
                        onClick={() => setShowAudit(!showAudit)}
                        className="text-xs font-black text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                        {showAudit ? 'OCULTAR DETALLE' : 'VER DESGLOSE COMPLETO'}
                    </button>
                </div>

                {showAudit && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="overflow-x-auto"
                    >
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-3 px-2 text-[10px] font-black uppercase text-gray-400">Fecha</th>
                                    <th className="py-3 px-2 text-[10px] font-black uppercase text-gray-400">Orden</th>
                                    <th className="py-3 px-2 text-[10px] font-black uppercase text-gray-400">Cliente</th>
                                    <th className="py-3 px-2 text-[10px] font-black uppercase text-gray-400">Monto</th>
                                    <th className="py-3 px-2 text-[10px] font-black uppercase text-gray-400">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.auditOrders.map((order, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                                        <td className="py-3 px-2 text-xs text-gray-600">{order.fecha?.toLocaleDateString('es-CR')}</td>
                                        <td className="py-3 px-2 text-xs font-bold text-gray-900">{order.numero}</td>
                                        <td className="py-3 px-2 text-xs text-gray-700">{order.cliente}</td>
                                        <td className="py-3 px-2 text-xs font-black text-green-700">₡{(typeof order.total === 'number' ? order.total : parseInt(order.total?.replace(/\D/g, '') || 0)).toLocaleString('es-CR')}</td>
                                        <td className="py-3 px-2">
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600">
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AdminCard>
        </div>
    );
}
