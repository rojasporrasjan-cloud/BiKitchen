import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Clock3, RefreshCw } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import TarjetaEmpleado from '../components/reloj/TarjetaEmpleado';
import VentanaMarcar from '../components/reloj/VentanaMarcar';
import AvisoMarcado from '../components/reloj/AvisoMarcado';
import AvisosDeConexion from '../components/reloj/AvisosDeConexion';
import useColaDelReloj from '../hooks/useColaDelReloj';
import { pedirAlReloj } from '../utils/planillaClient';
import { nuevaMarca, conPendientes } from '../utils/colaDelReloj';
import { fechaCR } from '../utils/planilla';
import { SEGUNDOS_ENTRE_MARCAS, ACCIONES_RELOJ } from '../data/planilla';

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

/**
 * La última lista que se cargó, para que el reloj abra aunque se recargue sin
 * internet. Si es de otro día, nadie está "adentro" todavía.
 */
const ULTIMA_LISTA = 'bikitchen-reloj-ultima-lista-v1';

const listaGuardada = () => {
    try {
        const d = JSON.parse(localStorage.getItem(ULTIMA_LISTA) || 'null');
        if (!d || !Array.isArray(d.empleados)) return null;
        if (d.hoy === fechaCR()) return d;
        return { ...d, empleados: d.empleados.map(e => ({ ...e, adentro: false, almorzando: false, desde: null })) };
    } catch {
        return null;
    }
};

const guardarLista = (d) => {
    try { localStorage.setItem(ULTIMA_LISTA, JSON.stringify(d)); } catch { /* sin espacio: no importa */ }
};

export default function RelojPage() {
    const { codigo } = useParams();
    const [datos, setDatos] = useState(listaGuardada);
    const [error, setError] = useState('');
    const [desfase, setDesfase] = useState(0);              // reloj del servidor − reloj del iPad
    const [ahora, setAhora] = useState(() => new Date());
    const [elegido, setElegido] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [errorMarca, setErrorMarca] = useState('');
    const [resultado, setResultado] = useState(null);
    const { cola, marcar, rechazadas, olvidarRechazadas } = useColaDelReloj(codigo);
    const vuelta = useRef(0);
    const ocupado = useRef(false);
    useSinApagarPantalla();

    const cargar = useCallback(async () => {
        const mia = ++vuelta.current;
        const salio = Date.now();
        try {
            const r = await pedirAlReloj('reloj', { codigo });
            if (mia !== vuelta.current) return;                // ya llegó una más nueva: esta está vieja
            const desfaseNuevo = Date.parse(r.ahora) - (salio + Date.now()) / 2;
            if (Number.isFinite(desfaseNuevo)) setDesfase(desfaseNuevo);
            setDatos(r);
            guardarLista(r);
            setError('');
        } catch (e) {
            if (mia !== vuelta.current) return;
            setError(e.status === 404 ? e.message : 'Sin internet');
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

    /** Lo que se ve después de marcar. Devuelve false si hay que quedarse en la ventana (PIN malo). */
    const mostrar = (r, marca, quien) => {
        // Al irse: cuánto duró este turno. Al volver de almorzar: cuánto almorzó.
        const cuenta = (marca.tipo === 'salida' && !marca.motivo) || (marca.tipo === 'entrada' && marca.motivo === 'almuerzo');
        const minutosDesde = (en) => (cuenta && quien.desde
            ? Math.max(0, Math.round((new Date(en) - new Date(quien.desde)) / 60000)) : 0);
        if (r && !r.ok && r.status !== 409) {
            setErrorMarca(r.error);
            return false;
        }
        if (!r) {
            const en = new Date(marca.tocado + desfase).toISOString();
            setResultado({ tipo: marca.tipo, motivo: marca.motivo, en, nombre: quien.nombre, sinInternet: true, minutos: minutosDesde(en) });
        } else if (r.ok) {
            setResultado({ ...r.datos, minutos: minutosDesde(r.datos.en) });
        } else {
            setResultado({ ...r.datos, nombre: quien.nombre, repetida: true });
        }
        setElegido(null);
        cargar();
        return true;
    };

    const handleMarcar = async (pin, accion) => {
        if (ocupado.current) return false;                     // dos toques al botón: cuenta uno
        ocupado.current = true;
        setEnviando(true);
        setErrorMarca('');
        const quien = elegido;
        try {
            // Recién marcó (con o sin internet): no se le cambia de entrada a salida por un dedo doble
            if (quien.desde && Date.now() + desfase - Date.parse(quien.desde) < SEGUNDOS_ENTRE_MARCAS * 1000) {
                setResultado({ tipo: quien.adentro ? 'entrada' : 'salida', en: quien.desde, nombre: quien.nombre, repetida: true, error: 'Ya marcaste hace un momento.' });
                setElegido(null);
                return true;
            }
            let cual = accion;
            if (!cual) cual = quien.adentro ? 'salida' : quien.almorzando ? 'vuelta' : 'entrada';
            const marca = nuevaMarca(quien, ACCIONES_RELOJ[cual], pin);
            return mostrar(await marcar(marca), marca, quien);
        } finally {
            ocupado.current = false;
            setEnviando(false);
        }
    };

    const momento = new Date(ahora.getTime() + desfase);
    const { hora, segundos, ampm } = partesCR(momento);
    const empleados = conPendientes(datos?.empleados || [], cola, desfase);
    const adentro = empleados.filter(e => e.adentro).length;
    const almorzando = empleados.filter(e => e.almorzando).length;
    // Un toque que lleva rato sin salir = no hay internet (no avisar por el segundo que tarda uno normal)
    const porEnviar = cola.filter(m => ahora.getTime() - m.tocado > 15000).length;

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
                    <p className="text-xl lg:text-2xl font-bold text-white/90">{saludoDe(momento)}</p>
                    <p className="flex items-baseline gap-2 mt-1 font-black leading-none tabular-nums lining-nums" aria-live="off">
                        <span className="text-8xl lg:text-[6.5rem] xl:text-[8rem] tracking-tight">{hora}</span>
                        <span className="flex flex-col gap-1 whitespace-nowrap">
                            <span className="text-2xl lg:text-3xl text-white/60">{segundos}</span>
                            <span className="text-2xl lg:text-3xl">{ampm}</span>
                        </span>
                    </p>
                    <p className="mt-3 text-xl lg:text-2xl font-semibold text-white/90 first-letter:uppercase">{fechaLarga(momento)}</p>
                </div>

                {datos && (
                    <div className="relative flex gap-3">
                        <span className="flex-1 px-4 py-3 bg-white/20 rounded-2xl">
                            <span className="block text-3xl font-black lining-nums">{adentro}</span>
                            <span className="text-sm font-bold text-white/90">{adentro === 1 ? 'persona adentro' : 'personas adentro'}</span>
                        </span>
                        {almorzando > 0 && (
                            <span className="flex-1 px-4 py-3 bg-white/15 rounded-2xl">
                                <span className="block text-3xl font-black lining-nums">{almorzando}</span>
                                <span className="text-sm font-bold text-white/90">almorzando</span>
                            </span>
                        )}
                        <span className="flex-1 px-4 py-3 bg-white/10 rounded-2xl">
                            <span className="block text-3xl font-black lining-nums">{empleados.length - adentro - almorzando}</span>
                            <span className="text-sm font-bold text-white/90">afuera</span>
                        </span>
                    </div>
                )}
            </aside>

            <main className="flex-1 px-5 py-8 sm:px-8 lg:py-12 lg:overflow-y-auto">
                <AvisosDeConexion sinConexion={!!error && !!datos} porEnviar={porEnviar}
                    rechazadas={rechazadas} desfase={desfase} onEntendido={olvidarRechazadas} />
                {error && !datos && (
                    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold">
                        {error === 'Sin internet' ? 'No hay internet. Revisá el wifi del iPad.' : error}
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
                    <VentanaMarcar key="ventana" empleado={elegido} enviando={enviando} error={errorMarca} ahora={momento}
                        onMarcar={handleMarcar} onCerrar={handleCerrar} />
                )}
                {resultado && <AvisoMarcado key="aviso" resultado={resultado} onCerrar={handleCerrarAviso} />}
            </AnimatePresence>
        </div>
    );
}
