import React from 'react';
import {
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair,
    Sun, Moon, Gauge, RotateCcw, Printer, Check, Timer, AlertTriangle
} from 'lucide-react';
import LabelPreview from './LabelPreview';

/**
 * Calibración y diseño de la etiqueta.
 *
 * Todo se mueve con botones y se ve al instante en la vista previa: no hay
 * forma de calcular dónde cae el rollo dentro del cabezal de 48 mm, así que
 * se ajusta a ojo contra una etiqueta impresa. Escribir números a mano para
 * eso es incómodo, y es lo que se está reemplazando acá.
 */

const TAMANOS = [
    { label: '30 × 20', widthMm: 30, heightMm: 20 },
    { label: '40 × 30', widthMm: 40, heightMm: 30 },
    { label: '50 × 30', widthMm: 50, heightMm: 30 }
];

const PASO_FINO = 0.5;
const PASO_GRUESO = 2;

function BotonIcono({ onClick, title, children, disabled }) {
    return (
        <button
            onClick={onClick}
            title={title}
            aria-label={title}
            disabled={disabled}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30"
        >
            {children}
        </button>
    );
}

function Grupo({ titulo, children, extra }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{titulo}</h4>
                {extra}
            </div>
            {children}
        </div>
    );
}

export default function LabelCalibrator({
    settings,
    onChange,
    onReset,
    logo,
    previewLabel,
    onTestPrint,
    canPrint,
    printing,
    syncEstado = 'sin-confirmar'
}) {
    const mover = (campo, delta, min, max) => {
        const actual = Number(settings[campo]) || 0;
        const valor = Math.min(max, Math.max(min, Math.round((actual + delta) * 10) / 10));
        onChange(campo, valor);
    };

    const esTamano = (t) => settings.widthMm === t.widthMm && settings.heightMm === t.heightMm;

    return (
        <div className="mt-5 pt-5 border-t border-gray-200 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
            {/* Vista previa siempre a la vista mientras se ajusta */}
            <div className="flex flex-col items-center">
                <LabelPreview label={previewLabel} scale={4} settings={settings} logo={logo} />

                <button
                    onClick={onTestPrint}
                    disabled={!canPrint || printing}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                    <Printer size={16} aria-hidden="true" />
                    {printing ? 'Enviando…' : 'Probar esta etiqueta'}
                </button>

                {/* La calibración se guarda sola. Se distingue si además quedó
                    compartida: creer que se comparte cuando no, hace que otra
                    computadora imprima descalibrada sin que nadie lo sepa. */}
                {syncEstado === 'solo-local' ? (
                    <>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle size={14} aria-hidden="true" />
                            Guardada solo en esta computadora
                        </p>
                        <p className="text-[11px] text-gray-500 text-center mt-0.5 max-w-[220px]">
                            La base de datos rechazó guardarla para todos. Acá funciona igual, pero
                            otra computadora no la va a recibir.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                            <Check size={14} aria-hidden="true" />
                            {syncEstado === 'compartida'
                                ? 'Guardada para todas las computadoras'
                                : 'Calibración guardada'}
                        </p>
                        <p className="text-[11px] text-gray-400 text-center mt-0.5 max-w-[220px]">
                            Se guarda sola y se mantiene aunque cierres el navegador.
                        </p>
                    </>
                )}

                <button
                    onClick={onReset}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                    <RotateCcw size={13} aria-hidden="true" /> Volver a los valores de fábrica
                </button>
            </div>

            <div className="space-y-6">
                {/* ── Tamaño del rollo ── */}
                <Grupo titulo="Tamaño de la etiqueta">
                    <div className="flex flex-wrap items-center gap-2">
                        {TAMANOS.map(t => (
                            <button
                                key={t.label}
                                onClick={() => { onChange('widthMm', t.widthMm); onChange('heightMm', t.heightMm); }}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                    esTamano(t)
                                        ? 'bg-bikitchen-orange text-white border-bikitchen-orange'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {t.label} mm
                            </button>
                        ))}
                        <span className="text-xs text-gray-400 ml-1">o a la medida:</span>
                        {[['widthMm', 'ancho'], ['heightMm', 'alto']].map(([campo, etiqueta]) => (
                            <label key={campo} className="flex items-center gap-1 text-xs text-gray-500">
                                {etiqueta}
                                <input
                                    type="number" min="10" max="60"
                                    value={settings[campo]}
                                    onChange={(e) => onChange(campo, Number(e.target.value))}
                                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800"
                                />
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Medí una etiqueta con regla. Si el tamaño no coincide, nada va a quedar centrado.
                    </p>
                </Grupo>

                {/* ── Posición ── */}
                <Grupo
                    titulo="Posición sobre la etiqueta"
                    extra={
                        <span className="text-xs font-mono text-gray-500">
                            {settings.offsetXmm > 0 ? '+' : ''}{settings.offsetXmm} mm ·{' '}
                            {settings.offsetYmm > 0 ? '+' : ''}{settings.offsetYmm} mm
                        </span>
                    }
                >
                    <div className="flex items-center gap-6">
                        <div className="grid grid-cols-3 gap-1.5">
                            <div />
                            <BotonIcono onClick={() => mover('offsetYmm', -PASO_FINO, 0, 20)} title="Subir 0.5 mm">
                                <ArrowUp size={18} />
                            </BotonIcono>
                            <div />

                            <BotonIcono onClick={() => mover('offsetXmm', -PASO_FINO, -20, 20)} title="Mover 0.5 mm a la izquierda">
                                <ArrowLeft size={18} />
                            </BotonIcono>
                            <BotonIcono
                                onClick={() => { onChange('offsetXmm', 0); onChange('offsetYmm', 0); }}
                                title="Centrar"
                            >
                                <Crosshair size={16} />
                            </BotonIcono>
                            <BotonIcono onClick={() => mover('offsetXmm', PASO_FINO, -20, 20)} title="Mover 0.5 mm a la derecha">
                                <ArrowRight size={18} />
                            </BotonIcono>

                            <div />
                            <BotonIcono onClick={() => mover('offsetYmm', PASO_FINO, 0, 20)} title="Bajar 0.5 mm">
                                <ArrowDown size={18} />
                            </BotonIcono>
                            <div />
                        </div>

                        <div className="text-xs text-gray-500 space-y-2">
                            <p>Las flechas mueven medio milímetro por toque.</p>
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    onClick={() => mover('offsetXmm', -PASO_GRUESO, -20, 20)}
                                    className="px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 font-semibold"
                                >
                                    ← 2 mm
                                </button>
                                <button
                                    onClick={() => mover('offsetXmm', PASO_GRUESO, -20, 20)}
                                    className="px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 font-semibold"
                                >
                                    2 mm →
                                </button>
                                <button
                                    onClick={() => mover('offsetYmm', PASO_GRUESO, 0, 20)}
                                    className="px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 font-semibold"
                                >
                                    ↓ 2 mm
                                </button>
                            </div>
                            <p className="text-gray-400">
                                Hacia arriba solo se puede si antes se bajó: la impresora no puede
                                imprimir por encima del inicio de la etiqueta.
                            </p>
                        </div>
                    </div>
                </Grupo>

                {/* ── Oscuridad y velocidad ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Grupo titulo="Oscuridad" extra={<span className="text-xs font-mono text-gray-500">{settings.density} / 15</span>}>
                        <div className="flex items-center gap-2">
                            <BotonIcono onClick={() => mover('density', -1, 1, 15)} title="Más claro">
                                <Sun size={16} />
                            </BotonIcono>
                            <input
                                type="range" min="1" max="15" step="1"
                                value={settings.density}
                                onChange={(e) => onChange('density', Number(e.target.value))}
                                className="flex-1 accent-bikitchen-orange cursor-pointer"
                                aria-label="Oscuridad de la impresión"
                            />
                            <BotonIcono onClick={() => mover('density', 1, 1, 15)} title="Más oscuro">
                                <Moon size={16} />
                            </BotonIcono>
                        </div>
                    </Grupo>

                    <Grupo titulo="Velocidad" extra={<span className="text-xs font-mono text-gray-500">{settings.speed} / 5</span>}>
                        <div className="flex items-center gap-2">
                            <Gauge size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                            <input
                                type="range" min="1" max="5" step="1"
                                value={settings.speed}
                                onChange={(e) => onChange('speed', Number(e.target.value))}
                                className="flex-1 accent-bikitchen-orange cursor-pointer"
                                aria-label="Velocidad de impresión"
                            />
                            <span className="text-xs text-gray-400 w-16">
                                {settings.speed <= 2 ? 'nítida' : settings.speed >= 4 ? 'rápida' : 'media'}
                            </span>
                        </div>
                    </Grupo>
                </div>

                {/* ── Pausa entre etiquetas ── */}
                <Grupo
                    titulo="Pausa entre etiquetas"
                    extra={
                        <span className="text-xs font-mono text-gray-500">
                            {settings.interLabelDelayMs > 0
                                ? `${(settings.interLabelDelayMs / 1000).toFixed(1)} s`
                                : 'automática'}
                        </span>
                    }
                >
                    <div className="flex items-center gap-2">
                        <Timer size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                        <input
                            type="range" min="0" max="4000" step="250"
                            value={settings.interLabelDelayMs || 0}
                            onChange={(e) => onChange('interLabelDelayMs', Number(e.target.value))}
                            className="flex-1 accent-bikitchen-orange cursor-pointer"
                            aria-label="Pausa entre etiquetas"
                        />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                        La impresora necesita más de un segundo por etiqueta. Si mandás la siguiente
                        antes de que salga el papel, se pierde. En <strong>automática</strong> se
                        calcula según el alto. Si aún así falta alguna, subí la pausa.
                    </p>
                </Grupo>

                {/* ── Diseño ── */}
                <Grupo titulo="Qué lleva la etiqueta">
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {[
                            ['useLogo', 'Logo de BiKitchen'],
                            ['showTipo', 'Tipo de plan'],
                            ['showVence', 'Fecha de vencimiento'],
                            ['showDivider', 'Línea separadora']
                        ].map(([campo, etiqueta]) => (
                            <label key={campo} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!settings[campo]}
                                    onChange={(e) => onChange(campo, e.target.checked)}
                                    className="w-4 h-4 accent-bikitchen-orange cursor-pointer"
                                />
                                {etiqueta}
                            </label>
                        ))}
                    </div>

                    {!settings.useLogo && (
                        <label className="block mt-3">
                            <span className="text-xs text-gray-500">Texto de la marca</span>
                            <input
                                type="text"
                                value={settings.brandText}
                                onChange={(e) => onChange('brandText', e.target.value)}
                                placeholder="Dejalo vacío para no poner nada"
                                className="mt-1 w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </label>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                        {[
                            ['logoScale', settings.useLogo ? 'Tamaño del logo' : 'Tamaño de la marca'],
                            ['dishScale', 'Tamaño del nombre del plato']
                        ].map(([campo, etiqueta]) => (
                            <label key={campo} className="block">
                                <span className="text-xs text-gray-500">{etiqueta}</span>
                                <input
                                    type="range" min="0.6" max="1.4" step="0.05"
                                    value={settings[campo]}
                                    onChange={(e) => onChange(campo, Number(e.target.value))}
                                    className="mt-1 w-full accent-bikitchen-orange cursor-pointer"
                                />
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Si el nombre no cabe, se achica solo y parte en dos líneas. Nunca se sale de la etiqueta.
                    </p>
                </Grupo>
            </div>
        </div>
    );
}
