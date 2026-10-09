import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { categoriaDe } from '../../data/gastos';
import { gastosPorDia } from '../../utils/gastos';
import { colones } from '../../utils/planilla';

/** Los gastos de la semana, día por día. Tocar el lápiz los carga arriba para corregirlos. */
const diaLargo = (fecha) => new Date(`${fecha}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace('septiembre', 'setiembre');

export default function ListaDeGastos({ gastos, soloVer, onEditar, onBorrar }) {
    const dias = gastosPorDia(gastos);
    if (dias.length === 0) {
        return <p className="p-6 bg-white rounded-3xl text-center text-gray-500 ring-1 ring-black/5">Todavía no hay gastos anotados esta semana.</p>;
    }
    return (
        <div className="space-y-4 lining-nums">
            {dias.map(({ fecha, lista, total }) => (
                <section key={fecha} className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 overflow-hidden" aria-label={diaLargo(fecha)}>
                    <h3 className="flex items-center justify-between px-5 py-3 bg-gray-50 text-sm font-black text-gray-700">
                        <span className="first-letter:uppercase">{diaLargo(fecha)}</span>
                        <span>{colones(total)}</span>
                    </h3>
                    <ul className="divide-y divide-gray-100">
                        {lista.map((g) => {
                            const c = categoriaDe(g.categoria);
                            return (
                                <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                                    <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-bold text-gray-900">{c.nombre}</span>
                                        <span className="block text-xs text-gray-500 truncate">
                                            {[g.que, g.proveedor, g.pago].filter(Boolean).join(' · ') || '—'}
                                        </span>
                                    </span>
                                    <span className="font-black text-gray-900 whitespace-nowrap">{colones(g.monto)}</span>
                                    {!soloVer && (
                                        <span className="flex">
                                            <button type="button" onClick={() => onEditar(g)} aria-label={`Corregir ${c.nombre} de ${colones(g.monto)}`}
                                                className="p-2 text-gray-400 hover:text-bikitchen-orange rounded-lg">
                                                <Pencil size={16} aria-hidden="true" />
                                            </button>
                                            <button type="button" onClick={() => onBorrar(g)} aria-label={`Borrar ${c.nombre} de ${colones(g.monto)}`}
                                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg">
                                                <Trash2 size={16} aria-hidden="true" />
                                            </button>
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}
