import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Delete, X } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { iniciales, horaCR } from '../../utils/planilla';

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
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-900/70"
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
                className="relative w-full max-w-md overflow-hidden bg-white rounded-[2rem] shadow-2xl text-center"
            >
                <div className={`px-8 pt-8 pb-6 ${esSalida ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                    <button type="button" onClick={onCerrar} aria-label="Cancelar"
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full">
                        <X size={24} aria-hidden="true" />
                    </button>
                    <span className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${tono.solido} text-white text-3xl font-black shadow-lg ring-4 ring-white`}
                        aria-hidden="true">
                        {iniciales(empleado.nombre)}
                    </span>
                    <h2 id="titulo-marcar" className="mt-4 text-3xl font-black text-gray-900">{empleado.nombre}</h2>
                    <p className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-base font-black text-white ${esSalida ? 'bg-bikitchen-orange' : 'bg-emerald-500'}`}>
                        <Icono size={18} aria-hidden="true" />
                        {esSalida ? 'Vas a marcar tu SALIDA' : 'Vas a marcar tu ENTRADA'}
                    </p>
                    <p className="mt-3 text-gray-600 font-semibold lining-nums">Son las {horaCR(new Date())}</p>
                </div>

                <div className="px-8 pb-8">
                {empleado.tienePin ? (
                    <>
                        <div className="flex justify-center gap-4 mt-6" aria-label={`${pin.length} de 4 números`}>
                            {[0, 1, 2, 3].map(i => (
                                <span key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-gray-900' : 'bg-gray-200'}`} aria-hidden="true" />
                            ))}
                        </div>
                        <p className="mt-2 text-sm text-gray-500">Escribí tu PIN</p>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            {TECLAS.map((tecla, i) => tecla === '' ? <span key={i} /> : (
                                <button key={i} type="button" onClick={() => handleTecla(tecla)} disabled={enviando}
                                    aria-label={tecla === 'borrar' ? 'Borrar' : tecla}
                                    className="flex items-center justify-center h-16 bg-gray-100 hover:bg-gray-200 text-gray-900 text-2xl font-bold rounded-2xl lining-nums transition-transform duration-100 active:scale-90 disabled:opacity-40">
                                    {tecla === 'borrar' ? <Delete size={24} aria-hidden="true" /> : tecla}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <button type="button" onClick={() => onMarcar('')} disabled={enviando}
                        className={`flex items-center justify-center gap-3 w-full mt-6 py-5 text-white text-2xl font-black rounded-2xl shadow-lg transition-transform duration-100 active:scale-95 disabled:opacity-50 ${esSalida
                            ? 'bg-bikitchen-orange hover:bg-bikitchen-orange-dark'
                            : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                        <Icono size={28} aria-hidden="true" />
                        {enviando ? 'Marcando…' : esSalida ? 'Marcar salida' : 'Marcar entrada'}
                    </button>
                )}

                {error && <p role="alert" className="mt-4 text-base font-bold text-red-600">{error}</p>}
                <p className="mt-5 text-sm text-gray-400">¿No sos {empleado.nombre}? Tocá afuera para cancelar.</p>
                </div>
            </motion.div>
        </motion.div>
    );
}
