import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { colones, duracion, horaCR, iniciales } from '../../utils/planilla';

/**
 * La semana de lunes a domingo: horas y plata de cada persona por día.
 * Tocar un día abre el detalle para ver las marcas o corregir un olvido.
 * Hoy, quien sigue adentro sale "En turno" (no es un olvido: todavía trabaja).
 */
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const ESTILOS = {
    turno: 'bg-sky-50 ring-1 ring-sky-200 hover:bg-sky-100',
    aviso: 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100',
    vacio: 'hover:bg-gray-100',
    ok: 'bg-emerald-50 hover:bg-emerald-100'
};

const estadoDe = (dia) => {
    if (dia.enTurno) return 'turno';
    if (dia.avisos.length) return 'aviso';
    if (dia.marcas.length === 0) return 'vacio';
    return 'ok';
};

const Celda = ({ dia }) => {
    const estado = estadoDe(dia);
    if (estado === 'vacio') return <span className="block py-2 text-gray-300">—</span>;
    if (estado === 'turno') {
        return (
            <>
                <span className="flex items-center justify-center gap-1.5 font-bold text-sky-700">
                    <span className="w-2 h-2 bg-sky-500 rounded-full" aria-hidden="true" /> En turno
                </span>
                <span className="block text-xs font-semibold text-sky-600">desde {horaCR(dia.enTurno)}</span>
            </>
        );
    }
    if (estado === 'aviso') {
        return (
            <>
                <span className="flex items-center justify-center gap-1 font-bold text-amber-700">
                    <AlertTriangle size={13} aria-hidden="true" /> Revisar
                </span>
                <span className="block text-xs font-semibold text-amber-600">{dia.minutos ? duracion(dia.minutos) : 'falta marca'}</span>
            </>
        );
    }
    return (
        <>
            <span className="block font-bold text-gray-900">{duracion(dia.minutos)}</span>
            <span className="block text-xs font-bold text-emerald-700">{colones(dia.monto)}</span>
        </>
    );
};

export default function TablaSemanal({ planilla, dias, hoy, onElegirDia }) {
    const totalDelDia = (fecha) => planilla.reduce((s, p) => s + (p.porDia[fecha]?.monto || 0), 0);
    const totalSemana = planilla.reduce((s, p) => s + p.totalMonto, 0);

    if (planilla.length === 0) return null;

    return (
        <section className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden" aria-labelledby="titulo-semana">
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
                <div>
                    <h2 id="titulo-semana" className="text-lg font-black text-gray-900">Horas y salario por día</h2>
                    <p className="text-sm text-gray-500">Tocá un día para ver las marcas o corregir una que se olvidó.</p>
                </div>
                <ul className="flex flex-wrap gap-3 text-xs font-semibold text-gray-500" aria-label="Qué significa cada color">
                    <li className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-100 rounded" aria-hidden="true" /> Trabajado</li>
                    <li className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-100 ring-1 ring-sky-300 rounded" aria-hidden="true" /> En turno</li>
                    <li className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-100 ring-1 ring-amber-300 rounded" aria-hidden="true" /> Falta una marca</li>
                </ul>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm lining-nums tabular-nums">
                    <thead>
                        <tr className="bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-500">
                            <th scope="col" className="sticky left-0 z-10 px-5 py-3 text-left bg-gray-50">Persona</th>
                            {dias.map((fecha, i) => (
                                <th key={fecha} scope="col" className="px-1 py-3 text-center">
                                    <span className={fecha === hoy ? 'px-2.5 py-1 bg-bikitchen-orange text-white rounded-full' : ''}>
                                        {DIAS[i]} {Number(fecha.slice(8))}
                                    </span>
                                </th>
                            ))}
                            <th scope="col" className="px-5 py-3 text-right bg-orange-50 text-bikitchen-orange">Semana</th>
                        </tr>
                    </thead>
                    <tbody>
                        {planilla.map(({ empleado, porDia, totalMinutos, totalMonto }) => (
                            <tr key={empleado.id} className="border-t border-gray-100">
                                <th scope="row" className="sticky left-0 z-10 px-3 sm:px-5 py-2.5 text-left font-normal bg-white">
                                    <span className="flex items-center gap-3">
                                        <span className={`flex items-center justify-center shrink-0 w-9 h-9 rounded-full ${tonoDe(empleado.color).solido} text-white text-xs font-black`}
                                            aria-hidden="true">
                                            {iniciales(empleado.nombre)}
                                        </span>
                                        <span>
                                            <span className="block font-bold text-gray-900 whitespace-nowrap">{empleado.nombre}</span>
                                            <span className="block text-xs text-gray-500">{colones(empleado.tarifaHora)} la hora</span>
                                        </span>
                                    </span>
                                </th>
                                {dias.map(fecha => {
                                    const dia = porDia[fecha];
                                    return (
                                        <td key={fecha} className="px-1 py-1.5">
                                            <button type="button" onClick={() => onElegirDia(empleado, fecha)}
                                                aria-label={`${empleado.nombre}, ${fecha}: ${dia.enTurno ? 'en turno' : duracion(dia.minutos)}${dia.avisos.length ? ', falta una marca' : ''}`}
                                                className={`w-full min-h-[3.25rem] px-2 py-1.5 rounded-xl text-center whitespace-nowrap lining-nums tabular-nums transition-colors ${ESTILOS[estadoDe(dia)]}`}>
                                                <Celda dia={dia} />
                                            </button>
                                        </td>
                                    );
                                })}
                                <td className="px-5 py-2.5 text-right bg-orange-50/60">
                                    <span className="block text-base font-black text-gray-900">{colones(totalMonto)}</span>
                                    <span className="block text-xs text-gray-500">{duracion(totalMinutos)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <th scope="row" className="sticky left-0 z-10 px-3 sm:px-5 py-3 text-left font-black text-gray-900 bg-gray-50">Total del día</th>
                            {dias.map(fecha => (
                                <td key={fecha} className="px-1 py-3 text-center text-xs font-bold text-gray-700">
                                    {totalDelDia(fecha) ? colones(totalDelDia(fecha)) : <span className="text-gray-300">—</span>}
                                </td>
                            ))}
                            <td className="px-5 py-3 text-right text-lg font-black text-white bg-bikitchen-orange">{colones(totalSemana)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
    );
}
