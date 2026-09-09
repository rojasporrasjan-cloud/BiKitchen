import React, { useState } from 'react';
import { X, UserPlus, AlertTriangle } from 'lucide-react';
import { revisarPedidoNuevo } from '../../utils/agregarPedidoDesdeLaHoja';

/**
 * Meter un cliente que falta en un pack, desde la hoja.
 *
 * Carlos H. Herrera no salio en la hoja del lunes porque se cargo con la
 * entrega ya pasada: Gina lo pidio la noche anterior y no habia forma de
 * meterlo sin salir de la hoja y llenar el formulario largo de Pedidos.
 *
 * Aca solo se pide lo que hace falta para COCINARLO. El telefono y lo demas se
 * completan despues; lo urgente es que entre a la olla.
 */
export default function AgregarClienteAlPack({ packName, fecha, onGuardar, onCerrar }) {
    const [cliente, setCliente] = useState('');
    const [zona, setZona] = useState('');
    const [telefono, setTelefono] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [nota, setNota] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const revision = revisarPedidoNuevo({ cliente, cantidad });

    const guardar = async () => {
        if (!revision.sePuede) return;
        setGuardando(true);
        setError(null);
        try {
            await onGuardar({ cliente, zona, telefono, cantidad: Number(cantidad), nota });
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
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <UserPlus size={18} aria-hidden="true" /> Agregar un cliente
                        </h3>
                        <p className="text-sm text-gray-500">{packName} · entrega {fecha}</p>
                    </div>
                    <button
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="p-2 -m-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <label className="block">
                        <span className="text-sm font-bold text-gray-800">Nombre del cliente</span>
                        <input
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                            placeholder="Ej: Carlos H. Herrera"
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-sm font-bold text-gray-800">Cuántos packs</span>
                            <input
                                type="number"
                                min="1"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-gray-800">Zona de entrega</span>
                            <input
                                value={zona}
                                onChange={(e) => setZona(e.target.value)}
                                placeholder="Ej: Ciudad Colón"
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm font-bold text-gray-800">
                            Teléfono <span className="font-normal text-gray-500">— se puede dejar vacío</span>
                        </span>
                        <input
                            type="tel"
                            inputMode="numeric"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            placeholder="8360 3626"
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-bold text-gray-800">Especificaciones</span>
                        <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            rows={3}
                            placeholder="Ej: NO VAINICAS. · Cambiar zuchinnis por coleslaw."
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </label>

                    {!revision.sePuede && cliente !== '' && (
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

                <div className="flex flex-wrap gap-3 p-5 border-t border-gray-100">
                    <button
                        onClick={onCerrar}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={guardar}
                        disabled={!revision.sePuede || guardando}
                        className="ml-auto px-5 py-2.5 rounded-xl bg-bikitchen-orange text-white font-bold text-sm hover:bg-bikitchen-orange-dark disabled:opacity-40"
                    >
                        {guardando ? 'Guardando…' : 'Agregarlo a la hoja'}
                    </button>
                </div>
            </div>
        </div>
    );
}
