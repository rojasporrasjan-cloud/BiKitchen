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
        <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 text-white select-none">
            <SEOHead title="Reloj | BiKitchen" description="Herramienta interna: marcar entrada y salida." noindex />

            <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-12">
                <header className="flex flex-col items-center text-center">
                    <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-bikitchen-orange">
                        <Clock3 size={16} aria-hidden="true" /> BiKitchen
                    </p>
                    <h1 className="sr-only">Reloj de entrada y salida</h1>
                    <p className="mt-4 flex items-baseline gap-2 font-black tabular-nums leading-none" aria-live="off">
                        <span className="text-7xl sm:text-8xl md:text-9xl">{hora}</span>
                        <span className="text-3xl sm:text-4xl text-white/30">{segundos}</span>
                        <span className="text-2xl sm:text-3xl text-white/60">{ampm}</span>
                    </p>
                    <p className="mt-3 text-xl sm:text-2xl font-semibold text-white/70 first-letter:uppercase">{fechaLarga(ahora)}</p>
                </header>

                {error && (
                    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 mt-8 p-4 bg-red-500/15 ring-1 ring-red-400/40 rounded-2xl text-red-200 font-bold">
                        {error}
                        <button type="button" onClick={cargar}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-sm text-white">
                            <RefreshCw size={14} aria-hidden="true" /> Reintentar
                        </button>
                    </div>
                )}

                {datos && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-10 mb-4">
                            <h2 className="text-2xl font-black">Tocá tu nombre para marcar</h2>
                            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 text-sm font-bold rounded-full">
                                {adentro === 1 ? '1 persona adentro' : `${adentro} personas adentro`}
                            </span>
                        </div>
                        {empleados.length === 0 ? (
                            <p className="p-8 bg-white/5 rounded-3xl text-center text-white/60 text-lg">
                                Todavía no hay empleados. Jan los agrega en el panel → Planilla.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {empleados.map(e => <TarjetaEmpleado key={e.id} empleado={e} onElegir={setElegido} />)}
                            </div>
                        )}
                        <p className="mt-10 text-center text-sm text-white/40">
                            ¿Te equivocaste o se te olvidó marcar? Avisale a Gina o a Jan para corregirlo.
                        </p>
                    </>
                )}
                {!datos && !error && <p className="mt-16 text-center text-white/50 text-lg">Cargando…</p>}
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
