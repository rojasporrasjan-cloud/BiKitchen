import React from 'react';
import { CheckCircle2, Clock, FlaskConical, PhoneOff } from 'lucide-react';
import { fechaEnPalabras } from '../../utils/envioDeCambios';
import { cronEnPalabras } from '../../utils/horarioDeEnvios';

/**
 * Una tarjeta por envío automático (Listas de Difusión): si está prendido, a
 * quién le toca, qué ya salió y los últimos envíos del registro.
 */

const formatCuando = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('es-CR', {
        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
        timeZone: 'America/Costa_Rica'
    });
};

const insignia = (m) => {
    if (!m) return { texto: 'Sin datos del servidor', clase: 'bg-gray-100 text-gray-600' };
    const sinBot = m.botListo ? '' : ' · falta el bot en Kommo';
    if (m.modo === 'si') return { texto: `Prendido: les llega a los clientes${sinBot}`, clase: 'bg-green-100 text-green-800' };
    if (m.modo === 'prueba') return { texto: `Prueba: solo a tu número ${m.numeroDePrueba}${sinBot}`, clase: 'bg-blue-100 text-blue-800' };
    return { texto: `Apagado${sinBot}`, clase: 'bg-gray-100 text-gray-700' };
};

const CHIPS = {
    enviado: { Icono: CheckCircle2, clase: 'bg-green-100 text-green-800', texto: (f) => `Enviado · ${formatCuando(f.cuando)}` },
    prueba: { Icono: FlaskConical, clase: 'bg-blue-50 text-blue-700', texto: (f) => `En prueba le habría llegado · ${formatCuando(f.cuando)}` },
    pendiente: { Icono: Clock, clase: 'bg-amber-100 text-amber-800', texto: () => 'No se le ha enviado' },
    'sin-telefono': { Icono: PhoneOff, clase: 'bg-red-100 text-red-700', texto: () => 'Sin teléfono válido: no le llega' }
};

function Fila({ fila }) {
    const chip = CHIPS[fila.estado] || CHIPS.pendiente;
    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="flex-1 min-w-[180px]">
                <span className="block text-sm font-semibold text-gray-900">{fila.nombre}</span>
                <span className="text-xs text-gray-500">{[fila.telefono, fila.pack].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${chip.clase}`}>
                <chip.Icono size={12} aria-hidden="true" /> {chip.texto(fila)}
            </span>
        </li>
    );
}

function Historial({ entradas }) {
    if (entradas.length === 0) {
        return <p className="text-xs text-gray-500">Todavía no ha salido ningún envío.</p>;
    }
    return (
        <ul className="space-y-1">
            {entradas.slice(0, 6).map((e) => (
                <li key={e.id || e.cuando}>
                    <details className="text-xs">
                        <summary className="cursor-pointer text-gray-700">
                            <strong>{formatCuando(e.cuando)}</strong>
                            {' · '}{e.modo === 'si' ? 'a clientes' : 'prueba'}
                            {' · '}{e.estado === 'frenado-por-tope' ? 'FRENADO: lista demasiado larga' : `${e.enviados?.length || 0} enviado(s)`}
                            {e.modo === 'prueba' && ` · lista real: ${e.lesHabriaLlegado?.length || 0}`}
                        </summary>
                        <p className="mt-1 pl-4 text-gray-600">
                            {e.modo === 'prueba' ? 'Le habría llegado a: ' : 'Le llegó a: '}
                            {((e.modo === 'prueba' ? e.lesHabriaLlegado : e.enviados) || []).map(p => p.nombre).join(', ') || 'nadie'}
                        </p>
                    </details>
                </li>
            ))}
        </ul>
    );
}

export default function TarjetaDeEnvio({ tipo, modo, entradas = [], filas = null, vacio = '', children }) {
    const { texto, clase } = insignia(modo);
    const porFecha = (filas || []).reduce((acc, f) => {
        (acc[f.fecha] = acc[f.fecha] || []).push(f);
        return acc;
    }, {});
    const cuenta = (estado) => (filas || []).filter(f => f.estado === estado).length;

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4" aria-labelledby={`envio-${tipo.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 id={`envio-${tipo.id}`} className="font-bold text-gray-900">{tipo.label}</h3>
                    <p className="text-xs text-gray-500">{tipo.horario ? `${cronEnPalabras(tipo.horario)} — ${tipo.a}` : tipo.cuando}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${clase}`}>{texto}</span>
            </div>

            {filas && (
                <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">
                        <strong>{filas.length}</strong> en la lista · {cuenta('enviado')} enviados · {cuenta('pendiente')} sin enviar
                        {cuenta('sin-telefono') > 0 && ` · ${cuenta('sin-telefono')} sin teléfono`}
                    </p>
                    {filas.length === 0 && <p className="text-sm text-gray-500">{vacio}</p>}
                    {Object.entries(porFecha).map(([fecha, lista]) => (
                        <div key={fecha} className="mt-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                Entrega {fechaEnPalabras(fecha) || 'sin fecha'}
                            </p>
                            <ul className="divide-y divide-gray-100">
                                {lista.map(f => <Fila key={f.clave} fila={f} />)}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {children}

            <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-800 mb-1">Últimos envíos</p>
                <Historial entradas={entradas} />
            </div>
        </section>
    );
}
