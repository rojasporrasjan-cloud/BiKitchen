import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    MousePointer2,
    Target,
    Download,
    Calendar,
    ArrowRight,
    Search,
    PieChart,
    ExternalLink,
    Filter,
    RefreshCw,
    AlertCircle,
    Users,
    ShoppingCart,
    Globe,
    Lock,
    Unlock,
    Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminCard from '../../components/admin/AdminCard';
import { useOrders } from '../../context/OrdersContext';
import { parseFirebaseDate } from '../../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * ReportsView - Generador de Reportes de Marketing (Google Ads)
 * Cruza datos de inversión externa con ventas reales de Firestore
 */
export default function ReportsView() {
    const { orders, loading } = useOrders();
    const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month' | 'all'
    
    // Seguridad
    const [isLocked, setIsLocked] = useState(true);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const ADMIN_PASSWORD = 'bkadmin2024'; // Contraseña por defecto solicitada

    const handleUnlock = (e) => {
        if (e) e.preventDefault();
        if (password.toLowerCase() === ADMIN_PASSWORD) {
            setIsLocked(false);
            setError(false);
        } else {
            setError(true);
            setPassword('');
        }
    };
    
    // Inputs de Google Ads (Manuales por ahora según solicitud del usuario)
    const [adsData, setAdsData] = useState({
        investment: '',
        currency: 'CRC', // 'CRC' | 'USD'
        exchangeRate: '515',
        clicks: '',
        impressions: ''
    });

    // Cálculos de Ventas desde Firestore
    const salesStats = useMemo(() => {
        if (!orders || orders.length === 0) return { totalVentas: 0, count: 0, googleVentas: 0, googleCount: 0 };

        const now = new Date();
        const cutoffDate = new Date();
        if (timeRange === 'week') cutoffDate.setDate(now.getDate() - 7);
        else if (timeRange === 'month') cutoffDate.setMonth(now.getMonth() - 1);
        
        // Filtrar pedidos por fecha y fuente Google
        const periodOrders = timeRange === 'all' ? orders : orders.filter(o => {
            const d = parseFirebaseDate(o.createdAt);
            return d && d >= cutoffDate;
        });

        const googleOrders = periodOrders.filter(o => {
            const src = (o.fuente || o.source || '').toLowerCase();
            return src.includes('google');
        });

        const calculateTotal = (list) => list.reduce((acc, o) => {
            let val = 0;
            if (typeof o.total === 'number') val = o.total;
            else if (typeof o.total === 'string') val = parseInt(o.total.replace(/\D/g, '')) || 0;
            else if (typeof o.totalValue === 'number') val = o.totalValue;
            return acc + val;
        }, 0);

        return {
            totalPeriodo: calculateTotal(periodOrders),
            countPeriodo: periodOrders.length,
            googleVentas: calculateTotal(googleOrders),
            googleCount: googleOrders.length,
            googleOrders // para el mini listado
        };
    }, [orders, timeRange]);

    // Métricas de Rendimiento (Ads + Ventas)
    const marketingMetrics = useMemo(() => {
        let cost = parseFloat(adsData.investment) || 0;
        if (adsData.currency === 'USD') {
            const rate = parseFloat(adsData.exchangeRate) || 515;
            cost = cost * rate;
        }
        
        const clicks = parseInt(adsData.clicks) || 0;
        const revenue = salesStats.googleVentas;
        const conversions = salesStats.googleCount;

        return {
            roas: cost > 0 ? (revenue / cost).toFixed(2) : 0,
            cpa: conversions > 0 ? Math.round(cost / conversions) : 0,
            cpc: clicks > 0 ? Math.round(cost / clicks) : 0,
            convRate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0,
            investment: cost,
            revenue
        };
    }, [adsData, salesStats]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CR');

        // Helper to handle currency symbol encoding issues in jsPDF standard fonts
        const formatMoney = (val) => `CRC ${Number(val).toLocaleString()}`;

        // Attempt to add logo
        try {
            const img = new Image();
            img.src = '/assets/logo.png';
            // We draw it immediately if cached, or skip if not for simplicity in this tick
            // For a production app, we'd wait for load, but here we prioritize stability
            doc.addImage(img, 'PNG', 14, 10, 15, 15); 
        } catch (e) {
            console.error('Logo error:', e);
        }

        // Header (Moved right if logo exists)
        doc.setFontSize(22);
        doc.setTextColor(234, 88, 12); // Orange-600
        doc.text('BiKitchen - Reporte de Google Ads', 32, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Periodo: ${timeRange === 'week' ? 'Última Semana' : timeRange === 'month' ? 'Último Mes' : 'Histórico'}`, 32, 30);
        doc.text(`Generado el: ${dateStr}`, 32, 35);

        // Metrics Summary
        autoTable(doc, {
            startY: 45,
            head: [['Métrica', 'Valor']],
            body: [
                ['Ventas Totales Google', formatMoney(marketingMetrics.revenue)],
                ['Pedidos Google', salesStats.googleCount],
                ['Inversión Ads', formatMoney(marketingMetrics.investment)],
                ['ROAS', `${marketingMetrics.roas}x`],
                ['CPA (Costo por Pedido)', formatMoney(marketingMetrics.cpa)],
                ['Clicks', adsData.clicks || '0'],
                ['Tasa Conv.', `${marketingMetrics.convRate}%`]
            ],
            theme: 'striped',
            headStyles: { fillStyle: [234, 88, 12] }
        });

        // Orders Table
        if (salesStats.googleOrders.length > 0) {
            doc.text('Desglose de Pedidos:', 14, doc.lastAutoTable.finalY + 15);
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['ID', 'Cliente', 'Plan', 'Total']],
                body: salesStats.googleOrders.map(o => [
                    o.displayId || o.id.slice(0, 8),
                    o.cliente || o.client,
                    o.plan || '-',
                    formatMoney(o.totalValue || o.total || 0)
                ]),
            });
        }

        doc.save(`Reporte_Ads_BiKitchen_${dateStr}.pdf`);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAdsData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw size={32} className="animate-spin text-orange-500" />
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 max-w-sm w-full text-center"
                >
                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Sección Protegida</h2>
                    <p className="text-gray-500 text-sm mb-6 font-medium">Esta sección contiene datos sensibles de inversión y rendimiento.</p>
                    
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div className="relative">
                            <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingresa la contraseña"
                                className={`w-full bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-200'} rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all`}
                                autoFocus
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-xs font-bold animate-bounce">Contraseña incorrecta. Inténtalo de nuevo.</p>
                        )}
                        <button 
                            type="submit"
                            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black tracking-wide hover:bg-orange-700 transition-all shadow-lg active:scale-95"
                        >
                            ACCEDER AL PANEL
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <AdminPageHeader 
                icon={Target}
                title="Panel Administrativo"
                subtitle="Análisis estratégico de inversión y ROI de Google Ads"
                stats={[
                    { value: `₡${marketingMetrics.revenue.toLocaleString()}`, label: 'Ventas Google' },
                    { value: marketingMetrics.roas, label: 'ROAS' },
                    { value: `₡${marketingMetrics.cpa.toLocaleString()}`, label: 'CPA' }
                ]}
                actions={[
                    <button
                        key="export"
                        onClick={handleExportPDF}
                        disabled={salesStats.googleCount === 0}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={18} />
                        Descargar PDF
                    </button>
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna de Configuración & Inputs */}
                <div className="lg:col-span-1 space-y-6">
                    <AdminCard title="Configuración" icon={Filter}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Periodo del Reporte</label>
                                <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
                                    {['week', 'month', 'all'].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setTimeRange(r)}
                                            className={`py-2 text-[10px] font-black rounded-lg transition-all ${timeRange === r ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {r === 'week' ? 'SEMANA' : r === 'month' ? 'MES' : 'TODO'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <h4 className="text-xs font-black text-orange-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <TrendingUp size={14} /> Datos de Google Ads
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] uppercase font-bold text-orange-600 ml-1">Inversión</label>
                                            <div className="flex gap-2">
                                                {['CRC', 'USD'].map(curr => (
                                                    <button 
                                                        key={curr}
                                                        onClick={() => setAdsData(prev => ({...prev, currency: curr}))}
                                                        className={`text-[8px] px-2 py-0.5 rounded-full font-black transition-all ${adsData.currency === curr ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800'}`}
                                                    >
                                                        {curr}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <input 
                                            name="investment"
                                            value={adsData.investment}
                                            onChange={handleInputChange}
                                            placeholder={`Importe en ${adsData.currency}`}
                                            className="w-full bg-white border-orange-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>

                                    {adsData.currency === 'USD' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                            <label className="text-[10px] uppercase font-bold text-orange-600 ml-1">Tipo de Cambio (₡)</label>
                                            <input 
                                                name="exchangeRate"
                                                value={adsData.exchangeRate}
                                                onChange={handleInputChange}
                                                placeholder="Ej: 515"
                                                className="w-full bg-white border-orange-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-orange-600 ml-1">Clicks</label>
                                            <input 
                                                name="clicks"
                                                value={adsData.clicks}
                                                onChange={handleInputChange}
                                                placeholder="0"
                                                className="w-full bg-white border-orange-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-orange-600 ml-1">Impresiones</label>
                                            <input 
                                                name="impressions"
                                                value={adsData.impressions}
                                                onChange={handleInputChange}
                                                placeholder="0"
                                                className="w-full bg-white border-orange-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AdminCard>

                    <AdminCard title="Ayuda" icon={AlertCircle}>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            Los datos de ventas se extraen automáticamente de Firestore buscando la fuente <b>"Google"</b> en el periodo seleccionado. Ingresa los datos de tu panel de Google Ads a la izquierda para calcular el ROAS.
                        </p>
                    </AdminCard>
                </div>

                {/* Columna de Resultados */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col justify-center"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Retorno (ROAS)</h4>
                                    <p className="text-xs text-gray-500">Relación Venta/Gasto</p>
                                </div>
                            </div>
                            <div className="text-4xl font-black text-gray-900">{marketingMetrics.roas}x</div>
                            <p className="text-[10px] font-bold text-green-600 mt-2">
                                + Ganancia bruta estimada: ₡{(marketingMetrics.revenue - marketingMetrics.investment).toLocaleString()}
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col justify-center"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Costo Adquisición</h4>
                                    <p className="text-xs text-gray-500">Promedio por pedido</p>
                                </div>
                            </div>
                            <div className="text-4xl font-black text-gray-900">₡{marketingMetrics.cpa.toLocaleString()}</div>
                            <p className="text-[10px] font-bold text-blue-600 mt-2">
                                Costo por Clic (CPC): ₡{marketingMetrics.cpc.toLocaleString()}
                            </p>
                        </motion.div>
                    </div>

                    <AdminCard title="Desglose de Pedidos Google" icon={ShoppingCart}>
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-medium">
                                Mostrando {salesStats.googleCount} pedidos con fuente "Google" en {timeRange === 'week' ? 'la última semana' : timeRange === 'month' ? 'el último mes' : 'todo el historial'}.
                            </p>
                        </div>
                        {salesStats.googleOrders.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search size={32} className="opacity-20" />
                                </div>
                                <p className="text-sm font-bold">No se encontraron pedidos de Google en este periodo</p>
                                <p className="text-xs mt-1">Verifica la fuente en el listado de pedidos</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-gray-500">Pedido</th>
                                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-gray-500">Cliente</th>
                                            <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-gray-500">Plan</th>
                                            <th className="text-right py-3 px-4 text-[10px] font-black uppercase text-gray-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesStats.googleOrders.map((o, idx) => (
                                            <tr key={idx} className="border-b border-gray-50 group hover:bg-orange-50/50 transition-colors">
                                                <td className="py-3 px-4 text-xs font-bold text-gray-400">#{o.displayId || o.id.slice(0,5)}</td>
                                                <td className="py-3 px-4 text-xs font-bold text-gray-900">{o.cliente || o.client}</td>
                                                <td className="py-3 px-4 text-[10px] font-black text-gray-500">{o.plan || '-'}</td>
                                                <td className="py-3 px-4 text-xs font-black text-gray-900 text-right">₡{Number(o.totalValue || o.total || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </AdminCard>
                </div>
            </div>
        </div>
    );
}
