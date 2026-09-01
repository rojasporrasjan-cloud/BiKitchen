import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Printer, Lock, Calendar, RefreshCw, AlertTriangle,
    CheckCircle, XCircle, History, Tag, Users
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrdersContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import PrintJobSidebar from '../../components/admin/PrintJobSidebar';
import LabelSectionList from '../../components/admin/LabelSectionList';
import PrinterConnectionPanel from '../../components/admin/PrinterConnectionPanel';
import { getScheduleFromOrder } from '../../utils/orderDates';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import {
    buildLabelBatch,
    groupByTipo,
    expandGroupsToLabels,
    formatExpirationDate,
    contarPorFamilia,
    familiaDeTipo,
    FAMILIA
} from '../../utils/labels/labelDomain';
import { MockPrinterAdapter } from '../../services/printing/PrinterAdapter';
import {
    PhomemoM110Adapter, webBluetoothDisponible, ultimaImpresora
} from '../../services/printing/PhomemoM110Adapter';
import {
    readSettings, saveSettings, resetSettings, DEFAULT_SETTINGS,
    loadSharedSettings, saveSharedSettings
} from '../../services/printing/printerSettings';
import {
    alternarGrupo, alternarSeccion, fijarGrupos
} from '../../utils/labels/labelSelection';
import { prepareLogo } from '../../utils/labels/labelRenderer';
import { PrintQueue, JOB_STATUS } from '../../services/printing/printQueue';
import { appendJobLog, readJobLog, JOB_KIND } from '../../services/printing/printJobLog';

/**
 * Etiquetas de producción.
 *
 * Calcula cuántas etiquetas hacen falta a partir de los pedidos reales de una
 * fecha y prepara el lote. TODAVÍA NO IMPRIME EN PAPEL: la única capa de
 * impresión conectada es el simulador (MockPrinterAdapter), porque el adaptador
 * de la Phomemo M110 no se ha podido probar contra la impresora física.
 *
 * Esta pantalla es de SOLO LECTURA sobre los pedidos: calcula y muestra. Nunca
 * escribe en `pedidos` ni en nada relacionado con producción, pagos o clientes.
 */

const hoyISO = () => new Date().toISOString().split('T')[0];

export default function PrinterView() {
    const { isSuperAdmin, currentUser } = useAuth();
    const { orders: allOrders } = useOrders();

    const [selectedDate, setSelectedDate] = useState(hoyISO());
    const [expirationDate, setExpirationDate] = useState('');
    const [rawOrders, setRawOrders] = useState([]);
    const [officialMenus, setOfficialMenus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [excluded, setExcluded] = useState(() => new Set());
    const [previewGroupId, setPreviewGroupId] = useState(null);
    const [reprintQty, setReprintQty] = useState({});
    const [confirming, setConfirming] = useState(null);
    const [progress, setProgress] = useState(null);
    const [jobLog, setJobLog] = useState([]);

    // Modo de impresión. Arranca en simulación a propósito: nada se manda a una
    // impresora física mientras no se elija explícitamente.
    const [modoReal, setModoReal] = useState(false);
    const [printerName, setPrinterName] = useState(null);
    const [printerError, setPrinterError] = useState(null);
    const [conectando, setConectando] = useState(false);
    const [testStatus, setTestStatus] = useState(null);
    const [familiaFiltro, setFamiliaFiltro] = useState(null); // null = ver todo
    const [syncEstado, setSyncEstado] = useState('sin-confirmar');
    const recordada = ultimaImpresora();

    const [settings, setSettings] = useState(readSettings);
    const [logo, setLogo] = useState(null);
    const [mostrarAjustes, setMostrarAjustes] = useState(false);

    /**
     * ¿La persona ya ajustó algo a mano en esta sesión?
     *
     * La calibración compartida se pide al entrar y tarda lo que tarde la red.
     * Si llega DESPUÉS de que alguien movió un control, no puede pisarlo: se veía
     * como que el ajuste "no se guardaba" —el control volvía solo— y el lote
     * salía sin calibrar aunque la etiqueta de prueba sí lo estuviera.
     */
    const ajustesTocados = useRef(false);

    useEffect(() => { prepareLogo().then(setLogo); }, []);

    const mockRef = useRef(null);
    if (!mockRef.current) mockRef.current = new MockPrinterAdapter({ delayMs: 8 });

    const realRef = useRef(null);
    if (!realRef.current && webBluetoothDisponible()) realRef.current = new PhomemoM110Adapter();

    // La calibración se aplica al adaptador vivo: cambiar un valor no debe
    // obligar a reconectar la impresora.
    if (realRef.current) {
        realRef.current.settings = settings;
        realRef.current.logo = logo;
    }

    // La calibración compartida manda sobre la local: la impresora es la misma
    // para todos, así que quien la ajustó bien la deja lista para los demás.
    useEffect(() => {
        loadSharedSettings().then(remoto => {
            // Si ya movió algo mientras cargaba, lo suyo manda
            if (ajustesTocados.current) return;

            if (remoto) {
                setSettings(remoto);
                setSyncEstado('compartida');
            } else {
                // Puede ser que aún no exista el documento; se sabrá al guardar.
                setSyncEstado('sin-confirmar');
            }
        });
    }, []);

    // Reconectar sola tras recargar la página. Sin esto había que volver a
    // elegir la impresora en el diálogo de Chrome cada vez, que era lo más
    // molesto de todo el flujo.
    useEffect(() => {
        const adaptador = realRef.current;
        if (!adaptador) return;
        let cancelado = false;

        adaptador.restoreDevice().then(async (nombre) => {
            if (!nombre || cancelado) return;
            try {
                await adaptador.connect();
                if (cancelado) return;
                setPrinterName(nombre);
                setModoReal(true);
            } catch {
                // La impresora está apagada o fuera de alcance: se deja el
                // botón de conectar, sin molestar con un error al entrar.
            }
        });

        return () => { cancelado = true; };
    }, []);

    const actualizarAjuste = (campo, valor) => {
        // A partir de acá manda lo que ajustó la persona: la calibración
        // compartida que llegue después NO puede pisarlo.
        ajustesTocados.current = true;

        const next = { ...settings, [campo]: valor };
        setSettings(next);
        saveSettings(next); // inmediato y local: nunca se pierde el ajuste

        // Si la base de datos rechaza la escritura hay que decirlo. Antes
        // solo quedaba en la consola y se creía que estaba compartida.
        //
        // Guardar va FUERA del updater de setSettings a propósito: React puede
        // llamar un updater más de una vez o descartar su resultado, así que un
        // efecto ahí adentro no está garantizado.
        saveSharedSettings(next, currentUser?.email || null)
            .then(ok => setSyncEstado(ok ? 'compartida' : 'solo-local'));
    };

    const adapter = modoReal ? realRef.current : mockRef.current;

    const queueRef = useRef(null);
    if (!queueRef.current) queueRef.current = new PrintQueue(mockRef.current);
    queueRef.current.adapter = adapter;

    const impresoraLista = !modoReal || !!printerName;

    useEffect(() => {
        setJobLog(readJobLog());
        getOfficialMenus().then(setOfficialMenus).catch(() => setOfficialMenus(null));
    }, []);

    // Fechas con producción, igual que en Hojas de Producción.
    const availableDates = useMemo(() => {
        if (!allOrders || allOrders.length === 0) return [];
        const dates = [];
        allOrders.forEach(o => {
            if (o.status === 'cancelled') return;
            getScheduleFromOrder(o).forEach(d => { if (d) dates.push(d); });
        });
        const unicas = [...new Set(dates)].sort();
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0];
        const recientes = unicas.filter(d => d >= inicioMes);
        return recientes.length > 0 ? recientes : unicas;
    }, [allOrders]);

    useEffect(() => {
        if (availableDates.length === 0) return;
        if (availableDates.includes(selectedDate)) return;
        const hoy = hoyISO();
        setSelectedDate(availableDates.find(d => d >= hoy) || availableDates[availableDates.length - 1]);
    }, [availableDates]);

    // Los pedidos se leen crudos de Firestore a propósito: buildLabelBatch aplica
    // por su cuenta el filtro de estados, el calendario y las sustituciones, igual
    // que la hoja de producción. Los pedidos del contexto vienen con campos ya
    // transformados para otras pantallas y ensuciarían el cálculo.
    useEffect(() => {
        if (!selectedDate) return;
        let cancelado = false;

        const cargar = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const desde = new Date(`${selectedDate}T12:00:00`);
                desde.setDate(desde.getDate() - 40);
                const snapshot = await getDocs(query(
                    collection(db, 'pedidos'),
                    where('fecha_entrega', '>=', desde.toISOString().split('T')[0])
                ));
                if (cancelado) return;
                setRawOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error('[Etiquetas] Error leyendo pedidos:', err);
                if (!cancelado) setLoadError(err.message || 'No se pudieron leer los pedidos');
            } finally {
                if (!cancelado) setLoading(false);
            }
        };

        cargar();
        return () => { cancelado = true; };
    }, [selectedDate]);

    const batch = useMemo(
        () => buildLabelBatch(rawOrders, selectedDate, officialMenus),
        [rawOrders, selectedDate, officialMenus]
    );

    const selectedGroups = useMemo(
        () => batch.groups.filter(g => !excluded.has(g.id)),
        [batch.groups, excluded]
    );

    const totalSeleccionado = selectedGroups.reduce((acc, g) => acc + g.cantidad, 0);

    // El filtro solo cambia lo que se VE. Lo que se imprime sigue siendo lo
    // seleccionado, esté visible o no: ocultar algo no puede sacarlo del lote
    // sin que nadie se entere.
    const conteoFamilias = useMemo(() => contarPorFamilia(batch.groups), [batch.groups]);
    const gruposVisibles = useMemo(
        () => familiaFiltro
            ? batch.groups.filter(g => familiaDeTipo(g.tipo) === familiaFiltro)
            : batch.groups,
        [batch.groups, familiaFiltro]
    );
    const porTipo = useMemo(() => groupByTipo(gruposVisibles), [gruposVisibles]);

    const previewGroup = batch.groups.find(g => g.id === previewGroupId) || batch.groups[0] || null;
    const previewLabel = previewGroup ? {
        type: previewGroup.tipo,
        protein: previewGroup.dishName,
        expirationDate: formatExpirationDate(expirationDate)
    } : null;

    // La lógica de selección vive en labelSelection.js y está cubierta por
    // tests: un "incluir todas" que no incluye todas tiene que fallar ahí y no
    // delante de la impresora.
    /** Cuánto va a tardar el lote, para que nadie crea que se colgó. */
    const duracionEstimada = (cantidad) => {
        const porEtiqueta = realRef.current?.tiempoDeImpresionMs?.() ?? 2000;
        const segundos = Math.round((cantidad * (porEtiqueta + 2500)) / 1000);
        if (segundos < 90) return `${segundos} segundos`;
        return `${Math.round(segundos / 60)} minutos`;
    };

    const toggleSeccion = (ids) => setExcluded(prev => alternarSeccion(prev, ids));
    const toggleGroup = (id) => setExcluded(prev => alternarGrupo(prev, id));
    const fijarTodos = (incluir) =>
        setExcluded(prev => fijarGrupos(prev, batch.groups.map(g => g.id), incluir));

    const ejecutarLote = async (labels, kind, detalle) => {
        setConfirming(null);
        const queue = queueRef.current;
        const resultado = await queue.run(labels, setProgress);

        const registro = appendJobLog({
            productionDate: selectedDate,
            expirationDate,
            quantity: kind === JOB_KIND.REPRINT ? labels.length : resultado.processed,
            kind,
            simulated: resultado.isSimulated,
            status: resultado.status,
            detail: detalle,
            user: currentUser?.email || null
        });
        setJobLog(prev => [registro, ...prev]);
    };

    const prepararLote = () => {
        const labels = expandGroupsToLabels(selectedGroups, expirationDate, { conDivisores: true });
        ejecutarLote(labels, JOB_KIND.BATCH, `${selectedGroups.length} grupos`);
    };

    const conectarImpresora = async (mostrarTodos = false) => {
        setPrinterError(null);
        setConectando(true);
        try {
            const nombre = await realRef.current.requestDevice(mostrarTodos);
            await realRef.current.connect();
            setPrinterName(nombre || 'Phomemo M110');
        } catch (err) {
            // Cancelar el diálogo del navegador no es un error que valga reportar.
            if (err?.name !== 'NotFoundError') {
                setPrinterError(err.message || 'No se pudo conectar');
            }
            setPrinterName(null);
        } finally {
            setConectando(false);
        }
    };

    /**
     * Una sola etiqueta, para comprobar la impresora antes de mandar un lote.
     * No pasa por la cola ni por el historial de producción: es una prueba.
     */
    const imprimirPrueba = async () => {
        setTestStatus({ estado: 'enviando' });
        const etiqueta = {
            type: 'Regular',
            protein: 'Fajitas de pollo',
            expirationDate: expirationDate ? formatExpirationDate(expirationDate) : '23 enero'
        };
        try {
            await adapter.connect();
            await adapter.printLabel(etiqueta);
            setTestStatus({
                estado: 'enviada',
                simulada: !!adapter.isSimulated,
                bytes: adapter.bytesSent,
                respuestas: adapter.lastResponses ? [...adapter.lastResponses] : []
            });
        } catch (err) {
            setTestStatus({
                estado: 'error',
                mensaje: err.message || 'Falló el envío',
                bytes: adapter.bytesSent,
                respuestas: adapter.lastResponses ? [...adapter.lastResponses] : []
            });
        }
    };

    const reimprimir = (grupo) => {
        const cantidad = Math.max(1, Number(reprintQty[grupo.id]) || 1);
        // Se construye un grupo aparte con la cantidad pedida: el lote original
        // y las cantidades de producción quedan intactos.
        const labels = expandGroupsToLabels([{ ...grupo, cantidad }], expirationDate);
        ejecutarLote(labels, JOB_KIND.REPRINT, `${cantidad} × ${grupo.dishName}`);
    };

    if (!isSuperAdmin()) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Lock size={48} className="text-gray-300 mb-4" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="text-gray-500 mt-1">Esta herramienta es solo para el dueño.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                icon={Printer}
                title="Etiquetas de Producción"
                // El tamaño sale de la calibración, no de un número escrito acá:
                // el rollo se cambió a 35 × 25 y el encabezado siguió diciendo 30 × 20.
                subtitle={`Calcula e imprime las etiquetas térmicas ${settings.widthMm} × ${settings.heightMm} mm a partir de los pedidos reales`}
                gradient="from-slate-700 via-slate-600 to-gray-500"
                stats={[
                    { value: batch.totalOrders, label: 'Pedidos' },
                    { value: batch.totalLabels, label: 'Etiquetas' }
                ]}
            />

            <PrinterConnectionPanel
                modoReal={modoReal}
                onModoChange={(v) => { setModoReal(v); setTestStatus(null); }}
                printerName={printerName}
                conectando={conectando}
                printerError={printerError}
                recordada={recordada}
                onConectar={conectarImpresora}
                impresoraLista={impresoraLista}
                testStatus={testStatus}
                onImprimirPrueba={imprimirPrueba}
                mostrarAjustes={mostrarAjustes}
                onToggleAjustes={() => setMostrarAjustes(v => !v)}
                settings={settings}
                onAjusteChange={actualizarAjuste}
                onResetAjustes={() => { ajustesTocados.current = true; setSettings(resetSettings()); }}
                syncEstado={syncEstado}
                logo={logo}
                previewLabel={previewLabel || {
                    type: 'Regular',
                    protein: 'Fajitas de pollo',
                    expirationDate: formatExpirationDate(expirationDate) || '28 agosto'
                }}
            />

            {/* Fecha de producción y vencimiento */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={20} className="text-orange-500" aria-hidden="true" />
                        <span className="font-medium">Producción:</span>
                    </div>
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white cursor-pointer"
                    >
                        <option value={selectedDate}>
                            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </option>
                        {availableDates.filter(d => d !== selectedDate).map(date => (
                            <option key={date} value={date}>
                                {new Date(`${date}T12:00:00`).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Vence:</span>
                        <input
                            type="date"
                            value={expirationDate}
                            min={selectedDate}
                            onChange={(e) => setExpirationDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                            aria-label="Fecha de vencimiento del lote"
                        />
                        {expirationDate && (
                            <span className="text-sm font-semibold text-gray-700">
                                “Vence {formatExpirationDate(expirationDate)}”
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setSelectedDate(d => d)}
                        className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                        {loading ? 'Cargando…' : 'Actualizar'}
                    </button>
                </div>

                {!expirationDate && (
                    <p className="text-sm text-amber-700 mt-4 font-medium">
                        Elegí la fecha de vencimiento antes de preparar el lote: va impresa en cada etiqueta.
                    </p>
                )}
            </div>

            {loadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-800">{loadError}</p>
                </div>
            )}

            {/* Avisos del cálculo */}
            {batch.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <p className="font-bold text-amber-900 flex items-center gap-2">
                        <AlertTriangle size={18} aria-hidden="true" />
                        Revisá esto antes de imprimir
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-amber-900">
                        {batch.warnings.map((w, i) => (
                            <li key={i}>• <strong>{w.cliente}</strong> — {w.detalle}</li>
                        ))}
                    </ul>
                </div>
            )}

            {batch.fusionados.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-900">
                    <p className="font-bold">
                        {batch.fusionados.length} pedido{batch.fusionados.length > 1 ? 's' : ''} fusionado{batch.fusionados.length > 1 ? 's' : ''} con otro del mismo cliente
                    </p>
                    <ul className="mt-2 space-y-1">
                        {batch.fusionados.map((f, i) => (
                            <li key={i}>• <strong>{f.cliente}</strong>: {f.absorbido} quedó dentro de {f.conserva}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-blue-700">Es la misma fusión que aplica la hoja de producción.</p>
                </div>
            )}

            {/* Resumen + acción principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Pedidos', value: batch.totalOrders, icon: Users },
                            { label: 'Proteínas distintas', value: batch.groups.length, icon: Tag },
                            { label: 'Etiquetas totales', value: batch.totalLabels, icon: Printer },
                            { label: 'Seleccionadas', value: totalSeleccionado, icon: CheckCircle, destacar: true }
                        ].map(stat => (
                            <div
                                key={stat.label}
                                className={`rounded-2xl p-4 border ${
                                    stat.destacar
                                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 border-transparent text-white shadow-lg shadow-orange-500/25'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <stat.icon
                                    size={16}
                                    className={stat.destacar ? 'text-white/80' : 'text-gray-400'}
                                    aria-hidden="true"
                                />
                                <p className={`text-3xl font-black mt-2 ${stat.destacar ? 'text-white' : 'text-gray-900'}`}>
                                    {stat.value}
                                </p>
                                <p className={`text-xs mt-0.5 ${stat.destacar ? 'text-white/80' : 'text-gray-500'}`}>
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Filtros por familia: al empacar importa si es pack,
                        desayuno o plato suelto, no el tipo de plan. */}
                    {batch.groups.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setFamiliaFiltro(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                                    familiaFiltro === null
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                Todo <span className="opacity-60">{batch.totalLabels}</span>
                            </button>

                            {[FAMILIA.PACK, FAMILIA.CENA, FAMILIA.DESAYUNO, FAMILIA.INDIVIDUAL].map(fam => (
                                <button
                                    key={fam}
                                    onClick={() => setFamiliaFiltro(fam === familiaFiltro ? null : fam)}
                                    disabled={conteoFamilias[fam] === 0}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                        familiaFiltro === fam
                                            ? 'bg-bikitchen-orange text-white'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {fam} <span className="opacity-60">{conteoFamilias[fam]}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {batch.groups.length > 0 && (
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500">
                                {selectedGroups.length} de {batch.groups.length} proteínas incluidas
                                {familiaFiltro && ' (el filtro solo cambia lo que ves)'}
                            </span>
                            <button
                                onClick={() => fijarTodos(true)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors text-xs"
                            >
                                Seleccionar todo
                            </button>
                            <button
                                onClick={() => fijarTodos(false)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors text-xs"
                            >
                                Quitar todo
                            </button>
                        </div>
                    )}

                    <LabelSectionList
                        secciones={porTipo}
                        hayGrupos={batch.groups.length > 0}
                        cargando={loading}
                        excluded={excluded}
                        onToggleSeccion={toggleSeccion}
                        onToggleGrupo={toggleGroup}
                        settings={settings}
                        logo={logo}
                        expirationDateTexto={formatExpirationDate(expirationDate) || '—'}
                        onPreview={setPreviewGroupId}
                        onReprint={reimprimir}
                        reprintQty={reprintQty}
                        onReprintQtyChange={(id, v) => setReprintQty(prev => ({ ...prev, [id]: v }))}
                        canReprint={!!expirationDate && impresoraLista && progress?.status !== JOB_STATUS.PROCESSING}
                    />
                </div>

                <PrintJobSidebar
                    previewLabel={previewLabel}
                    previewGroup={previewGroup}
                    settings={settings}
                    logo={logo}
                    totalSeleccionado={totalSeleccionado}
                    puedePreparar={
                        totalSeleccionado > 0 &&
                        !!expirationDate &&
                        impresoraLista &&
                        progress?.status !== JOB_STATUS.PROCESSING
                    }
                    onPreparar={() => setConfirming({ total: totalSeleccionado })}
                    progress={progress}
                    onCancelar={() => queueRef.current.cancel()}
                    jobLog={jobLog}
                />
            </div>

            {/* Confirmación antes de mandar el lote */}
            {confirming && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900">Confirmar lote</h3>
                        <div className="mt-4 space-y-2 text-sm text-gray-700">
                            <p className="flex justify-between"><span>Producción:</span> <strong>{selectedDate}</strong></p>
                            <p className="flex justify-between"><span>Vencimiento:</span> <strong>{formatExpirationDate(expirationDate)}</strong></p>
                            <p className="flex justify-between"><span>Grupos:</span> <strong>{selectedGroups.length}</strong></p>
                            <p className="flex justify-between text-base"><span>Etiquetas a enviar:</span> <strong>{confirming.total}</strong></p>
                        </div>
                        <p className={`mt-4 text-xs border rounded-lg p-3 ${modoReal ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                            {modoReal
                                ? `Se van a enviar a ${printerName} de a una etiqueta, esperando a que cada una salga. Va a tardar unos ${duracionEstimada(confirming.total)}. Tené listo el rollo y no cierres la pestaña.`
                                : 'Se va a recorrer la cola completa en modo simulación. No va a salir papel.'}
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setConfirming(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={prepararLote}
                                className="flex-1 py-2.5 rounded-xl bg-bikitchen-orange text-white font-bold hover:bg-bikitchen-orange-dark"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
