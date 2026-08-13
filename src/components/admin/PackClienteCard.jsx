import React from 'react';
import { MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getClientWhatsAppUrl } from '../../utils/phoneUtils';
import { formatPrice } from '../../utils/formatters';
import { formatFechaCorta } from '../../utils/dateDisplay';
import { getPlanLabel } from '../../utils/subscriptionProgress';

/**
 * Un cliente con pack de varias semanas, dentro del grupo de su fecha de entrega.
 *
 * La tarjeta responde de un vistazo lo único que importa al operar:
 * quién es, por qué semana va, y cuántas le faltan.
 */
export default function PackClienteCard({ order, progress }) {
    const waUrl = getClientWhatsAppUrl(order.telefono);
    const faltan = progress.total - progress.completadas;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Quién */}
                <div className="min-w-[190px] flex-1">
                    <p className="font-bold text-gray-900">{order.cliente || 'Sin nombre'}</p>
                    {waUrl ? (
                        <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-1 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                        >
                            <MessageCircle size={14} aria-hidden="true" />
                            {order.telefono}
                        </a>
                    ) : (
                        <p className="text-sm text-gray-400 mt-1">Sin teléfono</p>
                    )}
                </div>

                {/* Por cuál semana va */}
                <div className="min-w-[210px]">
                    <div className="flex items-center gap-2">
                        {progress.finalizado ? (
                            <span className="inline-flex items-center gap-1.5 text-green-600 font-bold">
                                <CheckCircle2 size={18} aria-hidden="true" />
                                Ya recibió todo
                            </span>
                        ) : (
                            <span className="text-lg font-bold text-bikitchen-orange">
                                Semana {progress.semanaActual} de {progress.total}
                            </span>
                        )}
                    </div>

                    {/* Una casilla por entrega: llena = ya se hizo */}
                    <div className="flex items-center gap-1.5 mt-1.5" aria-hidden="true">
                        {Array.from({ length: progress.total }).map((_, i) => (
                            <span
                                key={i}
                                className={`h-2 rounded-full ${i < progress.completadas
                                    ? 'w-8 bg-bikitchen-orange'
                                    : 'w-8 bg-gray-200'}`}
                            />
                        ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-1.5">
                        {getPlanLabel(progress.total)}
                        {!progress.finalizado && ` · le faltan ${faltan}`}
                    </p>

                    {progress.cocinaDesincronizada && (
                        <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                            <AlertTriangle size={12} aria-hidden="true" />
                            La cocina solo ve {progress.entregasQueVeLaCocina} de {progress.total}
                        </p>
                    )}
                </div>

                {/* Monto y referencia */}
                <div className="text-right min-w-[110px]">
                    <p className="font-bold text-gray-900">{formatPrice(order.totalValue || 0)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.displayId}</p>
                </div>
            </div>

            {/* Calendario completo del pack */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                {progress.fechas.map((fecha, i) => {
                    const entregada = i < progress.completadas;
                    const esProxima = fecha === progress.proxima;
                    return (
                        <span
                            key={fecha}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium ${entregada
                                ? 'bg-green-50 text-green-700'
                                : esProxima
                                    ? 'bg-bikitchen-orange text-white'
                                    : 'bg-gray-50 text-gray-500'}`}
                        >
                            {entregada ? '✓ ' : ''}S{i + 1}: {formatFechaCorta(fecha)}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
