import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Clock, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecerasConSesion, leerLlaveCliente } from '../../utils/llaveDelCliente';

/**
 * "Tus cambios de esta semana": aparece SOLA en el perfil del cliente que
 * tiene entrega esta semana, sin que escriba su número.
 *
 * Lo reconoce por la llave que quedó en su teléfono al abrir su link de
 * WhatsApp, o por su cuenta si ya quedó unida (netlify/functions/cambios-semana.js,
 * acción 'mios'). Si no se lo reconoce o no tiene entrega, no muestra nada.
 */

const FUNCION = '/.netlify/functions/cambios-semana';

const fechaEnPalabras = (iso) => new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\p{L}+),/u, '$1')
    .replace('septiembre', 'setiembre');

export default function TusCambiosDeLaSemana({ className = '' }) {
    const { currentUser } = useAuth() || {};
    const [datos, setDatos] = useState(null);

    useEffect(() => {
        const llave = leerLlaveCliente();
        if (!llave && !currentUser) return undefined;
        let vigente = true;
        (async () => {
            try {
                const res = await fetch(FUNCION, {
                    method: 'POST',
                    headers: await cabecerasConSesion(),
                    body: JSON.stringify({ accion: 'mios', llaveCliente: llave })
                });
                const d = await res.json().catch(() => ({}));
                if (vigente && res.ok) setDatos(d);
            } catch (e) {
                console.error('[TusCambios] No se pudieron leer:', e);
            }
        })();
        return () => { vigente = false; };
    }, [currentUser]);

    if (!datos?.opciones?.length) return null;

    return (
        <Motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`overflow-hidden rounded-[28px] bg-gradient-to-br from-bikitchen-orange to-bikitchen-gold text-white shadow-xl ${className}`}
            aria-labelledby="titulo-tus-cambios"
        >
            <div className="px-5 pt-5 pb-4">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/90">
                    <CalendarDays size={14} aria-hidden="true" /> Menú de esta semana
                </p>
                <h2 id="titulo-tus-cambios" className="mt-1 text-2xl font-black leading-tight">
                    {datos.nombre ? `${datos.nombre}, elegí tus cambios` : 'Tus cambios de esta semana'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-white/90">Hasta 2 cambios por pack. Si no cambiás nada, te llega el menú tal cual.</p>
            </div>

            <ul className="px-3 pb-3 space-y-2">
                {datos.opciones.map(o => (
                    <li key={o.ruta} className="p-4 bg-white text-gray-900 rounded-2xl">
                        <p className="font-black leading-tight">{o.pack}</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-500">Entrega del {fechaEnPalabras(o.fecha)}</p>
                        {o.cerrada ? (
                            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-gray-500">
                                <Lock size={15} aria-hidden="true" /> Los cambios se cerraron el {o.cierreEnPalabras}
                            </p>
                        ) : (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-bikitchen-orange">
                                    <Clock size={14} aria-hidden="true" /> Tenés hasta el {o.cierreEnPalabras}
                                </span>
                                <Link
                                    to={o.ruta}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-sm font-black rounded-xl active:scale-95 transition-all"
                                >
                                    Elegir mis cambios <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </Motion.section>
    );
}
