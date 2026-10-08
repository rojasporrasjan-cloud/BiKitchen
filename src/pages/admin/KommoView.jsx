import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, RefreshCw, AlertTriangle, Send, Wallet, Wifi, CheckCircle2 } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import CronogramaDeMensajes from '../../components/admin/CronogramaDeMensajes';
import VentasPorEnvio from '../../components/admin/VentasPorEnvio';
import { leerEnviosAutomaticos } from '../../utils/kommoClient';
import { resumenDelTablero, nombreDelEnvio } from '../../utils/tableroKommo';
import { formatPrice } from '../../utils/formatters';

/**
 * WhatsApp (Kommo): todo lo que manda el sistema por WhatsApp, en una pantalla.
 *
 * Jan, 8 oct 2026: "ocupo ver todo lo que está pasando en tiempo real: qué está
 * activo, cuántos mensajes se han enviado, el gasto". Las listas de a quién le
 * toca cada envío siguen en Listas de Difusión.
 *
 * Regla 17: cada vuelta son ~44 lecturas (las hace la función `kommo`). Se
 * refresca sola cada 5 minutos y solo con la pestaña a la vista.
 */

const CADA_MS = 5 * 60 * 1000;

const hora = (iso) => new Date(iso).toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' });
const fechaYHora = (iso) => new Date(iso).toLocaleString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Cifra({ icono: Icono, titulo, valor, detalle, children }) {
    return (
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
                <Icono size={14} aria-hidden="true" /> {titulo}
            </p>
            <p className="mt-1 text-2xl font-black text-gray-900">{valor}</p>
            {detalle && <p className="text-xs text-gray-600">{detalle}</p>}
            {children}
        </div>
    );
}

function Envio({ entrada }) {
    const real = entrada.modo === 'si';
    const personas = (real ? entrada.enviados : entrada.lesHabriaLlegado) || [];
    const cuantos = personas.length;
    return (
        <li className="py-2 border-b border-gray-100 last:border-0 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">{nombreDelEnvio(entrada)}</span>
                <span className="flex items-center gap-2 text-xs text-gray-600">
                    {fechaYHora(entrada.cuando)}
                    <span className={real ? 'px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold' : 'px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold'}>
                        {real ? `A ${cuantos} cliente${cuantos === 1 ? '' : 's'}` : `Prueba a Jan · le habría llegado a ${cuantos}`}
                    </span>
                </span>
            </div>
            {cuantos > 0 && (
                <details className="mt-1">
                    <summary className="text-xs text-bikitchen-orange font-bold cursor-pointer">
                        {real ? 'Ver a quién le llegó' : 'Ver a quién le habría llegado'}
                    </summary>
                    <ul className="mt-1 grid gap-x-4 sm:grid-cols-2 text-xs text-gray-700">
                        {personas.map((p, i) => <li key={`${p.telefono}-${i}`}>{p.nombre || 'Sin nombre'} · {p.telefono}</li>)}
                    </ul>
                </details>
            )}
        </li>
    );
}

export default function KommoView() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [leidoEn, setLeidoEn] = useState(null);

    const leer = useCallback(async () => {
        setCargando(true);
        try {
            setDatos(await leerEnviosAutomaticos());
            setError('');
            setLeidoEn(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        leer();
        const reloj = setInterval(() => { if (document.visibilityState === 'visible') leer(); }, CADA_MS);
        return () => clearInterval(reloj);
    }, [leer]);

    const r = useMemo(() => resumenDelTablero(datos || {}, new Date()), [datos]);
    const conexion = r.conexion;

    return (
        <div className="space-y-6">
            <AdminPageHeader
                icon={MessageCircle}
                title="WhatsApp (Kommo)"
                subtitle="Qué está prendido, qué salió hoy, cuánto se gasta y cuánto vende cada mensaje"
                gradient="from-green-600 via-green-500 to-emerald-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-600">
                    {leidoEn ? `Actualizado a las ${hora(leidoEn)}. Se actualiza sola cada 5 minutos.` : 'Leyendo…'}
                </p>
                <button type="button" onClick={leer} disabled={cargando}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 disabled:opacity-40">
                    <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar
                </button>
            </div>

            {error && (
                <p className="flex items-start gap-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-xl">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    No se pudo leer Kommo: {error}
                </p>
            )}

            {datos && (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Cifra icono={CheckCircle2} titulo="Envíos prendidos" valor={r.estados.prendidos.length}
                            detalle={`${r.estados.enPrueba.length} en prueba · ${r.estados.apagados.length} apagados`} />
                        <Cifra icono={Send} titulo="Mensajes hoy" valor={r.hoy.aClientes}
                            detalle={`a clientes · ${r.hoy.pruebas} prueba${r.hoy.pruebas === 1 ? '' : 's'} a Jan`} />
                        <Cifra icono={Wallet} titulo="Gasto de marketing del mes" valor={`US$${r.gasto.gasto.toFixed(2)}`}
                            detalle={`${r.gasto.mensajes} mensajes · tope US$${r.gasto.tope}`}>
                            <div className="mt-2 h-2 rounded-full bg-gray-100" role="progressbar" aria-valuenow={r.gasto.porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Gasto del mes contra el tope">
                                <div className={r.gasto.porcentaje >= 90 ? 'h-2 rounded-full bg-red-500' : 'h-2 rounded-full bg-green-500'} style={{ width: `${r.gasto.porcentaje}%` }} />
                            </div>
                        </Cifra>
                        <Cifra icono={Wifi} titulo="Conexión con Kommo"
                            valor={conexion?.ultimaVuelta ? (conexion.alDia ? 'Al día' : 'Poniéndose al día') : 'Sin datos'}
                            detalle={conexion?.ultimaVuelta ? `Última lectura ${hora(conexion.ultimaVuelta)} (lee cada 10 min)` : 'Todavía no ha corrido'} />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        <section className="lg:col-span-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm" aria-labelledby="titulo-ultimos">
                            <h2 id="titulo-ultimos" className="text-base font-black text-gray-900">Lo último que salió</h2>
                            <p className="text-xs text-gray-600 mb-2">Verde: les llegó a los clientes. Azul: prueba, solo te llegó a vos.</p>
                            {(datos.registro || []).length === 0
                                ? <p className="text-sm text-gray-600">Todavía no ha salido ningún envío.</p>
                                : <ul>{datos.registro.slice(0, 15).map((e, i) => <Envio key={e.id || i} entrada={e} />)}</ul>}
                        </section>
                        <section className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm" aria-labelledby="titulo-vendio">
                            <h2 id="titulo-vendio" className="text-base font-black text-gray-900">Últimos {r.ventas.dias} días</h2>
                            <dl className="mt-2 space-y-1 text-sm">
                                <div className="flex justify-between"><dt className="text-gray-600">Mensajes a clientes</dt><dd className="font-bold">{r.ventas.enviados}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-600">Compraron en 72 h</dt><dd className="font-bold">{r.ventas.compraron}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-600">Vendido</dt><dd className="font-bold">{formatPrice(r.ventas.monto)}</dd></div>
                            </dl>
                            <p className="mt-2 text-xs text-gray-500">Se calcula cada noche. El detalle por mensaje está abajo.</p>
                        </section>
                    </div>

                    <CronogramaDeMensajes modos={datos.modos || {}} />
                    <VentasPorEnvio ventas={datos.ventas} onActualizado={(ventas) => setDatos(d => ({ ...d, ventas }))} />
                </>
            )}

            <p className="text-sm text-gray-600">
                A quién le toca cada envío, persona por persona, y las difusiones a mano:{' '}
                <Link to="/admin/broadcast" className="font-bold text-bikitchen-orange underline">Listas de Difusión</Link>.
            </p>
        </div>
    );
}
