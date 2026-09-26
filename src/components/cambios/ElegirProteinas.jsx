import React from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Para los packs de proteínas: elegir las N de esta semana de la lista del menú.
 *
 * Con + y − y no con casillas, porque una misma proteína puede ir dos veces
 * ("2 Pollo caribeño"), y así es como la hoja las cuenta.
 */
export default function ElegirProteinas({ cuantas, disponibles, elegidas, onCambiar }) {
    const total = Object.values(elegidas).reduce((s, n) => s + n, 0);
    const lleno = total >= cuantas;

    const sumar = (nombre, delta) => {
        const n = Math.max(0, (elegidas[nombre] || 0) + delta);
        const nuevas = { ...elegidas, [nombre]: n };
        if (n === 0) delete nuevas[nombre];
        onCambiar(nuevas);
    };

    return (
        <div>
            <p className={`text-sm font-bold ${total === cuantas ? 'text-green-700' : 'text-gray-700'}`}>
                Elegiste {total} de {cuantas}
            </p>
            <ul className="mt-3 space-y-2">
                {disponibles.map(nombre => {
                    const n = elegidas[nombre] || 0;
                    return (
                        <li
                            key={nombre}
                            className={`flex items-center justify-between gap-3 p-3 rounded-2xl border-2 bg-white transition-colors ${n > 0 ? 'border-bikitchen-orange' : 'border-gray-100'}`}
                        >
                            <span className="text-base text-gray-900">{nombre}</span>
                            <div className="shrink-0 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => sumar(nombre, -1)}
                                    disabled={n === 0}
                                    aria-label={`Quitar una de ${nombre}`}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 disabled:opacity-30 active:scale-95 transition-transform"
                                >
                                    <Minus size={16} aria-hidden="true" />
                                </button>
                                <span className="w-5 text-center font-bold text-gray-900" aria-live="polite">{n}</span>
                                <button
                                    type="button"
                                    onClick={() => sumar(nombre, 1)}
                                    disabled={lleno}
                                    aria-label={`Agregar una de ${nombre}`}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-bikitchen-orange text-white disabled:opacity-30 active:scale-95 transition-transform"
                                >
                                    <Plus size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
