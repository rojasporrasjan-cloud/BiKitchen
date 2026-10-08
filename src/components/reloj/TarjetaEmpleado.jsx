import React from 'react';
import { Lock, LogIn, LogOut, CloudUpload, UtensilsCrossed } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { horaCR, iniciales } from '../../utils/planilla';

/**
 * La tarjeta de una persona en el reloj del iPad: se toca para marcar.
 * Abajo dice en grande lo que toca: entrar, volver de almorzar, o (si está
 * adentro) almorzar o irse — eso se elige en la ventana que se abre.
 */
// La hora nunca se parte en dos renglones ("12:00" arriba y "p. m." abajo)
const hora = (d) => horaCR(d).replace(/ /g, ' ');

const ESTADOS = {
    adentro: {
        texto: (d) => `Adentro desde ${hora(d)}`, color: 'text-emerald-700',
        pie: 'bg-orange-50 text-bikitchen-orange', accion: <><LogOut size={18} aria-hidden="true" /> Almuerzo o salida</>, etiqueta: 'almorzar o marcar salida'
    },
    almorzando: {
        texto: (d) => `Almorzando desde ${hora(d)}`, color: 'text-yellow-700',
        pie: 'bg-emerald-50 text-emerald-700', accion: <><UtensilsCrossed size={18} aria-hidden="true" /> Volver de almorzar</>, etiqueta: 'volver de almorzar'
    },
    afuera: {
        texto: (d) => (d ? `Salió a las ${hora(d)}` : 'Todavía no marca hoy'), color: 'text-gray-400',
        pie: 'bg-emerald-50 text-emerald-700', accion: <><LogIn size={18} aria-hidden="true" /> Marcar entrada</>, etiqueta: 'marcar entrada'
    }
};

const estadoDeTarjeta = (e) => {
    if (e.adentro) return 'adentro';
    if (e.almorzando) return 'almorzando';
    return 'afuera';
};

export default function TarjetaEmpleado({ empleado, onElegir }) {
    const tono = tonoDe(empleado.color);
    const cual = estadoDeTarjeta(empleado);
    const estado = ESTADOS[cual];

    return (
        <button
            type="button"
            onClick={() => onElegir(empleado)}
            aria-label={`${empleado.nombre}: ${estado.etiqueta}`}
            className="relative flex flex-col items-center w-full overflow-hidden bg-white rounded-[1.75rem] ring-1 ring-black/5 shadow-sm text-center hover:shadow-lg transition duration-150 active:scale-95"
        >
            {cual !== 'afuera' && <span className={`absolute inset-x-0 top-0 h-1.5 ${cual === 'almorzando' ? 'bg-yellow-400' : tono.solido}`} aria-hidden="true" />}
            {empleado.pendiente && (
                <CloudUpload size={16} className="absolute top-4 left-4 text-amber-500" aria-label="Guardada en el iPad, por enviar" />
            )}
            {empleado.tienePin && (
                <Lock size={14} className="absolute top-4 right-4 text-gray-300" aria-hidden="true" />
            )}
            <span className="relative mt-6" aria-hidden="true">
                <span className={`flex items-center justify-center w-20 h-20 rounded-full ${tono.solido} text-white text-2xl font-black shadow-md ring-4 ring-white`}>
                    {iniciales(empleado.nombre)}
                </span>
                {cual === 'adentro' && <span className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-emerald-500 rounded-full ring-4 ring-white" />}
                {cual === 'almorzando' && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-7 h-7 bg-yellow-400 rounded-full ring-4 ring-white">
                        <UtensilsCrossed size={13} className="text-yellow-900" />
                    </span>
                )}
            </span>
            <span className="mt-3 px-3 text-xl font-black text-gray-900 leading-tight">{empleado.nombre}</span>
            <span className={`mt-1 px-3 text-sm font-semibold leading-snug lining-nums ${estado.color}`}>
                {estado.texto(empleado.desde)}
            </span>
            <span className={`flex items-center justify-center gap-2 w-full mt-5 py-3.5 text-base font-black ${estado.pie}`}>
                {estado.accion}
            </span>
        </button>
    );
}
