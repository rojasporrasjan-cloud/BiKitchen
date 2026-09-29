import React from 'react';

/**
 * Un pack en la lista de Gina: quién, qué pack, en qué semana va (con una
 * barrita de entregas) y cuándo es la próxima o la última.
 */

const fechaCorta = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
        .replace(/\./g, '').replace('sept', 'set');
};

const cuandoEsLaUltima = (r) => {
    const d = r.diasParaLaUltima;
    if (d === null || d === undefined) return '';
    if (d < 0) return `Terminó el ${fechaCorta(r.ultima)}`;
    if (d === 0) return 'Su última es HOY';
    if (d === 1) return 'Su última es mañana';
    return `Su última: ${fechaCorta(r.ultima)}`;
};

export default function TarjetaDePack({ pack, modo = 'curso' }) {
    const hechas = pack.finalizado ? pack.total : Math.max(0, pack.semanaActual - 1);
    const esUltima = !pack.finalizado && pack.leQuedan <= 1;

    return (
        <li className="p-4 bg-white rounded-2xl border border-orange-100 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-black text-gray-900 leading-tight">{pack.cliente}</p>
                    <p className="mt-0.5 text-sm text-gray-500 font-semibold truncate">
                        {pack.pack}{pack.zona ? ` · ${pack.zona}` : ''}
                    </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                    {esUltima && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-black uppercase tracking-wide">Última</span>}
                    {pack.sinPagar && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black uppercase tracking-wide">Sin pagar</span>}
                </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 flex gap-1" role="img" aria-label={pack.etiqueta}>
                    {Array.from({ length: pack.total }, (_, i) => (
                        <span
                            key={i}
                            className={`h-2 flex-1 rounded-full ${i < hechas ? 'bg-bikitchen-orange' : i === hechas && !pack.finalizado ? 'bg-orange-300' : 'bg-orange-100'}`}
                        />
                    ))}
                </div>
                <span className="shrink-0 text-sm font-black text-gray-900 tabular-nums">
                    {pack.finalizado ? `${pack.total} de ${pack.total}` : `Semana ${pack.semanaActual} de ${pack.total}`}
                </span>
            </div>

            <p className={`mt-2 text-xs font-bold ${esUltima || modo === 'renovar' ? 'text-red-700' : 'text-gray-500'}`}>
                {modo === 'curso' && !esUltima && pack.proxima ? `Próxima: ${fechaCorta(pack.proxima)} · ` : ''}
                {cuandoEsLaUltima(pack)}
            </p>
        </li>
    );
}
