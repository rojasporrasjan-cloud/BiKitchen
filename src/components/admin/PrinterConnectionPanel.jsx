import React from 'react';
import { Printer, CheckCircle, XCircle, FlaskConical, Sliders } from 'lucide-react';
import LabelCalibrator from './LabelCalibrator';
import { webBluetoothDisponible, puedeReconectarSolo } from '../../services/printing/PhomemoM110Adapter';

/**
 * Panel de impresora: qué se va a usar, en qué estado está y cómo calibrarla.
 *
 * Vive aparte de PrinterView porque son dos cosas distintas: acá se decide CÓMO
 * se imprime, allá QUÉ se imprime. Juntas hacían un archivo de 945 líneas.
 */
export default function PrinterConnectionPanel({
    modoReal, onModoChange,
    printerName, conectando, printerError, recordada,
    onConectar,
    impresoraLista, testStatus, onImprimirPrueba,
    mostrarAjustes, onToggleAjustes,
    settings, onAjusteChange, onResetAjustes, syncEstado,
    logo, previewLabel
}) {
    return (
        <div className={`rounded-xl border-2 p-5 ${modoReal ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-300'}`}>
            <div className="flex flex-wrap items-center gap-3">
                <Printer size={20} className={modoReal ? 'text-gray-700' : 'text-amber-600'} aria-hidden="true" />
                <span className="font-bold text-gray-900">Impresora</span>

                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                    <button
                        onClick={() => onModoChange(false)}
                        className={`px-4 py-2 font-semibold transition-colors ${!modoReal ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        Simulación
                    </button>
                    <button
                        onClick={() => onModoChange(true)}
                        disabled={!webBluetoothDisponible()}
                        className={`px-4 py-2 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${modoReal ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        Phomemo M110
                    </button>
                </div>

                {modoReal && (
                    printerName ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                            <CheckCircle size={16} aria-hidden="true" /> {printerName}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onConectar(false)}
                                disabled={conectando}
                                className="px-4 py-2 rounded-lg bg-bikitchen-orange text-white text-sm font-bold hover:bg-bikitchen-orange-dark transition-colors disabled:opacity-50"
                            >
                                {conectando
                                    ? 'Conectando…'
                                    : (recordada ? `Reconectar ${recordada}` : 'Conectar impresora')}
                            </button>
                            <button
                                onClick={() => onConectar(true)}
                                disabled={conectando}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                No aparece
                            </button>
                        </div>
                    )
                )}

                <button
                    onClick={onToggleAjustes}
                    className="ml-auto px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
                >
                    <Sliders size={15} aria-hidden="true" /> Calibrar
                </button>

                <button
                    onClick={onImprimirPrueba}
                    disabled={!impresoraLista || testStatus?.estado === 'enviando'}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                    {testStatus?.estado === 'enviando' ? 'Enviando…' : 'Imprimir etiqueta de prueba'}
                </button>
            </div>

            {mostrarAjustes && (
                <LabelCalibrator
                    settings={settings}
                    onChange={onAjusteChange}
                    onReset={onResetAjustes}
                    logo={logo}
                    previewLabel={previewLabel}
                    onTestPrint={onImprimirPrueba}
                    canPrint={impresoraLista}
                    printing={testStatus?.estado === 'enviando'}
                    syncEstado={syncEstado}
                />
            )}

            {!modoReal && (
                <p className="text-sm text-amber-900 mt-3 flex items-start gap-2">
                    <FlaskConical size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                        <strong>Modo simulación — no sale papel.</strong> Todo el flujo se recorre
                        completo pero no se envía nada a una impresora física. El cálculo de
                        cantidades sí es real y sale de los pedidos.
                    </span>
                </p>
            )}

            {modoReal && !webBluetoothDisponible() && (
                <p className="text-sm text-red-700 mt-3">
                    Este navegador no soporta Web Bluetooth. Abrí el panel en Chrome o Edge.
                </p>
            )}

            {modoReal && printerName && (
                <p className="text-xs text-gray-500 mt-3">
                    La impresora no informa si el papel salió bien: lo único que podemos confirmar
                    es que aceptó los datos. Revisá siempre la etiqueta física.
                </p>
            )}

            {/* Sin la opción de Chrome activada, recargar obliga a autorizar
                la impresora otra vez. Se explica acá para no adivinar. */}
            {modoReal && !printerName && recordada && !puedeReconectarSolo() && (
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    Para que se reconecte sola al recargar, activá una vez en Chrome:{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                        chrome://flags/#enable-web-bluetooth-new-permissions-backend
                    </code>{' '}
                    → <strong>Enabled</strong> y reiniciá el navegador. Mientras tanto, es un clic.
                </p>
            )}

            {printerError && (
                <p className="text-sm text-red-700 mt-3 flex items-start gap-2">
                    <XCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {printerError}
                </p>
            )}

            {testStatus?.estado === 'enviada' && (
                <p className="text-sm mt-3 font-semibold text-green-700 flex items-start gap-2">
                    <CheckCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {testStatus.simulada
                        ? 'Simulación completada — no se envió a ninguna impresora física.'
                        : 'La impresora aceptó la etiqueta. Revisá si salió bien impresa.'}
                </p>
            )}

            {testStatus?.estado === 'error' && (
                <p className="text-sm mt-3 font-semibold text-red-700 flex items-start gap-2">
                    <XCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {testStatus.mensaje}
                </p>
            )}

            {/* Diagnóstico: sin esto, "no funciona" no dice en qué punto falla */}
            {modoReal && testStatus && testStatus.estado !== 'enviando' && (
                <div className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700">
                    <p>
                        Bytes enviados: <strong>{testStatus.bytes ?? 0}</strong> (deberían ser 7680)
                        {' · '}
                        Respuestas de la impresora: <strong>{testStatus.respuestas?.length ?? 0}</strong>
                    </p>
                    {testStatus.respuestas?.length > 0 ? (
                        <p className="mt-1 font-mono text-[11px] text-gray-500">
                            {testStatus.respuestas.slice(0, 6).join('  |  ')}
                            {testStatus.respuestas.length > 6 ? ' …' : ''}
                        </p>
                    ) : (
                        <p className="mt-1 text-amber-700">
                            La impresora no contestó nada. Si además no salió papel, apagala y
                            encendela, y volvé a conectar.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
