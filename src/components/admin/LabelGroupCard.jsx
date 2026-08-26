import React from 'react';
import { Copy, Maximize2, Users } from 'lucide-react';
import LabelPreview from './LabelPreview';

/**
 * Una tarjeta por proteína, con la etiqueta real dibujada dentro.
 *
 * Se ve la etiqueta y no solo su nombre a propósito: quien imprime necesita
 * reconocer de un vistazo lo que va a salir del cabezal, sobre todo cuando un
 * nombre largo se parte en dos líneas o se recorta.
 */
export default function LabelGroupCard({
    grupo,
    settings,
    logo,
    expirationDate,
    selected,
    onToggle,
    onPreview,
    onReprint,
    reprintQty,
    onReprintQtyChange,
    canReprint
}) {
    const label = {
        type: grupo.tipo,
        protein: grupo.dishName,
        expirationDate
    };

    return (
        <div
            className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                selected
                    ? 'border-bikitchen-orange bg-white shadow-md'
                    : 'border-gray-200 bg-gray-100'
            }`}
        >
            {/* Toda la parte de arriba selecciona: es el gesto más frecuente */}
            <button
                onClick={onToggle}
                className="w-full text-left p-4 pb-3"
                aria-pressed={selected}
                aria-label={`${selected ? 'Quitar' : 'Incluir'} ${grupo.dishName} del lote`}
            >
                <div className="flex items-start gap-3">
                    <span
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected
                                ? 'bg-bikitchen-orange border-bikitchen-orange'
                                : 'bg-white border-gray-300'
                        }`}
                        aria-hidden="true"
                    >
                        {selected && (
                            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none">
                                <path d="M2 6.5 4.5 9 10 3.5" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </span>

                    <span className="flex-1 min-w-0">
                        <span className={`block font-bold leading-tight truncate ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
                            {grupo.dishName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Users size={12} aria-hidden="true" />
                            {grupo.clientes.length} cliente{grupo.clientes.length !== 1 ? 's' : ''}
                        </span>
                    </span>

                    <span className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-3xl font-black leading-none ${selected ? 'text-bikitchen-orange' : 'text-gray-400'}`}>
                            {grupo.cantidad}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                            etiqueta{grupo.cantidad !== 1 ? 's' : ''}
                        </span>
                    </span>
                </div>

                {grupo.esSustitucion && (
                    <span className="inline-block mt-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                        SUSTITUCIÓN
                    </span>
                )}
            </button>

            {/* La etiqueta como va a salir */}
            <div className="relative px-4 pb-3 flex justify-center">
                <div className={selected ? '' : 'opacity-25'}>
                    {/* scale 2 = tamaño real del ráster (240 px). Menos que eso
                        obliga al navegador a reducir y la etiqueta se ve sucia. */}
                    <LabelPreview label={label} scale={2} settings={settings} logo={logo} compact />
                </div>

                {/* Que no entra tiene que verse de lejos, sin leer nada */}
                {!selected && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1 rounded-full bg-gray-700 text-white text-[11px] font-bold tracking-wide shadow-lg">
                            NO ENTRA
                        </span>
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 bg-white/70 border-t border-gray-100">
                <button
                    onClick={onPreview}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <Maximize2 size={13} aria-hidden="true" /> Ampliar
                </button>

                <div className="flex items-center gap-1 ml-auto">
                    <input
                        type="number"
                        min="1"
                        value={reprintQty}
                        onChange={(e) => onReprintQtyChange(e.target.value)}
                        className="w-12 px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs text-center"
                        aria-label={`Cantidad a reimprimir de ${grupo.dishName}`}
                    />
                    <button
                        onClick={onReprint}
                        disabled={!canReprint}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 transition-colors disabled:opacity-40"
                    >
                        <Copy size={13} aria-hidden="true" /> Reimprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
