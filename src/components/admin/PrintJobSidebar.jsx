import React from 'react';
import { CheckCircle, History } from 'lucide-react';
import LabelPreview from './LabelPreview';
import { JOB_STATUS } from '../../services/printing/printQueue';

/**
 * Columna derecha de la pantalla de etiquetas: cómo va a quedar la etiqueta,
 * el botón que manda el lote, cómo avanza la cola y qué se imprimió antes.
 *
 * Son las tres cosas que se miran mientras la impresora trabaja, así que van
 * juntas y separadas del listado de proteínas.
 */
export default function PrintJobSidebar({
    previewLabel, previewGroup, settings, logo,
    totalSeleccionado, puedePreparar, onPreparar,
    progress, onCancelar,
    jobLog
}) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Vista previa</h3>
                {previewLabel ? (
                    <div className="flex flex-col items-center">
                        <LabelPreview label={previewLabel} scale={3} settings={settings} logo={logo} />
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            {previewGroup.tipo} · {previewGroup.cantidad} etiqueta{previewGroup.cantidad !== 1 ? 's' : ''}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Elegí un grupo para verlo.</p>
                )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <button
                    onClick={onPreparar}
                    disabled={!puedePreparar}
                    className="w-full py-3.5 bg-bikitchen-orange text-white font-bold rounded-xl hover:bg-bikitchen-orange-dark active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Preparar {totalSeleccionado} etiqueta{totalSeleccionado !== 1 ? 's' : ''}
                </button>

                {progress && (
                    <div className="mt-5">
                        <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
                            <span>Procesadas {progress.processed} de {progress.total}</span>
                            <span>Faltan {progress.pending}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-bikitchen-orange transition-all duration-150"
                                style={{ width: `${progress.total ? (progress.processed / progress.total) * 100 : 0}%` }}
                            />
                        </div>

                        <div className="mt-3 text-sm">
                            {progress.status === JOB_STATUS.PROCESSING && (
                                <p className="text-gray-700 font-semibold">
                                    {progress.isSimulated ? 'Simulando impresión…' : 'Imprimiendo…'}
                                </p>
                            )}
                            {progress.status === JOB_STATUS.COMPLETED && (
                                <>
                                    <p className="text-green-700 font-semibold flex items-start gap-1.5">
                                        <CheckCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                                        {progress.isSimulated
                                            ? 'Simulación completada — no se enviaron etiquetas a una impresora física.'
                                            : `Se enviaron las ${progress.processed} etiquetas.`}
                                    </p>

                                    {/* La impresora no avisa si el papel salió bien, así que
                                        el conteo lo tiene que hacer una persona. */}
                                    {!progress.isSimulated && (
                                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-xs text-amber-900 font-semibold">
                                                Contá las etiquetas que salieron.
                                            </p>
                                            <p className="text-xs text-amber-800 mt-1">
                                                Deberían ser <strong>{progress.processed}</strong>. Si falta alguna
                                                o salió cortada, reimprimí solo esa desde su tarjeta y subí la
                                                pausa entre etiquetas en <strong>Calibrar</strong>.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                            {progress.status === JOB_STATUS.CANCELLED && (
                                <p className="text-gray-600 font-semibold">Cancelado.</p>
                            )}
                            {progress.status === JOB_STATUS.ERROR && (
                                <p className="text-red-700 font-semibold">{progress.error}</p>
                            )}
                        </div>

                        {progress.status === JOB_STATUS.PROCESSING && (
                            <button
                                onClick={onCancelar}
                                className="mt-3 w-full py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <History size={18} className="text-gray-400" aria-hidden="true" />
                    Historial
                </h3>
                {jobLog.length === 0 ? (
                    <p className="text-sm text-gray-400">Todavía no se ha preparado ningún lote.</p>
                ) : (
                    <ul className="space-y-2 max-h-72 overflow-y-auto">
                        {jobLog.slice(0, 20).map(job => (
                            <li key={job.id} className="text-xs border-b border-gray-100 pb-2 last:border-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-gray-800">
                                        {job.quantity} etiqueta{job.quantity !== 1 ? 's' : ''}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full font-bold ${job.simulated ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {job.simulated ? 'SIMULACIÓN' : 'REAL'}
                                    </span>
                                </div>
                                <p className="text-gray-500 mt-0.5">
                                    {job.kind} · {job.status} · {job.productionDate}
                                </p>
                                <p className="text-gray-400">
                                    {new Date(job.timestamp).toLocaleString('es-CR', {
                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                    {job.detail ? ` · ${job.detail}` : ''}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
