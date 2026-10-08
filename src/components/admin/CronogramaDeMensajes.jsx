import React, { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { TIPOS_DE_ENVIO } from '../../utils/registroDeEnvios';
import { cronEnPalabras, proximaVez, momentosDeLaSemana, horaEnPalabras, NOMBRES_DE_DIAS } from '../../utils/horarioDeEnvios';
import {
    PROCESOS_DEL_SISTEMA, BOTS_DE_KOMMO, PLANTILLAS_A_MANO, EN_CONSTRUCCION, COSTO_POR_CLASE
} from '../../utils/cronogramaDeMensajes';

/**
 * Cronograma de los WhatsApp (Jan, 8 oct 2026): qué mensaje sale, a qué hora,
 * con qué plantilla y qué bot, y si está prendido. Los horarios salen de
 * TIPOS_DE_ENVIO, que es el mismo cron de cada función de Netlify.
 */

const ESTADO = {
    si: { texto: 'Prendido', clase: 'bg-green-100 text-green-800 border-green-200' },
    prueba: { texto: 'Prueba (solo a Jan)', clase: 'bg-blue-50 text-blue-800 border-blue-200' },
    no: { texto: 'Apagado', clase: 'bg-gray-100 text-gray-600 border-gray-200' }
};

const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // de lunes a domingo

const cuandoSale = (fecha) => (fecha
    ? fecha.toLocaleString('es-CR', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Costa_Rica' })
    : '');

export default function CronogramaDeMensajes({ modos = {} }) {
    const ahora = useMemo(() => new Date(), []);

    // { dia: [{ hora, minuto, label, modo }] } para la grilla de la semana
    const semana = useMemo(() => {
        const porDia = Object.fromEntries(ORDEN_SEMANA.map(d => [d, []]));
        TIPOS_DE_ENVIO.forEach((t) => {
            momentosDeLaSemana(t.horario).forEach(({ dia, hora, minuto }) => {
                porDia[dia].push({ hora, minuto, label: t.label, modo: modos[t.id]?.modo || 'no', id: t.id });
            });
        });
        Object.values(porDia).forEach(l => l.sort((a, b) => a.hora - b.hora || a.minuto - b.minuto));
        return porDia;
    }, [modos]);

    const continuos = TIPOS_DE_ENVIO.filter(t => !momentosDeLaSemana(t.horario).length);

    return (
        <section className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4" aria-labelledby="titulo-cronograma">
            <h3 id="titulo-cronograma" className="text-base font-black text-gray-900 flex items-center gap-2 mb-1">
                <CalendarClock size={18} className="text-bikitchen-orange" aria-hidden="true" /> Cronograma de los WhatsApp
            </h3>
            <p className="text-xs text-gray-600 mb-3">
                Hora de Costa Rica. Verde = les llega a los clientes · Azul = prueba, solo le llega una muestra a Jan · Gris = apagado.
                Marketing: máximo 2 por persona por semana, nada a &quot;no molestar&quot;, tope US$200 al mes.
            </p>

            {/* La semana */}
            <div className="overflow-x-auto mb-4">
                <div className="grid grid-cols-7 gap-1.5 min-w-[760px]">
                    {ORDEN_SEMANA.map(d => (
                        <div key={d} className="rounded-xl bg-gray-50 p-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-gray-700 mb-1.5">{NOMBRES_DE_DIAS[d]}</p>
                            {semana[d].length === 0 && <p className="text-[11px] text-gray-400">—</p>}
                            <ul className="space-y-1">
                                {semana[d].map(m => (
                                    <li key={`${m.id}-${d}`} className={`px-1.5 py-1 rounded-lg border text-[11px] leading-tight ${ESTADO[m.modo]?.clase || ESTADO.no.clase}`}>
                                        <span className="font-bold">{horaEnPalabras(m.hora, m.minuto)}</span><br />{m.label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                {continuos.length > 0 && (
                    <p className="mt-2 text-[11px] text-gray-600">
                        Todo el día: {continuos.map(t => `${t.label} (${cronEnPalabras(t.horario).split(' · ')[1]}, ${ESTADO[modos[t.id]?.modo || 'no'].texto.toLowerCase()})`).join(' · ')}
                    </p>
                )}
            </div>

            {/* Ficha de cada mensaje */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[760px]">
                    <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="py-1.5 pr-2 font-bold">Mensaje</th>
                            <th className="py-1.5 pr-2 font-bold">Cuándo sale</th>
                            <th className="py-1.5 pr-2 font-bold">Próxima vez</th>
                            <th className="py-1.5 pr-2 font-bold">Plantilla · bot</th>
                            <th className="py-1.5 font-bold">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TIPOS_DE_ENVIO.map((t) => {
                            const m = modos[t.id] || {};
                            const estado = ESTADO[m.modo || 'no'];
                            const proxima = proximaVez(t.horario, ahora);
                            return (
                                <tr key={t.id} className="border-b border-gray-50 align-top">
                                    <td className="py-2 pr-2">
                                        <p className="font-bold text-gray-900">{t.label}</p>
                                        <p className="text-gray-600">{t.a}</p>
                                        <p className="text-gray-500">{t.clase}: {COSTO_POR_CLASE[t.clase]}</p>
                                        {t.texto && (
                                            <details className="mt-1">
                                                <summary className="cursor-pointer text-bikitchen-orange font-semibold">Ver el texto</summary>
                                                <p className="mt-1 p-2 rounded-lg bg-gray-50 text-gray-800 whitespace-pre-line">{t.texto}</p>
                                            </details>
                                        )}
                                        {t.pendiente && <p className="mt-1 text-amber-700 font-semibold">⚠ {t.pendiente}</p>}
                                    </td>
                                    <td className="py-2 pr-2 text-gray-800">{cronEnPalabras(t.horario)}</td>
                                    <td className="py-2 pr-2 text-gray-800">{proxima ? cuandoSale(proxima) : 'Continuo'}</td>
                                    <td className="py-2 pr-2 text-gray-800">
                                        <p className="font-mono break-all">{t.plantilla}</p>
                                        <p className="text-gray-500">Bot {m.bots?.length ? m.bots.join(' · ') : <span className="text-red-700 font-semibold">sin configurar</span>}</p>
                                    </td>
                                    <td className="py-2">
                                        <span className={`inline-block px-2 py-0.5 rounded-full border font-bold ${estado.clase}`}>{estado.texto}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div>
                    <p className="text-xs font-black text-gray-900 mb-1">Bots que viven en Kommo (su propio disparador)</p>
                    <ul className="space-y-1 text-xs">
                        {BOTS_DE_KOMMO.map(b => (
                            <li key={b.bot} className="px-2 py-1.5 rounded-lg bg-gray-50">
                                <span className="font-bold">{b.nombre}</span> · bot {b.bot} · {b.cuando} · <span className="text-green-700 font-semibold">{b.estado}</span>
                                <span className="block text-gray-600">{b.detalle}</span>
                            </li>
                        ))}
                        {PROCESOS_DEL_SISTEMA.map(p => (
                            <li key={p.id} className="px-2 py-1.5 rounded-lg bg-gray-50">
                                <span className="font-bold">{p.label}</span> · {cronEnPalabras(p.horario)}
                                <span className="block text-gray-600">{p.detalle}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-black text-gray-900 mb-1">Plantillas aprobadas que se mandan a mano</p>
                    <ul className="space-y-1 text-xs">
                        {PLANTILLAS_A_MANO.map(p => (
                            <li key={p.plantilla} className="px-2 py-1.5 rounded-lg bg-gray-50">
                                <span className="font-bold">{p.nombre}</span> · <span className="font-mono">{p.plantilla}</span> · bot {p.bot}
                                <span className="block text-gray-600">{p.para}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-4">
                <p className="text-xs font-black text-gray-900 mb-1">En construcción (aprobado por Jan)</p>
                <ul className="grid gap-1 sm:grid-cols-2 text-xs">
                    {EN_CONSTRUCCION.map(e => (
                        <li key={e.nombre} className="px-2 py-1.5 rounded-lg bg-amber-50 text-amber-900">
                            <span className="font-bold">{e.nombre}</span>
                            <span className="block">{e.detalle}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
