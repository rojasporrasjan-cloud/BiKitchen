import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Aviso de lo que está incompleto en la hoja, ANTES de imprimirla.
 *
 * No se imprime (print:hidden): es para la pantalla, para revisar y corregir.
 */
export default function RevisionHoja({ revision }) {
    if (!revision) return null;

    const { resumen, problemas, graves } = revision;
    const altas = problemas.filter((p) => p.gravedad === 'alta');
    const medias = problemas.filter((p) => p.gravedad === 'media');

    return (
        <div className="print:hidden mb-6 max-w-4xl mx-auto text-left">
            <div className="flex flex-wrap gap-3 mb-3">
                {[
                    ['Pedidos', resumen.total],
                    ['Packs', resumen.packs],
                    ['Individuales', resumen.individuales],
                    ['Desayunos', resumen.desayunos],
                    ['Platos en total', resumen.platos]
                ].map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="bg-white border border-gray-200 rounded-xl px-4 py-2">
                        <div className="text-xl font-black text-gray-900">{valor}</div>
                        <div className="text-[11px] text-gray-600">{etiqueta}</div>
                    </div>
                ))}
            </div>

            {graves === 0 && medias.length === 0 && (
                <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Todo revisado: los {resumen.total} pedidos salen completos.
                </p>
            )}

            {altas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-2">
                    <p className="text-sm font-bold text-red-900 flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} aria-hidden="true" />
                        {altas.length} {altas.length === 1 ? 'pedido sale mal' : 'pedidos salen mal'} — revisalos antes de imprimir
                    </p>
                    <ul className="space-y-1.5">
                        {altas.map((p, i) => (
                            <li key={i} className="text-xs text-red-900">
                                <strong>{p.cliente}:</strong> {p.que}
                                <span className="block text-red-700">→ {p.comoSeArregla}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {medias.length > 0 && (
                <details className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <summary className="text-sm font-bold text-amber-900 cursor-pointer">
                        {medias.length} con datos faltantes (no impiden cocinar)
                    </summary>
                    <ul className="mt-2 space-y-1">
                        {medias.map((p, i) => (
                            <li key={i} className="text-xs text-amber-900">
                                <strong>{p.cliente}:</strong> {p.que}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
