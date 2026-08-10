import React from 'react';
import { AlertTriangle, CheckCircle, FilePlus } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';

/**
 * Vista previa de un pedido leído del chat, antes de crearlo.
 *
 * Muestra SIEMPRE lo que se va a guardar y lo que no se pudo leer. La idea es que
 * nadie cree un pedido a ciegas: si falta algo que la cocina necesita, se ve acá.
 *
 * `problems` bloquea la creación (Firestore lo rechazaría igual).
 * `warnings` no bloquea, pero avisa de lo que va a quedar incompleto.
 */
export default function ImportedOrderPreview({
    parsed,
    pedido,
    problems = [],
    warnings = [],
    creating = false,
    created = null,
    onCreate
}) {
    const rows = [
        ['Cliente', parsed.cliente],
        ['Teléfono', parsed.telefono],
        ['Correo', parsed.correo],
        ['Zona', parsed.zona],
        ['Dirección', parsed.direccion],
        ['Entrega', parsed.fechasEntrega?.length > 1
            ? `${parsed.fechasEntrega.length} entregas · ${parsed.fechasEntrega.join(', ')}`
            : (parsed.fechasEntrega?.[0] || null)],
        ['Método de pago', parsed.metodoPago],
        ['Observaciones', parsed.observaciones]
    ];

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FilePlus size={20} className="text-gray-400" aria-hidden="true" />
                Pedido nuevo, leído del texto
            </h2>
            <p className="text-sm text-gray-500 mt-1">
                Revisá que esté todo bien antes de crearlo. Se va a guardar como
                <strong> pago pendiente</strong>; los BiPuntos se dan cuando lo confirmés.
            </p>

            {/* Bloqueos */}
            {problems.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle size={16} aria-hidden="true" />
                        No se puede crear todavía
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-red-700 list-disc list-inside">
                        {problems.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                </div>
            )}

            {/* Avisos que no bloquean */}
            {warnings.length > 0 && problems.length === 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={16} aria-hidden="true" />
                        Revisá esto
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc list-inside">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}

            {/* Datos */}
            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                        <dt className="text-gray-500 shrink-0">{label}:</dt>
                        <dd className={value ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                            {value || 'sin dato'}
                        </dd>
                    </div>
                ))}
            </dl>

            {/* Ítems */}
            <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Ítems ({pedido.items.length})
                </p>
                {pedido.items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No se leyó ningún ítem.</p>
                ) : (
                    <ul className="space-y-2">
                        {pedido.items.map((item, i) => (
                            <li key={i} className="text-sm text-gray-700">
                                <span className="font-medium">{item.cantidad}× {item.nombre}</span>
                                <span className="text-gray-500"> — {formatPrice(item.total)}</span>
                                {item.proteinas && (
                                    <span className="block text-xs text-gray-500 pl-4">
                                        Proteínas: {item.proteinas.join(', ')}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                <p className="mt-3 text-right text-base font-bold text-gray-900">
                    Total: {formatPrice(pedido.total)}
                </p>
            </div>

            {/* Acción */}
            <div className="mt-5 flex items-center gap-4 flex-wrap">
                {created ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
                        <CheckCircle size={16} aria-hidden="true" />
                        Pedido {created.numeroOrden} creado
                    </span>
                ) : (
                    <button
                        onClick={onCreate}
                        disabled={creating || problems.length > 0}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-bikitchen-orange to-orange-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {creating ? 'Creando…' : 'Crear pedido'}
                    </button>
                )}
            </div>
        </div>
    );
}
