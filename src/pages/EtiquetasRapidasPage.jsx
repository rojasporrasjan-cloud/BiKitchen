/**
 * Etiquetas rápidas — la pantalla de la cocina.
 *
 * "Quiero una extensión con la cual puedan sacar cualquier pack fácil, que no
 *  ocupe ni logueo ni nada, solo para que cualquier persona pueda sacarlo con
 *  un Android" — Jan, 26 de setiembre de 2026.
 *
 * El sábado se empaca con la hoja en la mano y siempre falta una etiqueta: un
 * pack que se rehízo, una que salió mal, una ronda extra. Abrir el panel de
 * admin para eso es entrar con usuario, bajar 545 pedidos y buscar el grupo.
 * Acá se toca la familia, cuántas rondas, e imprime.
 *
 * POR QUÉ PUEDE IR SIN LOGIN
 *
 * Porque NO lee un solo pedido. Le hacen falta tres cosas y ninguna es privada:
 *
 *   - los platos del menú de la semana   → `menus_oficial/current`, que en las
 *                                          reglas de Firestore es `read: true`
 *   - el catálogo de individuales        → está en el repo, no en la base
 *   - la impresora                       → está físicamente en la cocina
 *
 * La etiqueta lleva tipo, plato y vencimiento. NO lleva nombre de cliente, ni
 * teléfono, ni dirección. Si alguien se topa la página lo único que ve es el
 * menú de la semana, que de todos modos se publica.
 *
 * ⚠️ El PIN es de pantalla: frena a quien no tiene nada que hacer acá, pero se
 * revisa en el navegador y quien sepa lo salta. Por eso esta pantalla NO puede
 * crecer hacia los pedidos. El día que alguien quiera ver "los pedidos de hoy"
 * desde acá, eso va en el panel con login de verdad.
 *
 * Y una ventaja que no era el objetivo: el panel de admin baja 545 pedidos cada
 * vez que se abre. Esta baja UN documento. La cocina la puede abrir cincuenta
 * veces al día sin mover la cuota de Firebase (ver REGLA 17 de CLAUDE.md).
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Printer, Lock, Search, Check, AlertTriangle, Loader2, Bluetooth } from 'lucide-react';

import SEOHead from '../components/SEOHead';
import { getOfficialMenus } from '../utils/firestoreMenus';
import { individualesData } from '../data/individualesData';
import { TIPO_ETIQUETA, TIPO_INDIVIDUAL, formatExpirationDate } from '../utils/labels/labelDomain';
import { PhomemoM110Adapter, webBluetoothDisponible } from '../services/printing/PhomemoM110Adapter';

const PIN_CORRECTO = '5682';
const LLAVE_PIN = 'bikitchen_etiquetas_pin_ok';

/**
 * Las familias que salen como botones, en el orden en que se empaca.
 * La clave es la del documento del menú; el nombre es el que va impreso.
 */
const FAMILIAS = [
    { clave: 'bajoCalorias',    nombre: TIPO_ETIQUETA.bajoCalorias,    cena: true },
    { clave: 'regular',         nombre: TIPO_ETIQUETA.regular,         cena: true },
    { clave: 'fullPack',        nombre: TIPO_ETIQUETA.fullPack,        cena: true },
    { clave: 'sinCarbos',       nombre: TIPO_ETIQUETA.sinCarbos,       cena: true },
    { clave: 'casaditos',       nombre: TIPO_ETIQUETA.casaditos,       cena: true },
    { clave: 'keto',            nombre: TIPO_ETIQUETA.keto,            cena: true },
    { clave: 'vegetariano',     nombre: TIPO_ETIQUETA.vegetariano,     cena: true },
    // Los familiares y los desayunos no tienen menú de cena.
    { clave: 'familiarPremium', nombre: TIPO_ETIQUETA.familiarPremium, cena: false },
    { clave: 'familiarDeluxe',  nombre: TIPO_ETIQUETA.familiarDeluxe,  cena: false },
    { clave: 'desayuno',        nombre: TIPO_ETIQUETA.desayuno,        cena: false }
];

const CANTIDADES = [1, 2, 3, 5];

/** El vencimiento de siempre: una semana. Se puede cambiar antes de imprimir. */
const enUnaSemana = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Los platos de una familia, sin los guiones de "sin carbo".
 *
 * OJO con las cenas: en el documento del menú `cena` NO es una lista, es un
 * objeto con una cena POR familia —`cena.bajoCalorias`, `cena.keto`…—. Tratarlo
 * como lista reventaba la pantalla al entrar.
 */
const platosDe = (menus, clave, modo = 'almuerzo') => {
    const lista = modo === 'cena' ? menus?.cena?.[clave] : menus?.[clave];
    if (!Array.isArray(lista)) return [];
    return lista
        .map(p => String(p?.proteina || '').trim())
        .filter(p => p && p !== '—' && p !== '-');
};

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function EtiquetasRapidasPage() {
    const [pinOk, setPinOk] = useState(() => {
        try { return localStorage.getItem(LLAVE_PIN) === '1'; } catch { return false; }
    });
    const [pin, setPin] = useState('');
    const [pinMalo, setPinMalo] = useState(false);

    const [menus, setMenus] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [errorMenu, setErrorMenu] = useState(null);

    const [modo, setModo] = useState('almuerzo'); // 'almuerzo' | 'cena'
    const [familia, setFamilia] = useState(null);
    const [individual, setIndividual] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [vence, setVence] = useState(enUnaSemana);

    const [impresora, setImpresora] = useState(null);
    const [conectando, setConectando] = useState(false);
    const [estado, setEstado] = useState(null); // {tipo:'ok'|'error'|'enviando', texto}

    // Solo se construye si el navegador habla Bluetooth: en iPhone no existe.
    const adapterRef = useRef(null);
    if (!adapterRef.current && webBluetoothDisponible()) adapterRef.current = new PhomemoM110Adapter();

    // ── El menú de la semana: UN documento, y con caché ──────────────────
    useEffect(() => {
        let vivo = true;
        getOfficialMenus()
            .then(m => { if (vivo) { setMenus(m); setCargando(false); } })
            .catch(e => { if (vivo) { setErrorMenu(e?.message || 'No se pudo cargar el menú'); setCargando(false); } });
        return () => { vivo = false; };
    }, []);

    // Reconectar sola con la impresora que ya se usó en este teléfono, para no
    // pasar por el diálogo de Chrome cada vez. Es el mismo camino que usa el
    // panel: `restoreDevice()` devuelve el nombre guardado y después `connect()`.
    useEffect(() => {
        const adaptador = adapterRef.current;
        if (!pinOk || !adaptador) return;
        let vivo = true;
        adaptador.restoreDevice().then(async (nombre) => {
            if (!nombre || !vivo) return;
            try {
                await adaptador.connect();
                if (vivo) setImpresora(nombre);
            } catch {
                // Apagada o fuera de alcance: queda el botón de conectar.
            }
        }).catch(() => { /* sin permiso previo, normal */ });
        return () => { vivo = false; };
    }, [pinOk]);

    const revisarPin = (e) => {
        e.preventDefault();
        if (pin === PIN_CORRECTO) {
            setPinOk(true);
            setPinMalo(false);
            try { localStorage.setItem(LLAVE_PIN, '1'); } catch { /* sin storage */ }
        } else {
            setPinMalo(true);
            setPin('');
        }
    };

    const catalogo = useMemo(() => {
        const q = sinTildes(busqueda).trim();
        const lista = individualesData
            .filter(p => p?.nombre && !/PRUEBA PRODUCCI/i.test(p.nombre))
            .map(p => p.nombre);
        const unicos = [...new Set(lista)].sort((a, b) => a.localeCompare(b, 'es'));
        if (!q) return unicos.slice(0, 12);
        return unicos.filter(n => sinTildes(n).includes(q)).slice(0, 20);
    }, [busqueda]);

    /** Lo que se va a imprimir: nombre del tipo y lista de platos. */
    const loQueSale = useMemo(() => {
        if (individual) {
            return { tipo: TIPO_INDIVIDUAL, platos: Array(cantidad).fill(individual) };
        }
        if (familia) {
            const platos = platosDe(menus, familia.clave, modo);
            const ronda = [];
            for (let i = 0; i < cantidad; i++) ronda.push(...platos);
            return { tipo: familia.nombre, platos: ronda };
        }
        return null;
    }, [familia, individual, cantidad, menus, modo]);

    const elegirFamilia = (f) => { setFamilia(f); setIndividual(null); setEstado(null); };
    const elegirIndividual = (n) => { setIndividual(n); setFamilia(null); setEstado(null); };

    const conectar = async () => {
        setEstado(null);
        setConectando(true);
        try {
            const nombre = await adapterRef.current.requestDevice();
            await adapterRef.current.connect();
            setImpresora(nombre || 'Phomemo M110');
        } catch (err) {
            if (err?.name !== 'NotFoundError') {
                setEstado({ tipo: 'error', texto: err?.message || 'No se pudo conectar' });
            }
        } finally {
            setConectando(false);
        }
    };

    const imprimir = useCallback(async () => {
        if (!loQueSale || loQueSale.platos.length === 0) return;
        if (!adapterRef.current) {
            setEstado({ tipo: 'error', texto: 'Este navegador no habla con la impresora. Usá Chrome en Android.' });
            return;
        }
        const total = loQueSale.platos.length;
        setEstado({ tipo: 'enviando', texto: `Enviando ${total}…` });
        const fecha = vence ? formatExpirationDate(vence) : '';
        try {
            await adapterRef.current.connect();
            for (let i = 0; i < loQueSale.platos.length; i++) {
                setEstado({ tipo: 'enviando', texto: `Enviando ${i + 1} de ${total}…` });
                // Una por una: si la impresora se traba, se sabe en cuál quedó.
                await adapterRef.current.printLabel({
                    type: loQueSale.tipo,
                    protein: loQueSale.platos[i],
                    expirationDate: fecha
                });
            }
            setEstado({ tipo: 'ok', texto: `Listo — salieron ${total}` });
        } catch (err) {
            setEstado({ tipo: 'error', texto: err?.message || 'Falló el envío' });
        }
    }, [loQueSale, vence]);

    // ── PIN ──────────────────────────────────────────────────────────────
    if (!pinOk) {
        return (
            <>
                <SEOHead title="Etiquetas | BiKitchen" description="Herramienta interna de cocina." noindex />
                <div className="min-h-screen bg-bikitchen-beige flex items-center justify-center p-6">
                    <form onSubmit={revisarPin} className="w-full max-w-xs text-center">
                        <div className="w-16 h-16 rounded-2xl bg-bikitchen-orange flex items-center justify-center mx-auto mb-5">
                            <Lock className="w-8 h-8 text-white" aria-hidden="true" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-1">Etiquetas</h1>
                        <p className="text-sm text-gray-600 mb-6">Escribí el PIN para entrar</p>
                        <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="off"
                            value={pin}
                            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinMalo(false); }}
                            className="w-full text-center text-4xl font-black tracking-[0.5em] py-4 rounded-2xl border-2 border-gray-300 focus:border-bikitchen-orange focus:outline-none"
                            placeholder="••••"
                            aria-label="PIN"
                        />
                        {pinMalo && <p className="mt-3 text-sm font-bold text-red-600">PIN incorrecto</p>}
                        <button
                            type="submit"
                            disabled={pin.length < 4}
                            className="mt-6 w-full py-4 rounded-2xl bg-bikitchen-orange text-white text-lg font-black disabled:opacity-40 active:scale-95 transition-transform duration-150"
                        >
                            Entrar
                        </button>
                    </form>
                </div>
            </>
        );
    }

    const sinBluetooth = !adapterRef.current;

    return (
        <>
            <SEOHead title="Etiquetas | BiKitchen" description="Herramienta interna de cocina." noindex />
            <div className="min-h-screen bg-bikitchen-beige pb-40">
                <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
                    <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                        <h1 className="text-xl font-black text-gray-900">Etiquetas</h1>
                        <button
                            onClick={conectar}
                            disabled={conectando || sinBluetooth}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform duration-150 ${
                                impresora ? 'bg-green-100 text-green-800' : 'bg-gray-900 text-white'
                            } disabled:opacity-40`}
                        >
                            <Bluetooth className="w-4 h-4" aria-hidden="true" />
                            {conectando ? 'Conectando…' : impresora || 'Conectar'}
                        </button>
                    </div>
                </header>

                <main className="max-w-lg mx-auto px-4 pt-4" id="main-content">
                    {sinBluetooth && (
                        <p className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                            <AlertTriangle className="w-4 h-4 inline mr-1" aria-hidden="true" />
                            Este navegador no puede hablar con la impresora. Se necesita <b>Chrome en Android</b>.
                        </p>
                    )}
                    {errorMenu && (
                        <p className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                            No se pudo cargar el menú de la semana: {errorMenu}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {[['almuerzo', 'Almuerzos'], ['cena', 'Cenas']].map(([m, txt]) => (
                            <button
                                key={m}
                                onClick={() => { setModo(m); setFamilia(null); setEstado(null); }}
                                className={`py-3 rounded-2xl text-sm font-black active:scale-95 transition-transform duration-150 ${
                                    modo === m ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border-2 border-gray-200'
                                }`}
                            >
                                {txt}
                            </button>
                        ))}
                    </div>

                    <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Packs</h2>
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {FAMILIAS.map(f => {
                            const n = platosDe(menus, f.clave, modo).length;
                            const activa = familia?.clave === f.clave;
                            return (
                                <button
                                    key={f.clave}
                                    onClick={() => elegirFamilia(f)}
                                    disabled={cargando || n === 0}
                                    className={`px-3 py-4 rounded-2xl text-sm font-black text-left leading-tight active:scale-95 transition-transform duration-150 disabled:opacity-30 ${
                                        activa ? 'bg-bikitchen-orange text-white' : 'bg-white text-gray-900 border-2 border-gray-200'
                                    }`}
                                >
                                    {f.nombre}
                                    <span className={`block text-xs font-semibold mt-0.5 ${activa ? 'text-white/80' : 'text-gray-500'}`}>
                                        {cargando ? '…' : `${n} platos`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Individuales</h2>
                    <div className="relative mb-2">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar plato…"
                            aria-label="Buscar un plato individual"
                            className="w-full pl-9 pr-3 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:border-bikitchen-orange focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 mb-6">
                        {catalogo.map(n => (
                            <button
                                key={n}
                                onClick={() => elegirIndividual(n)}
                                className={`px-3 py-3 rounded-xl text-sm font-bold text-left active:scale-[0.98] transition-transform duration-150 ${
                                    individual === n ? 'bg-bikitchen-orange text-white' : 'bg-white text-gray-800 border border-gray-200'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                        {catalogo.length === 0 && (
                            <p className="text-sm text-gray-500 px-1">Ningún plato con ese nombre.</p>
                        )}
                    </div>

                    <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                        {individual ? '¿Cuántas etiquetas?' : '¿Cuántas rondas?'}
                    </h2>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {CANTIDADES.map(n => (
                            <button
                                key={n}
                                onClick={() => setCantidad(n)}
                                className={`py-4 rounded-2xl text-2xl font-black active:scale-95 transition-transform duration-150 ${
                                    cantidad === n ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 border-2 border-gray-200'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2" htmlFor="vence">
                        Vence
                    </label>
                    <input
                        id="vence"
                        type="date"
                        value={vence}
                        onChange={(e) => setVence(e.target.value)}
                        className="w-full px-3 py-3 rounded-2xl border-2 border-gray-200 text-sm mb-6 focus:border-bikitchen-orange focus:outline-none"
                    />

                    {loQueSale && loQueSale.platos.length > 0 && (
                        <div className="bg-white rounded-2xl border-2 border-gray-200 p-3 mb-4">
                            <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                                Van a salir {loQueSale.platos.length}
                            </p>
                            <ul className="text-sm text-gray-800 space-y-0.5">
                                {[...new Set(loQueSale.platos)].map(p => (
                                    <li key={p}>
                                        · {p}
                                        {!individual && cantidad > 1 && <span className="text-gray-500"> × {cantidad}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </main>

                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
                    <div className="max-w-lg mx-auto">
                        {estado && (
                            <p className={`mb-2 text-sm font-bold text-center ${
                                estado.tipo === 'ok' ? 'text-green-700'
                                    : estado.tipo === 'error' ? 'text-red-700' : 'text-gray-700'
                            }`}>
                                {estado.tipo === 'ok' && <Check className="w-4 h-4 inline mr-1" aria-hidden="true" />}
                                {estado.tipo === 'error' && <AlertTriangle className="w-4 h-4 inline mr-1" aria-hidden="true" />}
                                {estado.texto}
                            </p>
                        )}
                        <button
                            onClick={imprimir}
                            disabled={!loQueSale || loQueSale.platos.length === 0 || estado?.tipo === 'enviando'}
                            className="w-full py-5 rounded-2xl bg-bikitchen-orange text-white text-lg font-black flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform duration-150"
                        >
                            {estado?.tipo === 'enviando'
                                ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                : <Printer className="w-5 h-5" aria-hidden="true" />}
                            {loQueSale && loQueSale.platos.length > 0
                                ? `Imprimir ${loQueSale.platos.length}`
                                : 'Escogé un pack o un plato'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
