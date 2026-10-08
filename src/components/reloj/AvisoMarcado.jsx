import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { horaCR, duracion } from '../../utils/planilla';

/**
 * La pantalla de "listo" después de marcar: grande, de color, y se va sola.
 * Verde para la entrada, naranja para la salida, amarillo si ya había marcado.
 */
const DURA_MS = 4000;

const saludo = (en) => {
    const h = (new Date(en).getUTCHours() + 18) % 24;            // hora de Costa Rica
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
};

const COLORES = {
    entrada: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    salida: 'bg-gradient-to-br from-bikitchen-orange to-amber-500',
    repetida: 'bg-gradient-to-br from-amber-400 to-amber-600'
};

export default function AvisoMarcado({ resultado, onCerrar }) {
    useEffect(() => {
        const t = setTimeout(onCerrar, DURA_MS);
        return () => clearTimeout(t);
    }, [onCerrar]);

    const { tipo, en, nombre, minutos, repetida } = resultado;
    const primerNombre = String(nombre || '').split(' ')[0];

    let titulo = `¡${saludo(en)}, ${primerNombre}!`;
    let detalle = `Entrada marcada a las ${horaCR(en)}`;
    if (tipo === 'salida') {
        titulo = `¡Gracias, ${primerNombre}!`;
        detalle = `Salida marcada a las ${horaCR(en)}`;
    }
    if (repetida) {
        titulo = 'Ya habías marcado';
        detalle = `Tu ${tipo} quedó a las ${horaCR(en)}. No hace falta marcar otra vez.`;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCerrar}
            role="status"
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 ${COLORES[repetida ? 'repetida' : tipo]} text-white text-center`}
        >
            <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
                className="flex items-center justify-center w-36 h-36 bg-white rounded-full shadow-2xl"
                aria-hidden="true"
            >
                {repetida
                    ? <Clock size={72} strokeWidth={3} className="text-amber-500" />
                    : <Check size={84} strokeWidth={3.5} className={tipo === 'salida' ? 'text-bikitchen-orange' : 'text-emerald-600'} />}
            </motion.span>
            <h2 className="mt-8 text-5xl md:text-6xl font-black leading-tight text-white">{titulo}</h2>
            <p className="mt-3 text-2xl md:text-3xl font-bold text-white/90 lining-nums">{detalle}</p>
            {!repetida && tipo === 'salida' && minutos > 0 && (
                <p className="mt-6 px-6 py-3 bg-white/20 rounded-full text-xl font-bold lining-nums">Este turno: {duracion(minutos)}</p>
            )}
            <img src="/assets/logo.png" alt="" aria-hidden="true" className="absolute bottom-10 w-36 h-auto brightness-0 invert opacity-80" />
        </motion.div>
    );
}
