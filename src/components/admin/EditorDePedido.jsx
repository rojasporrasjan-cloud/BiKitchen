import React, { useState } from 'react';
import { X, Save, Ban, AlertTriangle } from 'lucide-react';

/**
 * Arreglar un pedido SIN salir de la hoja de produccion.
 *
 * A las nueve de la noche, cuando la hoja sale mal, hoy hay que irse a buscar el
 * dato a otra pantalla —¿pedidos? ¿menus?— o rehacerla a mano, que fue lo que
 * termino haciendo la prima de Gina. Esto arregla el pedido ahi mismo.
 *
 * LO QUE SE EDITA ES EL PEDIDO, NO LA HOJA. La hoja se vuelve a armar sola con
 * el dato corregido. Si se editara una copia de la hoja, el arreglo duraria una
 * noche —el pedido seguiria mal la semana entrante— y, peor, las etiquetas y el
 * Excel saldrian de los datos viejos: se cocinaria una cosa y la etiqueta diria
 * otra. Eso no se ve hasta que el cliente abre la bolsa.
 *
 * Cancelar en vez de borrar: queda el rastro y se puede revertir. Nadie deberia
 * poder destruir un pedido sin querer a las nueve de la noche.
 */
export default function EditorDePedido({ pedido, onGuardar, onCancelarPedido, onCerrar }) {
    const proteinasIniciales = (pedido?.proteinas || []).join('\n');
    const [notas, setNotas] = useState(pedido?.observaciones || '');
    const [proteinas, setProteinas] = useState(proteinasIniciales);
    const [guardando, setGuardando] = useState(false);
    const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
    const [error, setError] = useState(null);

    if (!pedido) return null;

    const cuantasPide = pedido.cuantasProteinas || 0;
    const listaProteinas = proteinas.split('\n').map(s => s.trim()).filter(Boolean);
    const cambio = notas !== (pedido.observaciones || '') || proteinas !== proteinasIniciales;

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar({
                observaciones: notas,
                proteinas: cuantasPide ? listaProteinas : null
            });
            onCerrar();
        } catch (e) {
            setError(e?.message || 'No se pudo guardar. Revisá la conexión.');
        }
        setGuardando(false);
    };

    return (
        <div className="print:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{pedido.cliente}</h3>
                        <p className="text-sm text-gray-500">{pedido.plan}</p>
                    </div>
                    <button
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="p-2 -m-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {cuantasPide > 0 && (
                        <div>
                            <label htmlFor="proteinas-pedido" className="block text-sm font-bold text-gray-800">
                                Las {cuantasPide} proteínas que eligió
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5 mb-2">
                                Una por línea, como se llaman en el menú.
                            </p>
                            <textarea
                                id="proteinas-pedido"
                                value={proteinas}
                                onChange={(e) => setProteinas(e.target.value)}
                                rows={Math.max(cuantasPide, 3)}
                                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                placeholder={'Pollo a la naranja\nCarne molida en salsa criolla\nFajitas de cerdo'}
                            />
                            {/* Repetir la misma proteina es casi siempre un dedazo al cargar:
                                a Diana Gonzalez le quedaron tres "Milanesa de pollo" y se le
                                iban a cocinar tres veces lo mismo. */}
                            {listaProteinas.length > 0
                                && new Set(listaProteinas.map(s => s.toLowerCase())).size < listaProteinas.length && (
                                <p className="mt-1.5 text-xs text-amber-700 flex items-start gap-1.5">
                                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    Hay proteínas repetidas. Si es a propósito está bien, pero
                                    revisá que no sea un error de carga.
                                </p>
                            )}
                            <p className={`mt-1 text-xs font-semibold ${
                                listaProteinas.length === cuantasPide ? 'text-green-700' : 'text-amber-700'
                            }`}>
                                {listaProteinas.length} de {cuantasPide} escritas
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="notas-pedido" className="block text-sm font-bold text-gray-800">
                            Especificaciones
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5 mb-2">
                            Lo que hay que tener en cuenta al cocinar o empacar. Sale impreso en la hoja.
                        </p>
                        <textarea
                            id="notas-pedido"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            placeholder="Ej: NO VAINICAS. · Cambiar zuchinnis por ensalada coleslaw."
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 p-5 border-t border-gray-100">
                    {!confirmandoCancelar ? (
                        <button
                            onClick={() => setConfirmandoCancelar(true)}
                            className="px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-700 font-semibold text-sm hover:bg-red-50 inline-flex items-center gap-1.5"
                        >
                            <Ban size={15} aria-hidden="true" /> Cancelar este pedido
                        </button>
                    ) : (
                        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-sm font-bold text-red-900">
                                ¿Sacar este pedido de la hoja?
                            </p>
                            <p className="text-xs text-red-800 mt-1 mb-2.5">
                                No se borra: queda cancelado y se puede volver a activar desde
                                Pedidos. Deja de cocinarse y de imprimirse.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfirmandoCancelar(false)}
                                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white"
                                >
                                    No
                                </button>
                                <button
                                    onClick={async () => { await onCancelarPedido(); onCerrar(); }}
                                    className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-bold"
                                >
                                    Sí, sacarlo
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={guardar}
                        disabled={!cambio || guardando}
                        className="ml-auto px-5 py-2.5 rounded-xl bg-bikitchen-orange text-white font-bold text-sm hover:bg-bikitchen-orange-dark disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                        <Save size={15} aria-hidden="true" />
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
