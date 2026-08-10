import React, { useState, useMemo } from 'react';
import { CalendarDays, AlertTriangle, Lock, MessageCircle, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrdersContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { isSubscription, getSubscriptionProgress, getPlanLabel } from '../../utils/subscriptionProgress';
import { getOrderStatusLabel } from '../../config/orderStatus';
import { getClientWhatsAppUrl } from '../../utils/phoneUtils';
import { formatPrice } from '../../utils/formatters';
import { formatFechaCorta, diasHasta, textoRelativo } from '../../utils/dateDisplay';

/**
 * Packs multi-entrega: quién compró un pack mensual y por qué semana va.
 *
 * Vista de SOLO LECTURA. El calendario de las 4 semanas ya vive dentro de cada
 * pedido y la hoja de producción ya lo usa; generar un pedido por cada semana
 * haría que el cliente saliera dos veces en la cocina.
 */

const TABS = [
    { id: 'activas', label: 'En curso' },
    { id: 'completadas', label: 'Terminados' },
    { id: 'todas', label: 'Todos' }
];

export default function MonthlyPacksView() {
    const { isSuperAdmin } = useAuth();
    const { orders, loading } = useOrders();
    const [tab, setTab] = useState('activas');

    const subscriptions = useMemo(() => {
        return orders
            .filter(o => o.status !== 'cancelled' && isSubscription(o))
            .map(o => ({ order: o, progress: getSubscriptionProgress(o) }))
            .sort((a, b) => {
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
    const entregasHoy = activas.filter(s => s.progress.esHoy);

    const visibles = tab === 'activas' ? activas : tab === 'completadas' ? completadas : subscriptions;

    return (
        <div className="space-y-6 pb-20">
            <AdminPageHeader
                icon={CalendarDays}
                title="Packs Mensuales"
                subtitle="Quién compró un pack de varias semanas y por cuál semana va"
                stats={[
                    { value: activas.length, label: 'En curso' },
                    { value: entregasHoy.length, label: 'Entregan hoy' },
                    { value: completadas.length, label: 'Terminados' }
                ]}
                gradient="from-purple-600 via-indigo-500 to-blue-500"
            />

            {/* Qué es esta pantalla */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-blue-900 leading-relaxed">
                    Cuando alguien compra un pack de varias semanas, el pedido ya trae adentro sus
                    fechas de entrega y la cocina lo ve en cada una. Esta pantalla te muestra
                    <strong> por cuál semana va cada cliente</strong>, sin que tengas que llevar nada aparte.
                </p>
            </div>

            {/* Packs cuyas semanas la cocina no está viendo */}
            {desincronizadas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <p className="font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle size={18} aria-hidden="true" />
                        Atención: {desincronizadas.length} pack{desincronizadas.length > 1 ? 's' : ''} que la cocina no está viendo completo
                    </p>
                    <p className="text-sm text-red-700 mt-2 leading-relaxed">
                        Estos pedidos tienen varias entregas guardadas, pero la hoja de producción solo
                        reconoce la primera. <strong>Esas semanas hay que agregarlas a mano a la hoja</strong>,
                        o el cliente no recibe su comida. Abajo salen marcados en rojo.
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

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bikitchen-orange" aria-hidden="true" />
                </div>
            ) : visibles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <CalendarDays size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-600 font-medium">
                        {tab === 'activas'
                            ? 'Ningún pack de varias semanas en curso'
                            : tab === 'completadas'
                                ? 'Todavía no hay packs terminados'
                                : 'No hay packs de varias semanas'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Acá van a aparecer solos los pedidos con más de una entrega.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visibles.map(({ order, progress }) => {
                        const dias = diasHasta(progress.proxima);
                        const vencida = dias !== null && dias < 0;
                        const waUrl = getClientWhatsAppUrl(order.telefono);
                        const faltan = progress.total - progress.completadas;

                        return (
                            <div key={order.id} className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 overflow-hidden">
                                <div className="p-5 flex flex-wrap items-start justify-between gap-5">
                                    {/* Quién */}
                                    <div className="min-w-[200px] flex-1">
                                        <p className="font-bold text-gray-900 text-lg">{order.cliente || 'Sin nombre'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {order.displayId} · {getOrderStatusLabel(order.status)}
                                        </p>
                                        {waUrl ? (
                                            <a
                                                href={waUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 mt-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                                            >
                                                <MessageCircle size={14} aria-hidden="true" />
                                                Escribirle por WhatsApp
                                            </a>
                                        ) : order.telefono ? (
                                            <p className="text-sm text-gray-400 mt-2">{order.telefono} (teléfono inválido)</p>
                                        ) : null}
                                    </div>

                                    {/* Por cuál semana va */}
                                    <div className="min-w-[180px]">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{getPlanLabel(progress.total)}</p>
                                        <p className={`text-2xl font-bold mt-1 ${progress.finalizado ? 'text-green-600' : 'text-bikitchen-orange'}`}>
                                            {progress.finalizado ? 'Terminado' : `Semana ${progress.semanaActual} de ${progress.total}`}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {progress.completadas} entregada{progress.completadas === 1 ? '' : 's'}
                                            {!progress.finalizado && ` · faltan ${faltan}`}
                                        </p>
                                        {progress.cocinaDesincronizada && (
                                            <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1">
                                                <AlertTriangle size={12} aria-hidden="true" />
                                                La cocina solo ve {progress.entregasQueVeLaCocina} de {progress.total}
                                            </p>
                                        )}
                                    </div>

                                    {/* Próxima entrega */}
                                    <div className="min-w-[170px]">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Próxima entrega</p>
                                        {progress.finalizado ? (
                                            <p className="font-bold text-green-600 mt-1 flex items-center gap-1.5">
                                                <CheckCircle2 size={16} aria-hidden="true" />
                                                Ya recibió todo
                                            </p>
                                        ) : (
                                            <>
                                                <p className={`text-lg font-bold mt-1 ${progress.esHoy ? 'text-bikitchen-orange'
                                                    : vencida ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {formatFechaCorta(progress.proxima)}
                                                </p>
                                                <p className={`text-sm font-medium ${progress.esHoy ? 'text-bikitchen-orange'
                                                    : vencida ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {vencida ? `Atrasada — ${textoRelativo(dias)}` : textoRelativo(dias)}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Monto */}
                                    <div className="text-right min-w-[110px]">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Pagó</p>
                                        <p className="font-bold text-gray-900 mt-1">{formatPrice(order.totalValue || 0)}</p>
                                    </div>
                                </div>

                                {/* Calendario completo */}
                                <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                                    <p className="text-xs text-gray-500 mb-2">Las {progress.total} entregas de este pack:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {progress.fechas.map((fecha, i) => {
                                            const entregada = i < progress.completadas;
                                            const esProxima = fecha === progress.proxima;
                                            return (
                                                <span
                                                    key={fecha}
                                                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${entregada
                                                        ? 'bg-green-100 text-green-700'
                                                        : esProxima
                                                            ? 'bg-bikitchen-orange text-white'
                                                            : 'bg-white text-gray-600 border border-gray-200'}`}
                                                >
                                                    {entregada ? '✓ ' : esProxima ? '→ ' : ''}
                                                    Semana {i + 1}: {formatFechaCorta(fecha)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
