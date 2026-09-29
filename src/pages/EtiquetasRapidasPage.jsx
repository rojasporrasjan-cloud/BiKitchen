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
import { prepareLogo } from '../utils/labels/labelRenderer';
import { loadSharedSettings, DEFAULT_SETTINGS } from '../services/printing/printerSettings';
import { PhomemoM110Adapter, webBluetoothDisponible } from '../services/printing/PhomemoM110Adapter';

const PIN_CORRECTO = '5682';
const LLAVE_PIN = 'bikitchen_etiquetas_pin_ok';
const LLAVE_LENTA = 'bikitchen_impresora_lenta';

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

/**
 * La calibración de la impresora de BiKitchen.
 *
 * NO es la de fábrica. El rollo es de 35 × 25 mm, no de 30 × 20, y el contenido
 * va corrido 4 mm a la derecha y 3 hacia abajo para que quede centrado. Con
 * los valores de fábrica la etiqueta sale más chica y pegada a una esquina:
 *
 *   "no sale el mismo formato que tenemos sacando las etiquetas en la pc, las
 *    ocupo con el logo y bien centradas" — Jan, 26 de setiembre de 2026.
 *
 * La calibración buena vive en `admin_config/printer_labels`, pero esa
 * colección pide admin y esta pantalla va sin login. Así que se intenta leer
 * —por si algún día se abre esa lectura— y si no se puede, se usa esta copia.
 *
 * ⚠️ Si Gina recalibra desde el panel, hay que actualizar estos números a mano
 * hasta que la lectura compartida esté disponible.
 */
const CALIBRACION_BIKITCHEN = {
    widthMm: 35,
    heightMm: 25,
    // 4 mm desde el 29 set 2026: la compu se recalibró a 4 y el teléfono se
    // quedó en 3,5 —medio milímetro corrida—, porque no puede leer la
    // calibración compartida sin login.
    offsetXmm: 4,
    offsetYmm: 3,
    speed: 5,

    // LA PAUSA ENTRE ETIQUETAS VA EN AUTOMÁTICO, NO EN LOS 250 ms DE LA COMPU.
    //
    // "por alguna razón me saca 3 en lugar de 5" — Jan, 26 set 2026.
    //
    // Una etiqueta de 25 mm tarda 1.389 ms en salir del rodillo. Con la pausa
    // fijada en 250 ms se le manda la siguiente cuando la anterior todavía está
    // imprimiendo, la impresora se queda sin memoria y pierde etiquetas. Es el
    // mismo problema que ya documenta printerSettings.js: "de un lote de 11
    // salieron 9 y la décima quedó cortada".
    //
    // En 0, `tiempoDeImpresionMs()` la calcula según el alto: 1.839 ms para
    // este rollo. Sale más lento —unos 2 s por etiqueta— pero salen todas, que
    // es lo único que importa cuando alguien está esperando para empacar.
    //
    // Desde el 27 de setiembre esto ya no puede volver a pasar en ninguna
    // pantalla: `pausaEntreEtiquetasMs` no deja que la pausa baje de lo que
    // tarda el papel, sea lo que sea que esté guardado. Se deja el 0 igual, para
    // que una pausa larga guardada en la compu no haga lento el teléfono.
    interLabelDelayMs: 0
};

/**
 * El vencimiento: una semana desde el día en que se imprime. Fijo.
 *
 * Antes era una casilla de fecha que cualquiera podía cambiar, y desde el
 * teléfono salían etiquetas con cualquier vencimiento (Jan, 29 set 2026). Ahora
 * no se elige: se calcula en el momento de imprimir, así que tampoco se queda
 * pegada la fecha de ayer si la página estuvo abierta desde el día anterior.
 */
const DIAS_DE_VENCIMIENTO = 7;
const enUnaSemana = (hoy = new Date()) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + DIAS_DE_VENCIMIENTO);
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
    // Para la impresora que saca una sí y una en blanco: espera el doble entre
    // etiquetas. Se recuerda en cada teléfono, porque va con SU impresora.
    const [lenta, setLenta] = useState(() => {
        try { return localStorage.getItem(LLAVE_LENTA) === '1'; } catch { return false; }
    });
    const cambiarLenta = (valor) => {
        setLenta(valor);
        try { localStorage.setItem(LLAVE_LENTA, valor ? '1' : '0'); } catch { /* sin storage */ }
    };

    const [impresora, setImpresora] = useState(null);
    const [conectando, setConectando] = useState(false);
    const [estado, setEstado] = useState(null); // {tipo:'ok'|'error'|'enviando', texto}

    // Solo se construye si el navegador habla Bluetooth: en iPhone no existe.
    const adapterRef = useRef(null);
    if (!adapterRef.current && webBluetoothDisponible()) adapterRef.current = new PhomemoM110Adapter();

    // El logo y la calibración: sin esto la etiqueta sale sin marca, más chica
    // y pegada a la esquina. Es lo que la hacía verse distinta a la de la compu.
    useEffect(() => {
        const adaptador = adapterRef.current;
        if (!adaptador) return;
        let vivo = true;

        // OJO: `readSettings()` devuelve los valores de FÁBRICA cuando el
        // teléfono no tiene nada guardado, así que solo se usa si de verdad hay
        // algo; si no, pisaría la calibración de la casa con 30 × 20 mm.
        let guardada = null;
        try { guardada = JSON.parse(localStorage.getItem('bikitchen_printer_settings') || 'null'); } catch { /* sin storage */ }
        // La pausa entre etiquetas la manda SIEMPRE esta pantalla, venga de
        // donde venga el resto: en el telefono los 250 ms de la compu hacen
        // que se pierdan etiquetas a media tira.
        const conPausaPropia = (s) => ({ ...s, interLabelDelayMs: 0 });

        adaptador.settings = conPausaPropia({ ...DEFAULT_SETTINGS, ...CALIBRACION_BIKITCHEN, ...(guardada || {}) });
        prepareLogo().then(l => { if (vivo && l) adaptador.logo = l; }).catch(() => { /* sale sin logo */ });
        loadSharedSettings()
            .then(s => { if (vivo && s) adaptador.settings = conPausaPropia({ ...adaptador.settings, ...s }); })
            .catch(() => { /* pide admin: se queda con la copia de aca */ });

        return () => { vivo = false; };
    }, []);

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
        let salieron = 0;
        setEstado({ tipo: 'enviando', texto: `Enviando ${total}…` });
        const fecha = formatExpirationDate(enUnaSemana());
        adapterRef.current.settings = { ...adapterRef.current.settings, impresoraLenta: lenta };
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
                salieron++;
            }
            setEstado({ tipo: 'ok', texto: `Listo — salieron ${total}` });
        } catch (err) {
            // Decir EN CUÁL se quedó: si de 5 salieron 3, quien empaca necesita
            // saber que le faltan 2 y cuáles, no solo que "falló".
            const faltan = total - salieron;
            setEstado({
                tipo: 'error',
                texto: salieron > 0
                    ? `Salieron ${salieron} de ${total}. Faltan ${faltan} — volvé a darle y saca solo esas.`
                    : (err?.message || 'Falló el envío')
            });
        }
    }, [loQueSale, lenta]);

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

                    <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Vence</p>
                    <p className="w-full px-3 py-3 rounded-2xl bg-white border-2 border-gray-200 text-base font-black text-gray-900 mb-6">
                        {formatExpirationDate(enUnaSemana())}
                        <span className="block text-xs font-semibold text-gray-500">
                            {DIAS_DE_VENCIMIENTO} días desde hoy · se pone solo
                        </span>
                    </p>

                    <label className="flex items-start gap-3 px-3 py-3 mb-6 rounded-2xl bg-white border-2 border-gray-200 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={lenta}
                            onChange={(e) => cambiarLenta(e.target.checked)}
                            className="mt-0.5 w-5 h-5 accent-bikitchen-orange"
                        />
                        <span className="text-sm font-bold text-gray-900">
                            Imprimir más lento
                            <span className="block text-xs font-semibold text-gray-500">
                                Marcalo si salen etiquetas en blanco entre medio
                            </span>
                        </span>
                    </label>

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
                        {/* En el teléfono no hay consola: si algo falla, esto dice en qué paso. */}
                        {estado?.tipo === 'error' && adapterRef.current?.bitacora?.length > 0 && (
                            <details className="mb-2 text-xs text-gray-600">
                                <summary className="font-bold cursor-pointer text-center">Ver detalles para mandarle a Jan</summary>
                                <ul className="mt-1 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-2 font-mono break-words">
                                    {adapterRef.current.bitacora.map((l, i) => <li key={i}>{l}</li>)}
                                </ul>
                            </details>
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
