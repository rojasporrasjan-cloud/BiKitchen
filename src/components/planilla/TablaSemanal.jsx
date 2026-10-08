import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { colones, duracion, iniciales } from '../../utils/planilla';

/**
 * La semana de lunes a domingo: horas y plata de cada persona por día.
 * Tocar un día abre el detalle para ver las marcas o corregir un olvido.
 */
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function TablaSemanal({ planilla, dias, hoy, onElegirDia }) {
    const totalDelDia = (fecha) => planilla.reduce((s, p) => s + (p.porDia[fecha]?.monto || 0), 0);
    const totalSemana = planilla.reduce((s, p) => s + p.totalMonto, 0);

    if (planilla.length === 0) return null;

    return (
        <section className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden" aria-labelledby="titulo-semana">
            <h2 id="titulo-semana" className="px-5 pt-5 text-lg font-black text-gray-900">Horas y salario por día</h2>
            <p className="px-5 text-sm text-gray-600">Tocá un día para ver las marcas o corregir una que se olvidó.</p>
            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-500">
                            <th scope="col" className="px-5 py-2">Persona</th>
                            {dias.map((fecha, i) => (
                                <th key={fecha} scope="col" className={`px-2 py-2 text-center ${fecha === hoy ? 'text-bikitchen-orange' : ''}`}>
                                    {DIAS[i]} {Number(fecha.slice(8))}
                                </th>
                            ))}
                            <th scope="col" className="px-5 py-2 text-right">Semana</th>
                        </tr>
                    </thead>
                    <tbody>
                        {planilla.map(({ empleado, porDia, totalMinutos, totalMonto }) => (
                            <tr key={empleado.id} className="border-t border-gray-100">
                                <th scope="row" className="px-5 py-3 text-left font-normal">
                                    <span className="flex items-center gap-2">
                                        <span className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full ${tonoDe(empleado.color).solido} text-white text-xs font-black`}
                                            aria-hidden="true">
                                            {iniciales(empleado.nombre)}
                                        </span>
                                        <span>
                                            <span className="block font-bold text-gray-900">{empleado.nombre}</span>
                                            <span className="block text-xs text-gray-500">{colones(empleado.tarifaHora)}/h</span>
                                        </span>
                                    </span>
                                </th>
                                {dias.map(fecha => {
                                    const dia = porDia[fecha];
                                    const conAviso = dia.avisos.length > 0;
                                    const vacio = dia.marcas.length === 0;
                                    return (
                                        <td key={fecha} className="px-1 py-2">
                                            <button type="button" onClick={() => onElegirDia(empleado, fecha)}
                                                aria-label={`${empleado.nombre}, ${fecha}: ${duracion(dia.minutos)}${conAviso ? ', falta corregir' : ''}`}
                                                className={`w-full px-2 py-2 rounded-xl text-center transition-colors ${conAviso
                                                    ? 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100'
                                                    : vacio ? 'text-gray-300 hover:bg-gray-50' : 'bg-emerald-50/60 hover:bg-emerald-50'} ${fecha === hoy ? 'outline outline-2 outline-orange-200' : ''}`}>
                                                {conAviso && <AlertTriangle size={13} className="inline mb-0.5 text-amber-600" aria-hidden="true" />}
                                                <span className="block font-bold text-gray-900">{vacio ? '·' : duracion(dia.minutos)}</span>
                                                {dia.monto > 0 && <span className="block text-xs font-semibold text-emerald-700">{colones(dia.monto)}</span>}
                                            </button>
                                        </td>
                                    );
                                })}
                                <td className="px-5 py-2 text-right">
                                    <span className="block font-black text-gray-900">{colones(totalMonto)}</span>
                                    <span className="block text-xs text-gray-500">{duracion(totalMinutos)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <th scope="row" className="px-5 py-3 text-left font-black text-gray-900">Total</th>
                            {dias.map(fecha => (
                                <td key={fecha} className="px-1 py-3 text-center text-xs font-bold text-gray-700">
                                    {totalDelDia(fecha) ? colones(totalDelDia(fecha)) : '—'}
                                </td>
                            ))}
                            <td className="px-5 py-3 text-right text-base font-black text-bikitchen-orange">{colones(totalSemana)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
    );
}
