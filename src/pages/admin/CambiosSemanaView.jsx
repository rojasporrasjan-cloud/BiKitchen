import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Link2, Copy, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { auth } from '../../firebase/config';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EnvioKommo from '../../components/admin/EnvioKommo';
import LinksFijos from '../../components/cambios/LinksFijos';
import usePedidosDeFechas from '../../hooks/usePedidosDeFechas';
import { useSubstitutions } from '../../hooks/useSubstitutions';
import { useAuth } from '../../context/AuthContext';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import { proximoCiclo, pedidosParaElLink, respuestaDe, destinatarioKommo } from '../../utils/envioDeCambios';
import { horaLimiteEnPalabras, estaCerrada } from '../../utils/cambiosDeLaSemana';

/**
 * Cambios de la semana — solo el dueño.
 *
 * Cada miércoles: a quién le llega el link para elegir los cambios de su pack,
 * quién ya contestó y qué pidió. Lo que el cliente elige ya está en su pedido
 * y la hoja de producción lo lee sola (cambiosPorEntrega); esta pantalla es
 * para mirar y para mandar, no para arreglar la hoja.
 *
 * Lee SOLO los pedidos del sábado y el lunes (usePedidosDeFechas), no la
 * colección entera: ver la regla 17 de CLAUDE.md.
 */

const FUNCION = '/.netlify/functions/cambios-semana';

const fechaCorta = (iso) => new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });

const resumenDeRespuesta = (r) => {
    if (!r) return '';
    const partes = (r.cambios || []).map(c => `${c.de} → ${c.a}${c.comida === 'cena' ? ' (cena)' : ''}`);
    if (r.proteinas?.length) partes.push(`Proteínas: ${r.proteinas.join(', ')}`);
    if (r.notas) partes.push(`Nota: ${r.notas}`);
    return partes.join(' · ') || 'Sin cambios';
};

export default function CambiosSemanaView() {
    const { isSuperAdmin } = useAuth();
    const inicial = useMemo(() => proximoCiclo(new Date()), []);
    const [sabado, setSabado] = useState(inicial.sabado);
    const [lunes, setLunes] = useState(inicial.lunes);
    const [menus, setMenus] = useState(null);
    const [links, setLinks] = useState({});
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState('');
    const [copiado, setCopiado] = useState('');

    const fechas = useMemo(() => [sabado, lunes].filter(Boolean), [sabado, lunes]);
    // Sin permiso no se lee nada: ni una lectura de más.
    const { pedidos, cargando, error: errorPedidos } = usePedidosDeFechas(isSuperAdmin() ? fechas : [], 'Cambios de la semana');
    const { substitutions } = useSubstitutions();

    useEffect(() => {
        let vigente = true;
        getOfficialMenus()
            .then(m => vigente && setMenus(m))
            .catch(e => vigente && setError(`No se pudo leer el menú de la semana: ${e.message}`));
        return () => { vigente = false; };
    }, []);

    const lista = useMemo(
        () => (menus ? pedidosParaElLink(pedidos, fechas, menus, substitutions) : []),
        [pedidos, fechas, menus, substitutions]
    );
    const respondieron = lista.filter(i => respuestaDe(i.pedido, i.fecha));
    const ultimas = lista.filter(i => i.ultima);
    const destinatarios = useMemo(
        () => lista.map(i => destinatarioKommo(i, links[i.pedido.id])).filter(Boolean),
        [lista, links]
    );

    if (!isSuperAdmin()) {
        return <div className="p-8 text-center text-gray-600">Esta sección es solo para el dueño.</div>;
    }

    const generarLinks = async () => {
        setGenerando(true);
        setError('');
        try {
            const usuario = auth.currentUser;
            if (!usuario) throw new Error('Tu sesión venció. Volvé a entrar al panel.');
            const res = await fetch(FUNCION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await usuario.getIdToken()}` },
                body: JSON.stringify({ accion: 'generar', pedidos: lista.map(i => ({ id: i.pedido.id, fecha: i.fecha })) })
            });
            const datos = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
            setLinks(Object.fromEntries(datos.links.map(l => [l.id, l.url])));
        } catch (e) {
            setError(e.message);
        } finally {
            setGenerando(false);
        }
    };

    const copiar = (texto, que) => {
        navigator.clipboard.writeText(texto);
        setCopiado(que);
        setTimeout(() => setCopiado(''), 2000);
    };

    const copiarTodos = () => copiar(
        lista.filter(i => links[i.pedido.id])
            .map(i => `${i.pedido.cliente}\t${i.pedido.telefono || ''}\t${links[i.pedido.id]}`).join('\n'),
        'todos'
    );

    return (
        <div className="space-y-5 pb-20">
            <AdminPageHeader
                icon={RefreshCw}
                title="Cambios de la semana"
                subtitle="El link para que cada cliente elija sus cambios, y lo que ya contestaron"
                stats={[
                    { value: lista.length, label: 'Reciben link' },
                    { value: respondieron.length, label: 'Contestaron' },
                    { value: ultimas.length, label: 'Última entrega' }
                ]}
                gradient="from-orange-500 via-amber-500 to-yellow-500"
            />

            <LinksFijos />

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-4">
                <label className="text-sm font-semibold text-gray-700">
                    Sábado
                    <input type="date" value={sabado} onChange={e => { setSabado(e.target.value); setLinks({}); }}
                        className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg" />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                    Lunes
                    <input type="date" value={lunes} onChange={e => { setLunes(e.target.value); setLinks({}); }}
                        className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg" />
                </label>
                <p className={`flex items-center gap-2 text-sm font-semibold ${estaCerrada(sabado) ? 'text-gray-500' : 'text-bikitchen-orange'}`}>
                    <Clock size={16} aria-hidden="true" />
                    {estaCerrada(sabado) ? 'Cerrado' : 'Cierra'} el {horaLimiteEnPalabras(sabado)}
                </p>
            </section>

            {(error || errorPedidos) && (
                <p className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-xl">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error || `No se pudieron leer los pedidos: ${errorPedidos.message}`}
                </p>
            )}

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h2 className="text-base font-bold text-gray-900">
                        {cargando || !menus ? 'Cargando…' : `${lista.length} clientes`}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={generarLinks} disabled={generando || lista.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-bikitchen-orange text-white text-sm font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-40">
                            <Link2 size={16} aria-hidden="true" /> {generando ? 'Generando…' : 'Generar links'}
                        </button>
                        <button type="button" onClick={copiarTodos} disabled={Object.keys(links).length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 text-sm font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-40">
                            <Copy size={16} aria-hidden="true" /> {copiado === 'todos' ? 'Copiado' : 'Copiar todos'}
                        </button>
                    </div>
                </div>

                <ul className="divide-y divide-gray-100">
                    {lista.map((item) => {
                        const r = respuestaDe(item.pedido, item.fecha);
                        const url = links[item.pedido.id];
                        return (
                            <li key={item.pedido.id} className="py-3 flex flex-wrap items-start gap-3">
                                <span className={`mt-0.5 shrink-0 ${r ? 'text-green-600' : 'text-gray-300'}`}>
                                    {r ? <CheckCircle2 size={18} aria-label="Contestó" /> : <Clock size={18} aria-label="Sin contestar" />}
                                </span>
                                <div className="flex-1 min-w-[220px]">
                                    <p className="font-semibold text-gray-900">
                                        {item.pedido.cliente}
                                        {item.ultima && <span className="ml-2 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full">Última entrega — renovar</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.pedido.plan} · {fechaCorta(item.fecha)} · {item.pedido.telefono || 'sin teléfono'}</p>
                                    {r && <p className="mt-1 text-sm text-green-800">{resumenDeRespuesta(r)}</p>}
                                </div>
                                {url && (
                                    <button type="button" onClick={() => copiar(url, item.pedido.id)}
                                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg">
                                        <Copy size={13} aria-hidden="true" /> {copiado === item.pedido.id ? 'Copiado' : 'Copiar link'}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {destinatarios.length > 0 ? (
                <EnvioKommo destinatarios={destinatarios} segmentoId="cambios-semana" />
            ) : (
                <p className="text-sm text-gray-500 px-1">
                    Para mandar por Kommo, primero tocá <b>Generar links</b>. En Kommo, asigná el campo <b>linkCambios</b> y
                    elegí el bot del mensaje de cambios (su plantilla tiene que usar ese campo).
                </p>
            )}
        </div>
    );
}
