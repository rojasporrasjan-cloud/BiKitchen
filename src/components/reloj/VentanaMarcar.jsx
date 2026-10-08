import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Delete, X } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { iniciales } from '../../utils/planilla';

/**
 * Confirmar la marca: un botón grande, o el teclado del PIN si la persona
 * tiene uno. Se cierra sola si nadie la toca (el iPad queda en la cocina).
 */
const CIERRE_SOLO_MS = 30000;
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'];

export default function VentanaMarcar({ empleado, enviando, error, onMarcar, onCerrar }) {
    const [pin, setPin] = useState('');
    const tono = tonoDe(empleado.color);
    const esSalida = empleado.adentro;
    const Icono = esSalida ? LogOut : LogIn;

    useEffect(() => {
        const t = setTimeout(onCerrar, CIERRE_SOLO_MS);
        return () => clearTimeout(t);
    }, [onCerrar, pin]);

    const handleTecla = async (tecla) => {
        if (enviando) return;
        if (tecla === 'borrar') return setPin(p => p.slice(0, -1));
        const nuevo = `${pin}${tecla}`.slice(0, 4);
        setPin(nuevo);
        // Si el PIN estaba mal, se limpia para volver a escribirlo
        if (nuevo.length === 4 && !(await onMarcar(nuevo))) setPin('');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-950/90"
            onClick={onCerrar}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-marcar"
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md p-8 bg-stone-900 ring-1 ring-white/10 rounded-[2rem] shadow-2xl text-center"
            >
                <button type="button" onClick={onCerrar} aria-label="Cancelar"
                    className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full">
                    <X size={24} aria-hidden="true" />
                </button>
                <span className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${tono.solido} text-white text-3xl font-black shadow-lg`}
                    aria-hidden="true">
                    {iniciales(empleado.nombre)}
                </span>
                <h2 id="titulo-marcar" className="mt-4 text-3xl font-black text-white">{empleado.nombre}</h2>
                <p className={`mt-1 text-lg font-bold ${esSalida ? 'text-bikitchen-gold' : 'text-emerald-300'}`}>
                    {esSalida ? 'Vas a marcar tu SALIDA' : 'Vas a marcar tu ENTRADA'}
                </p>

                {empleado.tienePin ? (
                    <>
                        <div className="flex justify-center gap-4 mt-6" aria-label={`${pin.length} de 4 números`}>
                            {[0, 1, 2, 3].map(i => (
                                <span key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-white' : 'bg-white/15'}`} aria-hidden="true" />
                            ))}
                        </div>
                        <p className="mt-2 text-sm text-white/50">Escribí tu PIN</p>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            {TECLAS.map((tecla, i) => tecla === '' ? <span key={i} /> : (
                                <button key={i} type="button" onClick={() => handleTecla(tecla)} disabled={enviando}
                                    aria-label={tecla === 'borrar' ? 'Borrar' : tecla}
                                    className="flex items-center justify-center h-16 bg-white/5 hover:bg-white/10 text-white text-2xl font-bold rounded-2xl transition-transform duration-100 active:scale-90 disabled:opacity-40">
                                    {tecla === 'borrar' ? <Delete size={24} aria-hidden="true" /> : tecla}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <button type="button" onClick={() => onMarcar('')} disabled={enviando}
                        className={`flex items-center justify-center gap-3 w-full mt-8 py-5 text-white text-2xl font-black rounded-2xl shadow-lg transition-transform duration-100 active:scale-95 disabled:opacity-50 ${esSalida
                            ? 'bg-bikitchen-orange hover:bg-bikitchen-orange-dark'
                            : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                        <Icono size={28} aria-hidden="true" />
                        {enviando ? 'Marcando…' : esSalida ? 'Marcar salida' : 'Marcar entrada'}
                    </button>
                )}

                {error && <p role="alert" className="mt-4 text-base font-bold text-red-300">{error}</p>}
                <p className="mt-6 text-sm text-white/40">¿No sos {empleado.nombre}? Tocá afuera para cancelar.</p>
            </motion.div>
        </motion.div>
    );
}
