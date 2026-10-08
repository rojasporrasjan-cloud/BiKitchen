import React, { useState } from 'react';
import { TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { recalcularVentasPorEnvio } from '../../utils/kommoClient';
import { TIPOS_DE_ENVIO } from '../../utils/registroDeEnvios';
import { formatPrice } from '../../utils/formatters';

/**
 * "¿Cuánto vendió cada mensaje?" (Jan, 8 oct 2026). Lo calcula la función
 * ventas-por-envio cada noche y la pantalla lo lee en una lectura (viene en
 * `datos.ventas` de leerEnviosAutomaticos). "Recalcular" lo corre a pedido.
 */

const nombreDe = (r) => (r.tipo === 'difusion'
    ? `Difusión: ${r.nombre || 'sin nombre'}`
    : (TIPOS_DE_ENVIO.find(t => t.id === r.tipo)?.label || r.tipo));

const fecha = (iso) => (iso
    ? new Date(iso).toLocaleString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '');

export default function VentasPorEnvio({ ventas, onActualizado }) {
    const [calculando, setCalculando] = useState(false);
    const [error, setError] = useState('');
    const [abierto, setAbierto] = useState('');

    const recalcular = async () => {
        setCalculando(true);
        setError('');
        try {
            const r = await recalcularVentasPorEnvio();
            onActualizado?.(r.ventas);
        } catch (err) {
            setError(err.message);
        }
        setCalculando(false);
    };

    const envios = ventas?.envios || [];
    const porTipo = ventas?.porTipo || [];

    return (
        <section className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4" aria-labelledby="titulo-ventas-envio">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 id="titulo-ventas-envio" className="text-base font-black text-gray-900 flex items-center gap-2">
                    <TrendingUp size={18} className="text-bikitchen-orange" aria-hidden="true" /> ¿Cuánto vendió cada mensaje?
                </h3>
                <button type="button" onClick={recalcular} disabled={calculando}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 disabled:opacity-40">
                    <RefreshCw size={13} className={calculando ? 'animate-spin' : ''} aria-hidden="true" /> Recalcular
                </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
                Cuenta quién de los que recibieron el mensaje hizo un pedido en las {ventas?.horas || 72} horas siguientes
                (últimos {ventas?.dias || 30} días, solo envíos reales, no las pruebas). No prueba que compró por el mensaje,
                pero sirve para comparar. El cupón usado sí es prueba directa.
                {ventas?.calculadoEn && <> Calculado: {fecha(ventas.calculadoEn)}.</>}
            </p>
            {error && <p className="mb-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-xl">No se pudo recalcular: {error}</p>}

            {!ventas && !error && (
                <p className="text-sm text-gray-600">Todavía no hay estadísticas. Se calculan solas cada noche, o tocá &quot;Recalcular&quot;.</p>
            )}
            {ventas && envios.length === 0 && (
                <p className="text-sm text-gray-600">En los últimos {ventas.dias} días no salió ningún envío real a clientes (los que están en prueba no cuentan).</p>
            )}

            {porTipo.length > 0 && (
                <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {porTipo.map(t => (
                        <div key={`${t.tipo}-${t.nombre}`} className="px-3 py-2 rounded-xl bg-gray-50">
                            <p className="text-xs font-bold text-gray-900">{nombreDe(t)}</p>
                            <p className="text-lg font-black text-gray-900">{formatPrice(t.monto)}</p>
                            <p className="text-xs text-gray-600">
                                {t.compraron} de {t.enviados} compraron ({t.tasa}%) · {t.veces} {t.veces === 1 ? 'envío' : 'envíos'}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {envios.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="py-1.5 pr-2 font-bold">Mensaje</th>
                                <th className="py-1.5 pr-2 font-bold">Cuándo</th>
                                <th className="py-1.5 pr-2 font-bold text-right">A cuántos</th>
                                <th className="py-1.5 pr-2 font-bold text-right">Compraron</th>
                                <th className="py-1.5 font-bold text-right">Vendido</th>
                            </tr>
                        </thead>
                        <tbody>
                            {envios.map(r => {
                                const clave = r.id || `${r.tipo}-${r.cuando}`;
                                const verDetalle = abierto === clave;
                                return (
                                    <React.Fragment key={clave}>
                                        <tr className="border-b border-gray-50">
                                            <td className="py-1.5 pr-2 font-semibold text-gray-900">{nombreDe(r)}</td>
                                            <td className="py-1.5 pr-2 text-gray-700 whitespace-nowrap">{fecha(r.cuando)}</td>
                                            <td className="py-1.5 pr-2 text-right text-gray-700">{r.enviados}</td>
                                            <td className="py-1.5 pr-2 text-right">
                                                {r.compraron > 0 ? (
                                                    <button type="button" onClick={() => setAbierto(verDetalle ? '' : clave)}
                                                        aria-expanded={verDetalle}
                                                        className="inline-flex items-center gap-1 font-bold text-bikitchen-orange hover:underline">
                                                        {r.compraron} ({r.tasa}%)
                                                        {verDetalle ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
                                                    </button>
                                                ) : <span className="text-gray-400">0</span>}
                                            </td>
                                            <td className="py-1.5 text-right font-bold text-gray-900">{r.monto ? formatPrice(r.monto) : '—'}</td>
                                        </tr>
                                        {verDetalle && (
                                            <tr className="bg-orange-50/50">
                                                <td colSpan={5} className="py-2 px-2">
                                                    <ul className="space-y-0.5">
                                                        {r.pedidos.map(p => (
                                                            <li key={`${p.numeroOrden}-${p.creado}`} className="text-gray-800">
                                                                {p.cliente} · {formatPrice(p.total)} · {fecha(p.creado)}
                                                                {p.cupon && <span className="ml-1 font-bold text-green-700">cupón {p.cupon}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
