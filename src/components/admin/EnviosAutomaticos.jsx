import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, RefreshCw, AlertTriangle } from 'lucide-react';
import TarjetaDeEnvio from './TarjetaDeEnvio';
import VentasPorEnvio from './VentasPorEnvio';
import CronogramaDeMensajes from './CronogramaDeMensajes';
import { leerEnviosAutomaticos } from '../../utils/kommoClient';
import { TIPOS_DE_ENVIO, estadoEnRegistro } from '../../utils/registroDeEnvios';
import { renovacionesDelDia, destinatarioDeRenovacion } from '../../utils/envioDeCambios';
import { sinPagarConEntregaCerca, hoyEnCostaRica, sumarDias } from '../../utils/avisosDePago';
import { entreganHoy, primeraEntregaHoy, nuevosQueRecibieronAyer, paraVolverAInvitar } from '../../utils/avisosDeEntrega';
import { cierreDeHoy, clientesSinEntrega, COSTO_MARKETING_USD, PRESUPUESTO_MENSUAL_USD } from '../../utils/cierresDePedidos';
import { paraPasarseAlMensual, paraMenuDeLaSemana } from '../../utils/enviosDeVentas';

/** El próximo día en que sale un cierre (hoy incluido) y su reparto. */
const proximoCierre = (hoy) => {
    for (let i = 0; i < 7; i++) {
        const c = cierreDeHoy(sumarDias(hoy, i));
        if (c) return c;
    }
    return null;
};

/**
 * Los WhatsApp automáticos, en Listas de Difusión: qué está prendido, a quién
 * le toca cada uno, qué ya salió y qué falta.
 *
 * Las listas salen de los pedidos que la pantalla ya cargó (cero lecturas de
 * más) con las MISMAS funciones que usan los envíos, así lo que se ve es lo que
 * sale. El estado y el historial vienen de la función `kommo` (~40 lecturas).
 */

const DIAS_DE_REPARTO = [1, 3, 6];          // lunes, miércoles, sábado

const proximosRepartos = (hoy, cuantos = 3) => {
    const fechas = [];
    for (let i = 0; fechas.length < cuantos && i < 14; i++) {
        const f = sumarDias(hoy, i);
        if (DIAS_DE_REPARTO.includes(new Date(`${f}T12:00:00`).getDay())) fechas.push(f);
    }
    return fechas;
};

/** Una fila: el cliente y qué pasó con su mensaje (marca del pedido o registro). */
const filaDe = (item, registro, tipo, marca = '') => {
    const p = item.pedido;
    const d = destinatarioDeRenovacion(item);
    const base = {
        clave: `${p.id}-${item.fecha}`, nombre: p.cliente || 'Sin nombre', telefono: p.telefono || '',
        pack: p.plan || p.items?.[0]?.nombre || '', fecha: item.fecha
    };
    if (!d) return { ...base, estado: 'sin-telefono' };
    if (marca && p[marca]) return { ...base, estado: 'enviado', cuando: p[marca] };
    if (marca && p[`${marca}Prueba`]) return { ...base, estado: 'prueba', cuando: p[`${marca}Prueba`] };
    const r = estadoEnRegistro(registro, tipo, d.telefono, item.fecha);
    return r ? { ...base, ...r } : { ...base, estado: 'pendiente' };
};

export default function EnviosAutomaticos({ orders = [], loading = false }) {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [vuelta, setVuelta] = useState(0);
    const [actualizando, setActualizando] = useState(false);

    useEffect(() => {
        let vivo = true;
        leerEnviosAutomaticos()
            .then((r) => { if (vivo) { setDatos(r); setError(''); } })
            .catch((err) => { if (vivo) setError(err.message); })
            .finally(() => { if (vivo) setActualizando(false); });
        return () => { vivo = false; };
    }, [vuelta]);

    const actualizar = () => {
        setActualizando(true);
        setVuelta(v => v + 1);
    };

    const registro = useMemo(() => datos?.registro || [], [datos]);
    const hoy = useMemo(() => hoyEnCostaRica(new Date()), []);
    const delTipo = (id) => registro.filter(e => e.tipo === id);

    const filas = useMemo(() => {
        const renovacion = proximosRepartos(hoy)
            .flatMap(f => renovacionesDelDia(orders, f).map(i => filaDe(i, registro, 'renovacion')));
        const recordatorio = sinPagarConEntregaCerca(orders, hoy)
            .map(i => filaDe(i, registro, 'recordatorio-pago', 'avisoRecordatorioPago'));
        const pagoRecibido = orders
            .filter(p => p.avisoPagoRecibido || p.avisoPagoRecibidoPrueba)
            .sort((a, b) => String(b.avisoPagoRecibido || b.avisoPagoRecibidoPrueba)
                .localeCompare(String(a.avisoPagoRecibido || a.avisoPagoRecibidoPrueba)))
            .slice(0, 15)
            .map(p => filaDe({ pedido: p, fecha: p.fecha_entrega || '' }, registro, 'pago-recibido', 'avisoPagoRecibido'));
        // El próximo reparto (hoy, si hoy se reparte) y el día siguiente a él
        const reparto = proximosRepartos(hoy, 1)[0];
        const hoyTeLlega = entreganHoy(orders, reparto).map(i => filaDe(i, registro, 'hoy-te-llega'));
        const guia = primeraEntregaHoy(orders, reparto).map(i => filaDe(i, registro, 'guia-congelado'));
        // Clientes nuevos: hoy reciben su primera entrega y mañana les llega el "¿qué tal?"
        const queTal = nuevosQueRecibieronAyer(orders, sumarDias(reparto, 1)).map(i => filaDe(i, registro, 'que-tal'));
        const invitar = paraVolverAInvitar(orders, hoy).map(i => filaDe(i, registro, 'volver-a-invitar'));
        // Antes de las reglas de marketing (2 por semana, "no molestar"): esas
        // las aplica el envío con las fichas de Kommo, así que pueden salir menos.
        const cierre = proximoCierre(hoy);
        const cierres = cierre ? clientesSinEntrega(orders, cierre.fechaEntrega).map(i => filaDe(i, registro, 'cierre-pedidos')) : [];
        const pasate = paraPasarseAlMensual(orders, hoy).map(i => filaDe(i, registro, 'pasate-mensual'));
        const menu = Object.values(paraMenuDeLaSemana(orders, hoy)).flat().map(i => filaDe(i, registro, 'menu-semana'));
        return {
            'pasate-mensual': pasate, 'menu-semana': menu,
            renovacion, 'recordatorio-pago': recordatorio, 'pago-recibido': pagoRecibido,
            'hoy-te-llega': hoyTeLlega, 'guia-congelado': guia, 'que-tal': queTal, 'volver-a-invitar': invitar,
            'cierre-pedidos': cierres
        };
    }, [orders, registro, hoy]);

    const VACIOS = {
        renovacion: 'Nadie termina su pack en los próximos tres días de reparto.',
        'recordatorio-pago': 'No hay pedidos sin pagar con entrega en los próximos 3 días.',
        'pago-recibido': 'Todavía no se ha avisado ningún pago.',
        'hoy-te-llega': 'Nadie recibe en el próximo reparto.',
        'guia-congelado': 'Nadie recibe su primera entrega en el próximo reparto.',
        'que-tal': 'No hay clientes nuevos en el próximo reparto.',
        'volver-a-invitar': 'Nadie terminó hace 2 a 3 semanas sin volver a pedir.',
        'pasate-mensual': 'Nadie compra semanal sin tener ya un mensual.',
        'menu-semana': 'Nadie terminó hace 3 a 8 semanas sin volver (o la pantalla no cargó tantas semanas).',
        'cierre-pedidos': 'Todos los clientes de ese día de reparto ya tienen entrega (o la pantalla no cargó las últimas 8 semanas).'
    };

    return (
        <section className="mb-6" aria-labelledby="titulo-envios-automaticos">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 id="titulo-envios-automaticos" className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Bot size={20} className="text-bikitchen-orange" aria-hidden="true" /> WhatsApp automáticos
                </h2>
                <button type="button" onClick={actualizar} disabled={actualizando}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 disabled:opacity-40">
                    <RefreshCw size={13} className={actualizando ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar
                </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
                Las listas salen de los pedidos del sistema, igual que los envíos. Si alguien ya pagó y
                sigue como &quot;pago pendiente&quot;, confirmalo en Pedidos para que no le llegue el recordatorio.
                {loading && ' Todavía cargando pedidos…'}
            </p>
            {error && (
                <p className="mb-3 flex items-start gap-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-xl">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    No se pudo leer el estado de los envíos: {error}
                </p>
            )}
            {datos && (
                <div className="mb-3 grid gap-2 sm:grid-cols-2 text-xs">
                    <p className="px-3 py-2 rounded-xl bg-gray-50 text-gray-700">
                        <span className="font-bold text-gray-900">Conexión con Kommo: </span>
                        {datos.conexion?.ultimaVuelta
                            ? <>última lectura {new Date(datos.conexion.ultimaVuelta).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}
                                {datos.conexion.alDia ? ' · al día' : ' · poniéndose al día con los últimos 30 días'}</>
                            : 'todavía no ha corrido (lee cada 10 minutos).'}
                    </p>
                    <p className="px-3 py-2 rounded-xl bg-gray-50 text-gray-700">
                        <span className="font-bold text-gray-900">Marketing de este mes: </span>
                        {datos.marketingDelMes?.mensajes || 0} mensajes ≈ US${((datos.marketingDelMes?.mensajes || 0) * COSTO_MARKETING_USD).toFixed(2)} de US${PRESUPUESTO_MENSUAL_USD}.
                        {' '}Al llegar al tope, los cierres y &quot;volver a invitar&quot; no salen.
                    </p>
                </div>
            )}
            {datos && <CronogramaDeMensajes modos={datos.modos || {}} />}
            {datos && (
                <VentasPorEnvio ventas={datos.ventas} onActualizado={(ventas) => setDatos(d => ({ ...d, ventas }))} />
            )}
            <div className="grid gap-3 lg:grid-cols-2">
                {TIPOS_DE_ENVIO.map(tipo => (
                    <TarjetaDeEnvio key={tipo.id} tipo={tipo} modo={datos?.modos?.[tipo.id]} entradas={delTipo(tipo.id)}
                        filas={tipo.id === 'cambios' || tipo.id === 'seguimiento' ? null : filas[tipo.id]} vacio={VACIOS[tipo.id]}>
                        {tipo.id === 'seguimiento' && (
                            <p className="mt-3 text-sm text-gray-700">
                                La lista sale de los chats de Kommo (no de los pedidos): se arma cada hora con quien
                                escribió hace 18 a 24 h y no tiene pedido. Lo que salió queda en &quot;Últimos envíos&quot;.
                            </p>
                        )}
                        {tipo.id === 'cambios' && (
                            <p className="mt-3 text-sm text-gray-700">
                                Quién recibe el link y quién ya eligió está en{' '}
                                <Link to="/admin/cambios-semana" className="font-bold text-bikitchen-orange underline">
                                    Cambios de la semana
                                </Link>.
                            </p>
                        )}
                    </TarjetaDeEnvio>
                ))}
            </div>
        </section>
    );
}
