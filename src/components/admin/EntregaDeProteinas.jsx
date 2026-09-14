import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ClipboardPaste, Copy, RotateCcw, Save, Trash2 } from 'lucide-react';
import { leerListaDeProteinas } from '../../utils/proteinasPorEntrega';
import { imprimeEnHoja } from '../../utils/estadosPedido';

/**
 * Las proteínas de UNA entrega de un pack de proteínas, para elegirlas.
 *
 * Lo que se guarda es solo la lista de esa fecha. Las otras semanas del mismo
 * pack no se tocan, y la lista de la compra tampoco: es la de respaldo.
 */

const ESTADO = {
    elegida: { texto: 'Elegidas', clase: 'bg-green-100 text-green-800 border-green-200', Icono: CheckCircle2 },
    compra: { texto: 'Las de la compra', clase: 'bg-gray-100 text-gray-700 border-gray-200', Icono: CheckCircle2 },
    falta: { texto: 'Falta elegir', clase: 'bg-red-100 text-red-800 border-red-200', Icono: AlertTriangle }
};

const iguales = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export default function EntregaDeProteinas({ fila, listaSugerencias, onGuardar }) {
    const { pedido, cuantas, gramos, numero, total, origen, lista, anterior } = fila;

    // "Falta" arranca vacío a propósito: la lista de la compra casi seguro no
    // es la de esta semana, y precargarla invita a guardarla sin mirar.
    const inicial = origen === 'falta' ? [] : lista;
    const largo = Math.max(cuantas, inicial.length);
    const [valores, setValores] = useState(() => Array.from({ length: largo }, (_, i) => inicial[i] || ''));
    const [pegando, setPegando] = useState(false);
    const [pegado, setPegado] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const escritas = valores.map(v => v.trim()).filter(Boolean);
    // Lo que HOY está guardado para esta fecha: nada, si no se eligió.
    const guardada = origen === 'elegida' ? lista : [];
    const cambio = !iguales(escritas, guardada);
    const estado = ESTADO[origen];
    const zona = pedido.zona_envio && pedido.zona_envio !== 'No especificada' ? pedido.zona_envio : '';

    const poner = (nueva) => setValores(Array.from({ length: Math.max(cuantas, nueva.length) }, (_, i) => nueva[i] || ''));

    const guardar = async (listaFinal) => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar(listaFinal);
        } catch (e) {
            setError(e?.message || 'No se pudo guardar. Revisá la conexión e intentá de nuevo.');
        }
        setGuardando(false);
    };

    return (
        <article className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{pedido.cliente}</h3>
                    <p className="text-xs text-gray-500">
                        {pedido.plan}{gramos ? ` · ${gramos} c/u` : ''} · entrega {numero} de {total}{zona ? ` · ${zona}` : ''}
                    </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${estado.clase}`}>
                    <estado.Icono size={13} aria-hidden="true" />
                    {estado.texto}
                </span>
            </header>

            {!imprimeEnHoja(pedido) && (
                <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                    El pedido no está confirmado: aunque elijas las proteínas, no sale en la hoja hasta confirmarlo.
                </p>
            )}

            {pegando ? (
                <div className="mb-3">
                    <label htmlFor={`pegar-${pedido.id}-${fila.fecha}`} className="block text-xs font-bold text-gray-700 mb-1">
                        Pegá la lista de WhatsApp: una proteína por renglón ("x2" repite)
                    </label>
                    <textarea
                        id={`pegar-${pedido.id}-${fila.fecha}`}
                        value={pegado}
                        onChange={(e) => setPegado(e.target.value)}
                        rows={5}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder={'Tilapia empanizada\nPollo caribeño x2\nTortas de carne en salsa'}
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => { poner(leerListaDeProteinas(pegado)); setPegando(false); setPegado(''); }}
                            disabled={leerListaDeProteinas(pegado).length === 0}
                            className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold disabled:opacity-40"
                        >
                            Usar esta lista ({leerListaDeProteinas(pegado).length})
                        </button>
                        <button type="button" onClick={() => setPegando(false)} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700">
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <ol className="space-y-1.5 mb-3">
                    {valores.map((v, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span className="w-5 text-right text-xs font-bold text-gray-400" aria-hidden="true">{i + 1}</span>
                            <input
                                type="text"
                                value={v}
                                list={listaSugerencias}
                                onChange={(e) => setValores(valores.map((x, j) => (j === i ? e.target.value : x)))}
                                aria-label={`Proteína ${i + 1} de ${pedido.cliente}`}
                                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                placeholder="Escribí o elegí una proteína"
                            />
                        </li>
                    ))}
                </ol>
            )}

            <p className={`text-xs font-semibold mb-3 ${escritas.length === cuantas ? 'text-green-700' : 'text-amber-700'}`}>
                {escritas.length} de {cuantas} proteínas
                {escritas.length > cuantas && ' — hay más de las que lleva el pack'}
            </p>

            <div className="flex flex-wrap items-center gap-2">
                {!pegando && (
                    <button type="button" onClick={() => setPegando(true)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <ClipboardPaste size={13} aria-hidden="true" /> Pegar lista
                    </button>
                )}
                {anterior.length > 0 && (
                    <button type="button" onClick={() => poner(anterior)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <Copy size={13} aria-hidden="true" /> Repetir la semana anterior
                    </button>
                )}
                {origen === 'falta' && lista.length > 0 && (
                    <button type="button" onClick={() => poner(lista)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <RotateCcw size={13} aria-hidden="true" /> Poner las de la compra
                    </button>
                )}
                {origen === 'elegida' && (
                    <button
                        type="button"
                        onClick={() => guardar([])}
                        disabled={guardando}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                        title="Esta entrega vuelve a usar la lista de la compra"
                    >
                        <Trash2 size={13} aria-hidden="true" /> Quitar
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => guardar(escritas)}
                    disabled={!cambio || escritas.length === 0 || guardando || pegando}
                    className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bikitchen-orange text-white text-sm font-bold hover:bg-bikitchen-orange-dark disabled:opacity-40"
                >
                    <Save size={14} aria-hidden="true" />
                    {guardando ? 'Guardando…' : 'Guardar'}
                </button>
            </div>

            {error && (
                <p role="alert" className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
        </article>
    );
}
