import React, { useEffect, useState } from 'react';
import { ChefHat } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { colones, duracion, horaCR, iniciales, pagoDelDia } from '../../utils/planilla';

/**
 * Hoy en la cocina: quién está adentro, cuánto lleva y cuánto va ganando hoy;
 * quién ya se fue (con lo del día) y quién no ha llegado.
 */
const MINUTO = 60000;

const estadoDeHoy = ({ empleado, porDia }, hoy, ahora) => {
    const dia = porDia[hoy];
    if (!dia || dia.marcas.length === 0) return { tipo: 'sinMarcar' };
    const minutos = dia.minutos + (dia.enTurno ? Math.max(0, Math.round((ahora - new Date(dia.enTurno)) / MINUTO)) : 0);
    const { monto } = pagoDelDia(minutos, empleado.tarifaHora);
    let tipo = 'salio';
    if (dia.enTurno) tipo = 'adentro';
    else if (dia.enAlmuerzo) tipo = 'almorzando';
    return { tipo, minutos, monto, desde: dia.enTurno || dia.enAlmuerzo, avisos: dia.avisos.length };
};

const FONDOS = { adentro: 'bg-emerald-50', almorzando: 'bg-yellow-50', salio: 'bg-gray-50', sinMarcar: 'bg-gray-50' };

export default function HoyEnLaCocina({ planilla, hoy }) {
    const [ahora, setAhora] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), MINUTO);
        return () => clearInterval(t);
    }, []);

    const filas = planilla
        .filter(p => p.empleado.activo !== false)
        .map(p => ({ ...p, hoyEs: estadoDeHoy(p, hoy, ahora) }));
    if (filas.length === 0) return null;

    const orden = { adentro: 0, almorzando: 1, salio: 2, sinMarcar: 3 };
    filas.sort((a, b) => orden[a.hoyEs.tipo] - orden[b.hoyEs.tipo]);
    const adentro = filas.filter(f => f.hoyEs.tipo === 'adentro').length;
    const llevaHoy = filas.reduce((s, f) => s + (f.hoyEs.monto || 0), 0);

    return (
        <section className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm" aria-labelledby="titulo-hoy">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2 id="titulo-hoy" className="flex items-center gap-2 text-lg font-black text-gray-900">
                        <ChefHat size={20} className="text-bikitchen-orange" aria-hidden="true" /> Hoy en la cocina
                    </h2>
                    <p className="text-sm text-gray-500">{adentro === 1 ? '1 persona trabajando' : `${adentro} personas trabajando`} · se actualiza solo</p>
                </div>
                <p className="text-right">
                    <span className="block text-2xl font-black text-gray-900">{colones(llevaHoy)}</span>
                    <span className="text-xs font-semibold text-gray-500">va el día hasta ahora</span>
                </p>
            </div>
            <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">
                {filas.map(({ empleado, hoyEs }) => (
                    <li key={empleado.id} className={`flex items-center gap-3 p-3 rounded-2xl ${FONDOS[hoyEs.tipo]}`}>
                        <span className="relative shrink-0" aria-hidden="true">
                            <span className={`flex items-center justify-center w-10 h-10 rounded-full ${tonoDe(empleado.color).solido} text-white text-sm font-black ${hoyEs.tipo === 'sinMarcar' ? 'opacity-40' : ''}`}>
                                {iniciales(empleado.nombre)}
                            </span>
                            {hoyEs.tipo === 'adentro' && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-emerald-50" />}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className={`block font-bold truncate ${hoyEs.tipo === 'sinMarcar' ? 'text-gray-400' : 'text-gray-900'}`}>{empleado.nombre}</span>
                            <span className="block text-xs font-semibold text-gray-500">
                                {hoyEs.tipo === 'adentro' && `Desde ${horaCR(hoyEs.desde)} · lleva ${duracion(hoyEs.minutos)}`}
                                {hoyEs.tipo === 'almorzando' && `Almorzando desde ${horaCR(hoyEs.desde)} · lleva ${duracion(hoyEs.minutos)}`}
                                {hoyEs.tipo === 'salio' && `Ya se fue · ${duracion(hoyEs.minutos)}${hoyEs.avisos ? ' · revisar' : ''}`}
                                {hoyEs.tipo === 'sinMarcar' && 'No ha marcado hoy'}
                            </span>
                        </span>
                        {hoyEs.tipo !== 'sinMarcar' && (
                            <span className={`shrink-0 text-sm font-black ${hoyEs.tipo === 'adentro' ? 'text-emerald-700' : 'text-gray-700'}`}>{hoyEs.monto ? colones(hoyEs.monto) : '—'}</span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
