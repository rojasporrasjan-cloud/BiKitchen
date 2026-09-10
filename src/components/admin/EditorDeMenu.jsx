import React, { useState } from 'react';
import { X, Save, AlertTriangle, Users } from 'lucide-react';
import { revisarMenuEditado } from '../../utils/guardarMenuDeLaHoja';

/**
 * Corregir el menu de la semana sin salir de la hoja de produccion.
 *
 * Un menu equivocado cuesta igual que un pedido equivocado, pero arreglarlo
 * obligaba a salir de la hoja, ir a Menus y buscar cual de los catorce era.
 *
 * A DIFERENCIA de editar un pedido, esto cambia lo que come TODA la gente que
 * lleva ese pack. Por eso arriba dice a cuantos afecta y el boton lo repite: no
 * es lo mismo corregirle la nota a una persona que cambiarle el almuerzo a
 * quince.
 */
export default function EditorDeMenu({
    familia, titulo, esCena = false, platosIniciales = [], cuantosClientes = 0,
    onGuardar, onCerrar
}) {
    const [platos, setPlatos] = useState(
        platosIniciales.map(p => ({ ...p }))
    );
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const revision = revisarMenuEditado(platos);
    const cambio = JSON.stringify(platos) !== JSON.stringify(platosIniciales);

    const cambiar = (i, campo, valor) => {
        setPlatos(prev => prev.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
    };

    const guardar = async () => {
        if (!revision.sePuede) return;
        setGuardando(true);
        setError(null);
        try {
            await onGuardar(platos);
            onCerrar();
        } catch (e) {
            setError(e?.message || 'No se pudo guardar. Revisá la conexión.');
        }
        setGuardando(false);
    };

    return (
        <div className="print:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {titulo}{esCena ? ' — Cena' : ''}
                        </h3>
                        <p className="text-sm text-gray-500">Menú de esta semana</p>
                    </div>
                    <button
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="p-2 -m-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Cambiar un menu no es como corregir un pedido: le cambia la
                    comida a todos los que llevan ese pack. Se dice antes, no
                    despues. */}
                <div className="mx-5 mt-4 rounded-xl bg-amber-50 border border-amber-300 p-3">
                    <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                        <Users size={15} aria-hidden="true" />
                        Esto le cambia la comida a {cuantosClientes > 0
                            ? `los ${cuantosClientes} pedidos que llevan este pack`
                            : 'todos los que llevan este pack'}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                        No es la nota de una persona: es el menú de la semana. Si solo hay que
                        cambiarle algo a un cliente, cerrá esto y arreglá su pedido.
                    </p>
                </div>

                <div className="p-5 space-y-4">
                    {platos.map((plato, i) => (
                        <div key={plato.numero || i} className="rounded-xl border border-gray-200 p-3">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
                                Plato {plato.numero || i + 1}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <label className="block">
                                    <span className="text-[11px] font-bold text-gray-600">Proteína</span>
                                    <input
                                        value={plato.proteina}
                                        onChange={(e) => cambiar(i, 'proteina', e.target.value)}
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-bold text-gray-600">Vegetales</span>
                                    <input
                                        value={plato.vegetal}
                                        onChange={(e) => cambiar(i, 'vegetal', e.target.value)}
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-bold text-gray-600">Carbohidrato</span>
                                    <input
                                        value={plato.carbo}
                                        onChange={(e) => cambiar(i, 'carbo', e.target.value)}
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}

                    {!revision.sePuede && (
                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                            {revision.problema}
                        </p>
                    )}
                    {error && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
                    <button
                        onClick={onCerrar}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Cerrar sin guardar
                    </button>
                    <button
                        onClick={guardar}
                        disabled={!cambio || !revision.sePuede || guardando}
                        className="ml-auto px-5 py-2.5 rounded-xl bg-bikitchen-orange text-white font-bold text-sm hover:bg-bikitchen-orange-dark disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                        <Save size={15} aria-hidden="true" />
                        {guardando ? 'Guardando…' : 'Guardar el menú de la semana'}
                    </button>
                </div>
            </div>
        </div>
    );
}
