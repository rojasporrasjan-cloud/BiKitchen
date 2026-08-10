import React, { useState, useMemo } from 'react';
import { CalendarDays, AlertTriangle, Lock, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrdersContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { isSubscription, getSubscriptionProgress, getPlanLabel } from '../../utils/subscriptionProgress';
import { getOrderStatusLabel } from '../../config/orderStatus';
import { getClientWhatsAppUrl } from '../../utils/phoneUtils';
import { formatPrice } from '../../utils/formatters';

/**
 * Packs multi-entrega: quién compró un pack mensual y por qué semana va.
 *
 * Es una vista de SOLO LECTURA. No crea pedidos ni entregas: el calendario de las
 * 4 semanas ya vive dentro de cada pedido y la hoja de producción ya lo usa. Generar
 * un pedido nuevo por cada semana haría que el cliente saliera dos veces en la cocina.
 */

const TABS = [
    { id: 'activas', label: 'Activas' },
    { id: 'completadas', label: 'Completadas' },
    { id: 'todas', label: 'Todas' }
];

/** Puntos de progreso: uno por entrega, llenos los que ya pasaron. */
function ProgressDots({ total, completadas }) {
    return (
        <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${i < completadas ? 'bg-bikitchen-orange' : 'bg-gray-200'}`}
                />
            ))}
        </div>
    );
}

export default function MonthlyPacksView() {
    const { isSuperAdmin } = useAuth();
    const { orders, loading } = useOrders();
    const [tab, setTab] = useState('activas');

    const subscriptions = useMemo(() => {
        return orders
            .filter(o => o.status !== 'cancelled' && isSubscription(o))
            .map(o => ({ order: o, progress: getSubscriptionProgress(o) }))
            .sort((a, b) => {
                // Primero las que tienen entrega más próxima; las terminadas al final
                if (!a.progress.proxima) return 1;
                if (!b.progress.proxima) return -1;
                return a.progress.proxima.localeCompare(b.progress.proxima);
            });
    }, [orders]);

    if (!isSuperAdmin()) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Lock size={48} className="text-gray-300 mb-4" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="text-gray-500 mt-1">Esta herramienta es solo para el dueño.</p>
            </div>
        );
    }

    const activas = subscriptions.filter(s => !s.progress.finalizado);
    const completadas = subscriptions.filter(s => s.progress.finalizado);
    const desincronizadas = subscriptions.filter(s => s.progress.cocinaDesincronizada);

    const hoyISO = new Date().toISOString().split('T')[0];
    const entregasHoy = activas.filter(s => s.progress.proxima === hoyISO);

    const visibles = tab === 'activas' ? activas : tab === 'completadas' ? completadas : subscriptions;

    return (
        <div className="space-y-6 pb-20">
            <AdminPageHeader
                icon={CalendarDays}
                title="Packs mensuales"
                subtitle="Quién compró un pack de varias semanas y por cuál va"
                stats={[
                    { value: activas.length, label: 'Activas' },
                    { value: entregasHoy.length, label: 'Entregan hoy' },
                    { value: completadas.length, label: 'Completadas' }
                ]}
                gradient="from-purple-600 via-indigo-500 to-blue-500"
            />

            {/* Alerta: packs cuyas semanas la cocina no está viendo */}
            {desincronizadas.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                    <p className="font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle size={18} aria-hidden="true" />
                        {desincronizadas.length} pack{desincronizadas.length > 1 ? 's' : ''} con semanas que la cocina NO está viendo
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                        Estos pedidos tienen varias entregas guardadas, pero la hoja de producción
                        solo reconoce la primera porque al ítem le falta la etiqueta de plan mensual.
                        Esas semanas hay que agregarlas a mano a la hoja hasta corregir el pedido.
                    </p>
                </div>
            )}

            {/* Pestañas */}
            <div className="flex gap-2 flex-wrap">
                {TABS.map(t => {
                    const count = t.id === 'activas' ? activas.length
                        : t.id === 'completadas' ? completadas.length
                            : subscriptions.length;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id
                                ? 'bg-bikitchen-orange text-white shadow-lg shadow-orange-200'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            {t.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bikitchen-orange" aria-hidden="true" />
                </div>
            ) : visibles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <CalendarDays size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-500">
                        {tab === 'activas'
                            ? 'No hay packs de varias semanas en curso.'
                            : 'Nada por acá todavía.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibles.map(({ order, progress }) => {
                        const vencida = progress.proxima && progress.proxima < hoyISO;
                        return (
                            <div
                                key={order.id}
                                className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    {/* Cliente */}
                                    <div className="min-w-[180px]">
                                        <p className="font-bold text-gray-900">{order.cliente || 'Sin nombre'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{order.displayId}</p>
                                        {order.telefono && (
                                            <a
                                                href={getClientWhatsAppUrl(order.telefono)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 mt-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                                            >
                                                <MessageCircle size={14} aria-hidden="true" />
                                                {order.telefono}
                                            </a>
                                        )}
                                    </div>

                                    {/* Progreso */}
                                    <div className="min-w-[200px]">
                                        <p className="text-xs text-gray-500">{getPlanLabel(progress.total)}</p>
                                        <p className={`font-bold mt-0.5 ${progress.finalizado ? 'text-green-600' : 'text-bikitchen-orange'}`}>
                                            {progress.etiqueta}
                                        </p>
                                        <div className="mt-2">
                                            <ProgressDots total={progress.total} completadas={progress.completadas} />
                                        </div>
                                        {progress.cocinaDesincronizada && (
                                            <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                                                <AlertTriangle size={12} aria-hidden="true" />
                                                La cocina solo ve {progress.entregasQueVeLaCocina} de {progress.total}
                                            </p>
                                        )}
                                    </div>

                                    {/* Próxima entrega */}
                                    <div className="min-w-[150px]">
                                        <p className="text-xs text-gray-500">Próxima entrega</p>
                                        {progress.finalizado ? (
                                            <p className="font-bold text-green-600 mt-0.5 flex items-center gap-1.5">
                                                <CheckCircle2 size={16} aria-hidden="true" />
                                                Terminado
                                            </p>
                                        ) : (
                                            <p className={`font-bold mt-0.5 ${progress.esHoy ? 'text-bikitchen-orange'
                                                : vencida ? 'text-red-600' : 'text-gray-900'}`}>
                                                {progress.proxima}
                                                {progress.esHoy && ' · HOY'}
                                                {vencida && ' · vencida'}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            {getOrderStatusLabel(order.status)}
                                        </p>
                                    </div>

                                    {/* Monto */}
                                    <div className="text-right min-w-[100px]">
                                        <p className="text-xs text-gray-500">Total del pack</p>
                                        <p className="font-bold text-gray-900 mt-0.5">
                                            {formatPrice(order.totalValue || 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Calendario completo */}
                                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                    {progress.fechas.map((fecha, i) => (
                                        <span
                                            key={fecha}
                                            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${i < progress.completadas
                                                ? 'bg-gray-100 text-gray-500 line-through'
                                                : fecha === hoyISO
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-blue-50 text-blue-700'}`}
                                        >
                                            {i + 1}. {fecha}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
