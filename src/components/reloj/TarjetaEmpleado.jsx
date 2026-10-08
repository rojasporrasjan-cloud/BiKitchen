import React from 'react';
import { Lock, LogIn, LogOut } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { horaCR, iniciales } from '../../utils/planilla';

/**
 * La tarjeta de una persona en el reloj del iPad: se toca para marcar.
 * Abajo dice en grande lo que va a pasar (entrar o salir), para que nadie dude.
 */
export default function TarjetaEmpleado({ empleado, onElegir }) {
    const tono = tonoDe(empleado.color);
    const { adentro, desde } = empleado;

    let estado = 'Todavía no marca hoy';
    if (adentro) estado = `Adentro desde ${horaCR(desde)}`;
    else if (desde) estado = `Salió a las ${horaCR(desde)}`;

    return (
        <button
            type="button"
            onClick={() => onElegir(empleado)}
            aria-label={`${empleado.nombre}: ${adentro ? 'marcar salida' : 'marcar entrada'}`}
            className="relative flex flex-col items-center w-full overflow-hidden bg-white rounded-[1.75rem] ring-1 ring-black/5 shadow-sm text-center hover:shadow-lg transition duration-150 active:scale-95"
        >
            {adentro && <span className={`absolute inset-x-0 top-0 h-1.5 ${tono.solido}`} aria-hidden="true" />}
            {empleado.tienePin && (
                <Lock size={14} className="absolute top-4 right-4 text-gray-300" aria-hidden="true" />
            )}
            <span className="relative mt-6" aria-hidden="true">
                <span className={`flex items-center justify-center w-20 h-20 rounded-full ${tono.solido} text-white text-2xl font-black shadow-md ring-4 ring-white`}>
                    {iniciales(empleado.nombre)}
                </span>
                {adentro && <span className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-emerald-500 rounded-full ring-4 ring-white" />}
            </span>
            <span className="mt-3 px-3 text-xl font-black text-gray-900 leading-tight">{empleado.nombre}</span>
            <span className={`mt-1 px-3 text-sm font-semibold whitespace-nowrap lining-nums ${adentro ? 'text-emerald-700' : 'text-gray-400'}`}>
                {estado}
            </span>
            <span className={`flex items-center justify-center gap-2 w-full mt-5 py-3.5 text-base font-black ${adentro
                ? 'bg-orange-50 text-bikitchen-orange'
                : 'bg-emerald-50 text-emerald-700'}`}>
                {adentro
                    ? <><LogOut size={18} aria-hidden="true" /> Marcar salida</>
                    : <><LogIn size={18} aria-hidden="true" /> Marcar entrada</>}
            </span>
        </button>
    );
}
