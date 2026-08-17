import React from 'react';

/**
 * La lista de a quién le va a llegar el mensaje.
 *
 * Muestra el segmento completo, no solo los seleccionados: los destildados
 * quedan grises pero visibles, para poder volver a marcarlos.
 *
 * La columna de avance sale de getSubscriptionProgress(), el mismo cálculo que
 * usa el módulo de Packs Mensuales.
 */
export default function DestinatariosTabla({ candidatos, excluidos, onAlternar }) {
    if (candidatos.length === 0) return null;

    return (
        <div className="mt-4 max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="w-8 px-2 py-2" aria-label="Incluir" />
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Cliente</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Teléfono</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Zona</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Avance del pack</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Próxima entrega</th>
                    </tr>
                </thead>
                <tbody>
                    {candidatos.map((c) => {
                        const incluido = !excluidos.has(c.telefono);
                        return (
                            <tr
                                key={c.telefono}
                                className={`border-t border-gray-100 ${incluido ? '' : 'opacity-40'}`}
                            >
                                <td className="px-2 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={incluido}
                                        onChange={() => onAlternar(c.telefono)}
                                        aria-label={`Incluir a ${c.nombre}`}
                                        className="accent-bikitchen-orange"
                                    />
                                </td>
                                <td className="px-3 py-2 text-gray-900">{c.nombre}</td>
                                <td className="px-3 py-2 text-gray-600">{c.telefonoOriginal || c.telefono}</td>
                                <td className="px-3 py-2 text-gray-600">{c.zona || '—'}</td>
                                <td className="px-3 py-2">
                                    {c.suscripcion.total > 1 ? (
                                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                            c.suscripcion.finalizado
                                                ? 'bg-gray-100 text-gray-600'
                                                : 'bg-blue-50 text-blue-700'
                                        }`}>
                                            {c.suscripcion.etiqueta}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">Entrega única</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{c.suscripcion.proxima || '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
