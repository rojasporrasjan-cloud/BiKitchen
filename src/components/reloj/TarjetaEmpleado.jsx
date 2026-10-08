import React from 'react';
import { Lock } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { horaCR, iniciales } from '../../utils/planilla';

/** La tarjeta de una persona en el reloj del iPad: se toca para marcar. */
export default function TarjetaEmpleado({ empleado, onElegir }) {
    const tono = tonoDe(empleado.color);
    const { adentro, desde } = empleado;

    return (
        <button
            type="button"
            onClick={() => onElegir(empleado)}
            aria-label={`${empleado.nombre}: ${adentro ? 'marcar salida' : 'marcar entrada'}`}
            className={`relative flex flex-col items-center gap-3 w-full p-5 rounded-3xl text-center transition-transform duration-150 active:scale-95 ${adentro
                ? `bg-white/10 ring-2 ${tono.anillo}`
                : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10'}`}
        >
            {empleado.tienePin && (
                <Lock size={14} className="absolute top-4 right-4 text-white/30" aria-hidden="true" />
            )}
            <span className={`flex items-center justify-center w-20 h-20 rounded-full ${tono.solido} text-white text-2xl font-black shadow-lg`}
                aria-hidden="true">
                {iniciales(empleado.nombre)}
            </span>
            <span className="text-xl font-bold text-white leading-tight">{empleado.nombre}</span>
            {adentro ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 text-sm font-bold rounded-full">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" aria-hidden="true" />
                    Adentro desde {horaCR(desde)}
                </span>
            ) : (
                <span className="px-3 py-1 bg-white/5 text-white/50 text-sm font-semibold rounded-full">
                    {desde ? `Salió ${horaCR(desde)}` : 'Sin marcar hoy'}
                </span>
            )}
        </button>
    );
}
