import React from 'react';
import { totalesDeGastos } from '../../utils/gastos';
import { colones } from '../../utils/planilla';

/** En qué se fue la plata de la semana, de lo que más a lo que menos. */
export default function ResumenGastos({ gastos }) {
    const { porCategoria, total } = totalesDeGastos(gastos);
    if (total === 0) return null;
    const mayor = porCategoria[0].total;
    return (
        <section className="p-5 bg-white rounded-3xl shadow-sm ring-1 ring-black/5 lining-nums" aria-labelledby="titulo-resumen-gastos">
            <h2 id="titulo-resumen-gastos" className="text-lg font-black text-gray-900">En qué se fue la plata</h2>
            <ul className="mt-3 space-y-2.5">
                {porCategoria.map(c => (
                    <li key={c.id}>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-gray-800"><span aria-hidden="true">{c.emoji}</span> {c.nombre}</span>
                            <span className="font-black text-gray-900">
                                {colones(c.total)} <span className="text-xs font-semibold text-gray-400">{Math.round((c.total / total) * 100)} %</span>
                            </span>
                        </div>
                        <div className="h-2 mt-1 bg-gray-100 rounded-full" aria-hidden="true">
                            <div className="h-2 bg-bikitchen-orange rounded-full" style={{ width: `${Math.max(3, (c.total / mayor) * 100)}%` }} />
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
