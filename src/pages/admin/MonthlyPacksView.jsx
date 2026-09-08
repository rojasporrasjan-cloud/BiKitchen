import React, { useState, useMemo } from 'react';
import { packsPorRenovar, comoSeLee } from '../../utils/packsPorRenovar';
import { CalendarDays, AlertTriangle, Lock, Search, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrdersContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import PackClienteCard from '../../components/admin/PackClienteCard';
import PackPedidoModal from '../../components/admin/PackPedidoModal';
import { isSubscription, getSubscriptionProgress } from '../../utils/subscriptionProgress';
import { formatFechaLarga, diasHasta } from '../../utils/dateDisplay';

/**
 * Packs de varias semanas: quién compró uno y por cuál semana va.
 *
 * Vista de SOLO LECTURA. El calendario de las entregas ya vive dentro de cada
 * pedido y la hoja de producción ya lo usa; generar un pedido por cada semana
 * haría que el cliente saliera dos veces en la cocina.
 *
 * Se agrupa por fecha de entrega porque la pregunta de todos los días es
 * "¿a quién le toca esta semana?", no "¿cómo va el cliente X?". Para eso
 * segundo está el buscador.
 */

const TABS = [
    { id: 'activas', label: 'En curso' },
    // Un pack se acaba en silencio. Agrupados por PROXIMA entrega, el que se
    // queda sin nada la semana entrante se ve igual que el que tiene un mes por
    // delante: el 8 de setiembre, Kendall Barboza tenia su ULTIMA al dia
    // siguiente y nadie lo sabia.
    { id: 'renovar', label: 'Por renovar' },
    { id: 'completadas', label: 'Terminados' },
    { id: 'todas', label: 'Todos' }
];

/** Encabezado del grupo: "HOY · lunes 17 de agosto" */
const tituloGrupo = (iso) => {
    if (!iso) return { texto: 'Ya recibieron todas sus entregas', tono: 'verde' };

    const dias = diasHasta(iso);
    const fecha = formatFechaLarga(iso);

    if (dias < 0) return { texto: `Atrasada · ${fecha}`, tono: 'rojo' };
    if (dias === 0) return { texto: `HOY · ${fecha}`, tono: 'naranja' };
    if (dias === 1) return { texto: `Mañana · ${fecha}`, tono: 'naranja' };
    return { texto: `En ${dias} días · ${fecha}`, tono: 'gris' };
};

const TONOS = {
    rojo: 'bg-red-50 text-red-800 border-red-200',
    naranja: 'bg-orange-50 text-orange-800 border-orange-200',
    verde: 'bg-green-50 text-green-800 border-green-200',
    gris: 'bg-gray-50 text-gray-700 border-gray-200'
};

export default function MonthlyPacksView() {
    const { isSuperAdmin } = useAuth();
    const { orders, loading } = useOrders();
    const [tab, setTab] = useState('activas');
    const [busqueda, setBusqueda] = useState('');
    // Pedido abierto en el detalle, sin salir de esta pantalla
    const [detalle, setDetalle] = useState(null);

    const subscriptions = useMemo(() => (
        orders
            .filter(o => o.status !== 'cancelled' && isSubscription(o))
            .map(o => ({ order: o, progress: getSubscriptionProgress(o) }))
    ), [orders]);

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

    const hoyISO = new Date().toISOString().slice(0, 10);
    const porRenovar = packsPorRenovar(activas, hoyISO);
    const comoSeLeePorCliente = new Map(
        porRenovar.map(s => [s.order.id || s.order.cliente, comoSeLee(s.cuerda)])
    );

    const base = tab === 'activas' ? activas
        : tab === 'renovar' ? porRenovar
            : tab === 'completadas' ? completadas : subscriptions;

    const termino = busqueda.trim().toLowerCase();
    const visibles = termino
        ? base.filter(s => (s.order.cliente || '').toLowerCase().includes(termino))
        : base;

    // Agrupar por próxima entrega, ordenando por fecha; los terminados al final
    const grupos = [];
    const porFecha = new Map();
    visibles.forEach(s => {
        const clave = s.progress.proxima || '';
        if (!porFecha.has(clave)) porFecha.set(clave, []);
        porFecha.get(clave).push(s);
    });
    [...porFecha.keys()]
        .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
        .forEach(clave => grupos.push({ clave, items: porFecha.get(clave) }));

    return (
        <div className="space-y-6 pb-20">
            <AdminPageHeader
                icon={CalendarDays}
                title="Packs de varias semanas"
                subtitle="Quién compró un pack y por cuál semana va"
                stats={[
                    { value: activas.length, label: 'En curso' },
                    { value: entregasHoy.length, label: 'Entregan hoy' },
                    { value: porRenovar.length, label: 'Por renovar' },
                    { value: completadas.length, label: 'Terminados' }
                ]}
                gradient="from-purple-600 via-indigo-500 to-blue-500"
            />

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-blue-900 leading-relaxed">
                    Los clientes están agrupados por <strong>el día que les toca su próxima entrega</strong>.
                    El pedido ya trae adentro todas sus fechas y la cocina lo ve en cada una,
                    así que acá no hay que crear nada: es solo para saber cómo va cada quien.
                </p>
            </div>

            {desincronizadas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <p className="font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle size={18} aria-hidden="true" />
                        {desincronizadas.length} pack{desincronizadas.length > 1 ? 's' : ''} que la cocina no está viendo completo
                    </p>
                    <p className="text-sm text-red-700 mt-2 leading-relaxed">
                        Tienen varias entregas guardadas pero la hoja de producción solo reconoce
                        algunas. <strong>Esas semanas hay que agregarlas a mano</strong>, o el cliente
                        no recibe su comida.
                    </p>
                </div>
            )}

            {/* Buscador + pestañas */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre…"
                        aria-label="Buscar cliente por nombre"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-orange-100 focus:border-bikitchen-orange transition-all"
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    {TABS.map(t => {
                        const count = t.id === 'activas' ? activas.length
                            : t.id === 'renovar' ? porRenovar.length
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
            </div>

            {/* La lista de renovacion se lee distinto: no importa cuando es la
                PROXIMA entrega sino cuando es la ULTIMA, que es la fecha
                despues de la cual el cliente se va si nadie le escribe. */}
            {tab === 'renovar' && porRenovar.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <p className="font-bold text-amber-900 flex items-center gap-2">
                        <AlertTriangle size={18} aria-hidden="true" />
                        A {porRenovar.length === 1 ? 'este se le acaba' : `estos ${porRenovar.length} se les acaba`} el pack
                    </p>
                    <p className="text-sm text-amber-800 mt-1 mb-3">
                        Escribiles ANTES de su última entrega. Después ya se fueron.
                    </p>
                    <ul className="space-y-1.5">
                        {porRenovar.map((s, i) => (
                            <li key={s.order.id || i} className="text-sm text-amber-900 flex flex-wrap gap-x-2">
                                <strong>{s.order.cliente}</strong>
                                <span>— {comoSeLeePorCliente.get(s.order.id || s.order.cliente)}</span>
                                {s.cuerda.ultima && (
                                    <span className="text-amber-700">({s.cuerda.ultima})</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {tab === 'renovar' && porRenovar.length === 0 && !loading && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-sm text-green-900">
                    A nadie se le está acabando el pack esta semana.
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bikitchen-orange" aria-hidden="true" />
                </div>
            ) : grupos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <CalendarDays size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-600 font-medium">
                        {termino
                            ? `Ningún cliente con "${busqueda}"`
                            : tab === 'activas'
                                ? 'Ningún pack de varias semanas en curso'
                                : 'Nada por acá todavía'}
                    </p>
                    {!termino && (
                        <p className="text-sm text-gray-400 mt-1">
                            Acá aparecen solos los pedidos con más de una entrega.
                        </p>
                    )}
                </div>
            ) : (
                grupos.map(({ clave, items }) => {
                    const { texto, tono } = tituloGrupo(clave);
                    return (
                        <section key={clave || 'terminados'} className="space-y-3">
                            <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border ${TONOS[tono]}`}>
                                <h2 className="font-bold text-sm uppercase tracking-wide">{texto}</h2>
                                <span className="text-sm font-medium shrink-0">
                                    {items.length} cliente{items.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            {items.map(({ order, progress }) => (
                                <PackClienteCard
                                    key={order.id}
                                    order={order}
                                    progress={progress}
                                    onVerDetalle={(o, p) => setDetalle({ order: o, progress: p })}
                                />
                            ))}
                        </section>
                    );
                })
            )}

            {detalle && (
                <PackPedidoModal
                    order={detalle.order}
                    progress={detalle.progress}
                    onClose={() => setDetalle(null)}
                />
            )}
        </div>
    );
}
