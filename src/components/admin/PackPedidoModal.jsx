import React from 'react';
import { Link } from 'react-router-dom';
import { X, MessageCircle, MapPin, Phone, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { getClientWhatsAppUrl } from '../../utils/phoneUtils';
import { formatPrice } from '../../utils/formatters';
import { formatFechaLarga } from '../../utils/dateDisplay';
import { getOrderStatusLabel } from '../../config/orderStatus';

/**
 * Detalle de un pedido de varias semanas, dentro de Packs Mensuales.
 *
 * Muestra lo que hace falta para atender a ese cliente sin salir de la pantalla:
 * qué pidió, sus restricciones, dónde entregarle y cómo va su calendario.
 *
 * NO repite el modal de Pedidos, que además permite imprimir, reactivar, cobrar
 * y editar. Para eso está el enlace del pie: duplicar aquellas ~500 líneas
 * habría dejado dos pantallas que se desincronizan a la primera modificación.
 */
export default function PackPedidoModal({ order, progress, onClose }) {
    if (!order) return null;

    const waUrl = getClientWhatsAppUrl(order.telefono);
    const items = order.menu || order.items || [];
    const direccion = order.direccion || order.detalles_entrega?.direccion || order.details?.address;
    const observaciones = order.observaciones || order.details?.notes;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{order.cliente || 'Sin nombre'}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {order.displayId} · {getOrderStatusLabel(order.status)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar detalle del pedido"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Restricciones primero: es lo que más caro sale pasar por alto */}
                    {observaciones && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                                <AlertTriangle size={14} aria-hidden="true" />
                                Notas del cliente
                            </p>
                            <p className="text-sm text-amber-900 mt-1.5">{observaciones}</p>
                        </div>
                    )}

                    {/* Contacto y entrega */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Contacto y entrega
                        </h3>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                            <div className="flex items-center gap-2.5">
                                <Phone size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
                                {waUrl ? (
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1.5"
                                    >
                                        {order.telefono}
                                        <MessageCircle size={14} aria-hidden="true" />
                                    </a>
                                ) : (
                                    <span className="text-gray-400">Sin teléfono</span>
                                )}
                            </div>
                            <div className="flex items-start gap-2.5">
                                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="text-gray-900">{order.zona_envio || 'Zona sin especificar'}</p>
                                    {direccion && <p className="text-gray-600">{direccion}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Qué pidió */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Qué pidió
                        </h3>
                        {items.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Este pedido no tiene ítems guardados.</p>
                        ) : (
                            <ul className="space-y-3">
                                {items.map((item, i) => {
                                    const proteinas = Array.isArray(item.proteinas) ? item.proteinas : [];
                                    return (
                                        <li key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {item.cantidad || 1}× {item.nombre || item.name || 'Sin nombre'}
                                                </p>
                                                <p className="text-sm text-gray-600 shrink-0">
                                                    {formatPrice(item.total || item.precio || 0)}
                                                </p>
                                            </div>
                                            {proteinas.length > 0 && (
                                                <ul className="mt-2 space-y-0.5">
                                                    {proteinas.map((p, k) => (
                                                        <li key={k} className="text-xs text-gray-600 pl-3">• {p}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Calendario de entregas */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Sus {progress.total} entregas
                        </h3>
                        <ul className="space-y-1.5">
                            {progress.fechas.map((fecha, i) => {
                                const entregada = i < progress.completadas;
                                const esProxima = fecha === progress.proxima;
                                return (
                                    <li
                                        key={fecha}
                                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm ${entregada
                                            ? 'bg-green-50 text-green-800'
                                            : esProxima
                                                ? 'bg-orange-50 text-orange-900 font-medium'
                                                : 'bg-gray-50 text-gray-600'}`}
                                    >
                                        <span>Semana {i + 1} · {formatFechaLarga(fecha)}</span>
                                        <span className="shrink-0 text-xs font-bold">
                                            {entregada ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <CheckCircle2 size={13} aria-hidden="true" /> Entregada
                                                </span>
                                            ) : esProxima ? 'Es la próxima' : 'Pendiente'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Pago */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className="text-sm text-gray-500">
                            {order.metodo_pago || 'Método sin especificar'}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                            {formatPrice(order.totalValue || 0)}
                        </span>
                    </div>
                </div>

                {/* Pie */}
                <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100 bg-gray-50">
                    <Link
                        to={`/admin/orders?order=${order.id}`}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                        <ExternalLink size={16} aria-hidden="true" />
                        Abrir en Pedidos (imprimir, cobrar, editar)
                    </Link>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
