import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Clock3, RefreshCw } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import TarjetaEmpleado from '../components/reloj/TarjetaEmpleado';
import VentanaMarcar from '../components/reloj/VentanaMarcar';
import AvisoMarcado from '../components/reloj/AvisoMarcado';
import { pedirAlReloj } from '../utils/planillaClient';

/**
 * /reloj/:codigo — el reloj de entrada y salida, para el iPad de la cocina.
 *
 * Cada persona toca su nombre y marca. La hora la pone el servidor (no el
 * iPad), así nadie la puede cambiar. Las horas y el salario se ven en el panel,
 * en Planilla. Los datos los da netlify/functions/planilla.js.
 */

const REFRESCAR_MS = 60000;
const SEIS_HORAS = 6 * 60 * 60 * 1000;

const partesCR = (ahora) => {
    const t = new Date(ahora.getTime() - SEIS_HORAS);
    const h = t.getUTCHours();
    return {
        hora: `${h % 12 || 12}:${String(t.getUTCMinutes()).padStart(2, '0')}`,
        segundos: String(t.getUTCSeconds()).padStart(2, '0'),
        ampm: h < 12 ? 'a. m.' : 'p. m.'
    };
};

const saludoDe = (ahora) => {
    const h = new Date(ahora.getTime() - SEIS_HORAS).getUTCHours();
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
};

const fechaLarga = (ahora) => ahora
    .toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\p{L}+),/u, '$1')
    .replace('septiembre', 'setiembre');

/** Que la pantalla del iPad no se apague mientras el reloj está abierto. */
const useSinApagarPantalla = () => {
    useEffect(() => {
        let candado = null;
        const pedir = async () => {
            try { candado = await navigator.wakeLock?.request('screen'); } catch { /* el iPad no lo permite */ }
        };
        const alVolver = () => { if (document.visibilityState === 'visible') pedir(); };
        pedir();
        document.addEventListener('visibilitychange', alVolver);
        return () => {
            document.removeEventListener('visibilitychange', alVolver);
            candado?.release?.().catch(() => {});
        };
    }, []);
};

export default function RelojPage() {
    const { codigo } = useParams();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [ahora, setAhora] = useState(() => new Date());
    const [elegido, setElegido] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [errorMarca, setErrorMarca] = useState('');
    const [resultado, setResultado] = useState(null);
    useSinApagarPantalla();

    const cargar = useCallback(async () => {
        try {
            setDatos(await pedirAlReloj('reloj', { codigo }));
            setError('');
        } catch (e) {
            setError(e.status === 404 ? e.message : 'No hay conexión. Revisá el internet del iPad.');
        }
    }, [codigo]);

    useEffect(() => {
        cargar();
        const t = setInterval(cargar, REFRESCAR_MS);
        return () => clearInterval(t);
    }, [cargar]);

    useEffect(() => {
        const t = setInterval(() => setAhora(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const handleCerrar = useCallback(() => {
        setElegido(null);
        setErrorMarca('');
    }, []);

    const handleCerrarAviso = useCallback(() => setResultado(null), []);

    const handleMarcar = async (pin) => {
        setEnviando(true);
        setErrorMarca('');
        try {
            const r = await pedirAlReloj('marcar', { codigo, empleadoId: elegido.id, pin });
            const minutos = r.tipo === 'salida' && elegido.desde
                ? Math.round((new Date(r.en) - new Date(elegido.desde)) / 60000) : 0;
            setResultado({ ...r, minutos });
            setElegido(null);
            cargar();
            return true;
        } catch (e) {
            if (e.status === 409) {
                setResultado({ ...e.datos, nombre: elegido.nombre, repetida: true });
                setElegido(null);
                return true;
            }
            setErrorMarca(e.status ? e.message : 'No hay conexión. Probá de nuevo.');
            return false;
        } finally {
            setEnviando(false);
        }
    };

    const { hora, segundos, ampm } = partesCR(ahora);
    const empleados = datos?.empleados || [];
    const adentro = empleados.filter(e => e.adentro).length;

    return (
        <div className="min-h-screen lg:flex bg-bikitchen-beige select-none">
            <SEOHead title="Reloj | BiKitchen" description="Herramienta interna: marcar entrada y salida." noindex />
            <h1 className="sr-only">Reloj de entrada y salida de BiKitchen</h1>

            {/* El reloj: naranja de la marca, a la izquierda en el iPad acostado, arriba si está parado */}
            <aside className="relative flex flex-col justify-between gap-8 overflow-hidden px-8 py-8 lg:w-[40%] lg:h-screen lg:sticky lg:top-0 lg:py-12 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-amber-500 text-white">
                <span className="absolute -top-28 -right-28 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />
                <span className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />

                <img src="/assets/logo.png" alt="BiKitchen Food" className="relative w-44 lg:w-56 h-auto brightness-0 invert" />

                <div className="relative">
                    <p className="text-xl lg:text-2xl font-bold text-white/90">{saludoDe(ahora)}</p>
                    <p className="flex items-baseline gap-2 mt-1 font-black leading-none tabular-nums lining-nums" aria-live="off">
                        <span className="text-8xl lg:text-[6.5rem] xl:text-[8rem] tracking-tight">{hora}</span>
                        <span className="flex flex-col gap-1 whitespace-nowrap">
                            <span className="text-2xl lg:text-3xl text-white/60">{segundos}</span>
                            <span className="text-2xl lg:text-3xl">{ampm}</span>
                        </span>
                    </p>
                    <p className="mt-3 text-xl lg:text-2xl font-semibold text-white/90 first-letter:uppercase">{fechaLarga(ahora)}</p>
                </div>

                {datos && (
                    <div className="relative flex gap-3">
                        <span className="flex-1 px-4 py-3 bg-white/20 rounded-2xl">
                            <span className="block text-3xl font-black lining-nums">{adentro}</span>
                            <span className="text-sm font-bold text-white/90">{adentro === 1 ? 'persona adentro' : 'personas adentro'}</span>
                        </span>
                        <span className="flex-1 px-4 py-3 bg-white/10 rounded-2xl">
                            <span className="block text-3xl font-black lining-nums">{empleados.length - adentro}</span>
                            <span className="text-sm font-bold text-white/90">afuera</span>
                        </span>
                    </div>
                )}
            </aside>

            <main className="flex-1 px-5 py-8 sm:px-8 lg:py-12 lg:overflow-y-auto">
                {error && (
                    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold">
                        {error}
                        <button type="button" onClick={cargar}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm">
                            <RefreshCw size={14} aria-hidden="true" /> Reintentar
                        </button>
                    </div>
                )}

                {datos && (
                    <>
                        <h2 className="text-3xl lg:text-4xl font-black text-gray-900">Tocá tu nombre</h2>
                        <p className="mt-1 mb-6 text-lg text-gray-500">para marcar tu entrada o tu salida</p>
                        {empleados.length === 0 ? (
                            <p className="p-8 bg-white rounded-3xl text-center text-gray-500 text-lg">
                                Todavía no hay empleados. Jan los agrega en el panel → Planilla.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-5">
                                {empleados.map(e => <TarjetaEmpleado key={e.id} empleado={e} onElegir={setElegido} />)}
                            </div>
                        )}
                        <p className="flex items-center justify-center gap-2 mt-8 text-sm text-gray-400">
                            <Clock3 size={14} aria-hidden="true" />
                            ¿Te equivocaste o se te olvidó marcar? Avisale a Gina o a Jan.
                        </p>
                    </>
                )}
                {!datos && !error && <p className="mt-16 text-center text-gray-400 text-lg">Cargando…</p>}
            </main>

            <AnimatePresence>
                {elegido && (
                    <VentanaMarcar key="ventana" empleado={elegido} enviando={enviando} error={errorMarca}
                        onMarcar={handleMarcar} onCerrar={handleCerrar} />
                )}
                {resultado && <AvisoMarcado key="aviso" resultado={resultado} onCerrar={handleCerrarAviso} />}
            </AnimatePresence>
        </div>
    );
}
