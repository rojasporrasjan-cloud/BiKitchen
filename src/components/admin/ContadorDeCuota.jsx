import React, { useState, useEffect } from 'react';
import { lecturasDeHoy, faltaParaReiniciar, reiniciarContador } from '../../utils/contadorFirestore';

/**
 * Cuánto se lleva gastado de la cuota diaria de Firebase.
 *
 * El 3 de setiembre de 2026 se agotó en plena preparación de la hoja de cocina y
 * nadie lo vio venir. Este indicador existe para que se vea.
 *
 * Es una ESTIMACIÓN de lo que gasta este navegador — Firebase no dice cuánto
 * queda de verdad. Lo dice sin rodeos abajo, porque un número que parece exacto
 * y no lo es hace más daño que no tener número.
 */
export default function ContadorDeCuota({ colapsado = false }) {
    const [datos, setDatos] = useState(() => lecturasDeHoy());
    const [abierto, setAbierto] = useState(false);

    // La cuenta cambia cuando otra pantalla lee; se refresca sola.
    useEffect(() => {
        const t = setInterval(() => setDatos(lecturasDeHoy()), 4000);
        return () => clearInterval(t);
    }, []);

    const { total, limite, restante, fraccion, nivel, porMotivo } = datos;
    const pct = Math.round(fraccion * 100);

    const color = nivel === 'alerta' ? 'bg-red-500'
        : nivel === 'aviso' ? 'bg-amber-500' : 'bg-emerald-500';
    const texto = nivel === 'alerta' ? 'text-red-400'
        : nivel === 'aviso' ? 'text-amber-400' : 'text-gray-300';

    if (colapsado) {
        return (
            <div className="px-2 py-2" title={`Firebase: ${pct}% de la cuota de hoy`}>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
            </div>
        );
    }

    return (
        <div className="px-3 py-2 border-t border-white/10">
            <button
                type="button"
                onClick={() => setAbierto(a => !a)}
                className="w-full text-left"
                aria-expanded={abierto}
            >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Lecturas de Firebase
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums ${texto}`}>{pct}%</span>
                </div>

                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(2, pct)}%` }} />
                </div>

                <div className="mt-1 text-[11px] text-gray-300 tabular-nums">
                    {total.toLocaleString('es-CR')} de {limite.toLocaleString('es-CR')}
                    <span className="text-gray-400"> · quedan {restante.toLocaleString('es-CR')}</span>
                </div>
            </button>

            {nivel !== 'bien' && (
                <div className={`mt-1.5 text-[11px] font-semibold ${texto}`}>
                    {nivel === 'alerta'
                        ? 'Cuidado: al llegar al tope, las pantallas salen vacías.'
                        : 'Ya vas por tres cuartos de la cuota del día.'}
                </div>
            )}

            {abierto && (
                <div className="mt-2 space-y-1.5">
                    <div className="text-[11px] text-gray-400">
                        Se reinicia {faltaParaReiniciar()}.
                    </div>

                    {porMotivo.length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">
                                Qué lo gastó
                            </div>
                            <ul className="space-y-0.5">
                                {porMotivo.map(([motivo, n]) => (
                                    <li key={motivo} className="flex justify-between text-[11px] text-gray-300 tabular-nums">
                                        <span>{motivo}</span>
                                        <span className="font-semibold">{n.toLocaleString('es-CR')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Sin esto el numero seria una promesa que no se puede cumplir. */}
                    <p className="text-[10px] leading-tight text-gray-500">
                        Es un estimado de lo que gasta ESTE navegador. Firebase no dice cuánto
                        queda de verdad, y lo que se abra en otra computadora no se cuenta acá.
                    </p>

                    <button
                        type="button"
                        onClick={() => { reiniciarContador(); setDatos(lecturasDeHoy()); }}
                        className="text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-300"
                    >
                        Poner en cero
                    </button>
                </div>
            )}
        </div>
    );
}
