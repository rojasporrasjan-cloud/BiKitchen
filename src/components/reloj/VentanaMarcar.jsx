import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Delete, X, UtensilsCrossed, ChevronLeft } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { iniciales, horaCR } from '../../utils/planilla';

/**
 * Confirmar la marca. Quien está adentro elige: salir a almorzar o terminar el
 * día; quien está almorzando, volver; quien está afuera, entrar. Si la persona
 * tiene PIN, después de elegir sale el teclado. Se cierra sola si nadie la toca
 * (el iPad queda en la cocina).
 */
const CIERRE_SOLO_MS = 30000;
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'];

const ESTILOS = {
    entrada: { aviso: 'Vas a marcar tu ENTRADA', boton: 'Marcar entrada', Icono: LogIn, color: 'bg-emerald-500 hover:bg-emerald-600', fondo: 'bg-emerald-50' },
    almuerzo: { aviso: 'Vas a salir a ALMORZAR', boton: 'Salir a almorzar', Icono: UtensilsCrossed, color: 'bg-amber-500 hover:bg-amber-600', fondo: 'bg-amber-50' },
    vuelta: { aviso: 'Vas a VOLVER del almuerzo', boton: 'Volver de almorzar', Icono: UtensilsCrossed, color: 'bg-emerald-500 hover:bg-emerald-600', fondo: 'bg-emerald-50' },
    salida: { aviso: 'Vas a TERMINAR el día', boton: 'Terminar el día', Icono: LogOut, color: 'bg-bikitchen-orange hover:bg-bikitchen-orange-dark', fondo: 'bg-orange-50' }
};

const opcionesDe = (e) => {
    if (e.adentro) return ['almuerzo', 'salida'];
    if (e.almorzando) return ['vuelta'];
    return ['entrada'];
};

export default function VentanaMarcar({ empleado, enviando, error, ahora, onMarcar, onCerrar }) {
    const opciones = opcionesDe(empleado);
    const [elegida, setElegida] = useState(opciones.length === 1 ? opciones[0] : null);
    const [pin, setPin] = useState('');
    const tono = tonoDe(empleado.color);
    const estilo = elegida ? ESTILOS[elegida] : null;

    useEffect(() => {
        const t = setTimeout(onCerrar, CIERRE_SOLO_MS);
        return () => clearTimeout(t);
    }, [onCerrar, pin, elegida]);

    const handleTecla = async (tecla) => {
        if (enviando) return;
        if (tecla === 'borrar') return setPin(p => p.slice(0, -1));
        const nuevo = `${pin}${tecla}`.slice(0, 4);
        setPin(nuevo);
        // Si el PIN estaba mal, se limpia para volver a escribirlo
        if (nuevo.length === 4 && !(await onMarcar(nuevo, elegida))) setPin('');
    };

    // Sin PIN, tocar la opción ya es confirmar
    const handleElegir = (opcion) => {
        if (empleado.tienePin) {
            setElegida(opcion);
            return;
        }
        onMarcar('', opcion);
    };

    const botonGrande = (opcion) => {
        const { boton, Icono, color } = ESTILOS[opcion];
        return (
            <button key={opcion} type="button" onClick={() => handleElegir(opcion)} disabled={enviando}
                className={`flex items-center justify-center gap-3 w-full py-5 text-white text-2xl font-black rounded-2xl shadow-lg transition-transform duration-100 active:scale-95 disabled:opacity-50 ${color}`}>
                <Icono size={28} aria-hidden="true" />
                {enviando ? 'Marcando…' : boton}
            </button>
        );
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
                <div className={`px-8 pt-8 pb-6 ${estilo ? estilo.fondo : 'bg-gray-50'}`}>
                    <button type="button" onClick={onCerrar} aria-label="Cancelar"
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full">
                        <X size={24} aria-hidden="true" />
                    </button>
                    <span className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${tono.solido} text-white text-3xl font-black shadow-lg ring-4 ring-white`}
                        aria-hidden="true">
                        {iniciales(empleado.nombre)}
                    </span>
                    <h2 id="titulo-marcar" className="mt-4 text-3xl font-black text-gray-900">{empleado.nombre}</h2>
                    {estilo ? (
                        <p className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-base font-black text-white ${estilo.color}`}>
                            <estilo.Icono size={18} aria-hidden="true" /> {estilo.aviso}
                        </p>
                    ) : (
                        <p className="mt-3 text-lg font-black text-gray-700">¿Qué vas a hacer?</p>
                    )}
                    <p className="mt-3 text-gray-600 font-semibold lining-nums">Son las {horaCR(ahora || new Date())}</p>
                </div>

                <div className="px-8 pb-8">
                    {!elegida && <div className="grid gap-3 mt-6">{opciones.map(botonGrande)}</div>}

                    {elegida && !empleado.tienePin && <div className="mt-6">{botonGrande(elegida)}</div>}

                    {elegida && empleado.tienePin && (
                        <>
                            {opciones.length > 1 && (
                                <button type="button" onClick={() => { setElegida(null); setPin(''); }}
                                    className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-gray-500 hover:text-gray-800">
                                    <ChevronLeft size={16} aria-hidden="true" /> Cambiar
                                </button>
                            )}
                            <div className="flex justify-center gap-4 mt-4" aria-label={`${pin.length} de 4 números`}>
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
                    )}

                    {error && <p role="alert" className="mt-4 text-base font-bold text-red-600">{error}</p>}
                    <p className="mt-5 text-sm text-gray-400">¿No sos {empleado.nombre}? Tocá afuera para cancelar.</p>
                </div>
            </motion.div>
        </motion.div>
    );
}
