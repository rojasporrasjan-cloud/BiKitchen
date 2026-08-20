import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Award, AlertTriangle, Copy, Play, Check } from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
    auditarPuntos,
    detectarDuplicados,
    soloDescuadrados,
    resumenAuditoria
} from '../../utils/auditarPuntos';

/**
 * Auditoría de BiPuntos — solo para el dueño.
 *
 * Durante mucho tiempo los pedidos otorgaron puntos escribiendo el campo
 * `points`, mientras la cuenta del cliente lee `currentPoints`. Los puntos se
 * guardaron en un renglón que nadie mira y los clientes vieron cero.
 *
 * Esta pantalla PRIMERO muestra el informe y solo escribe cuando se lo pide
 * explícitamente. Los pedidos duplicados exactos se cuentan una sola vez: si el
 * mismo pedido se metió dos veces, acreditar los dos le regala puntos al cliente.
 */
export default function PointsAuditView() {
    const { isSuperAdmin } = useAuth();
    const [informe, setInforme] = useState(null);
    const [duplicados, setDuplicados] = useState([]);
    const [estado, setEstado] = useState('');
    const [ocupado, setOcupado] = useState(false);

    // Confirmación DENTRO de la página, no con window.prompt.
    //
    // El prompt nativo no aparece en paneles de vista previa ni en navegadores
    // que bloquean diálogos, y cuando eso pasa la función sale sin hacer nada:
    // el botón parece roto. Acá se ve siempre y queda claro qué se va a escribir.
    const [confirmando, setConfirmando] = useState(null);
    const [textoConfirma, setTextoConfirma] = useState('');

    if (!isSuperAdmin()) {
        return <div className="p-8 text-center text-gray-600">Esta sección es solo para el dueño.</div>;
    }

    const revisar = async () => {
        setOcupado(true);
        setEstado('Leyendo pedidos y saldos…');
        try {
            const [pedidosSnap, loyaltySnap] = await Promise.all([
                getDocs(collection(db, 'pedidos')),
                getDocs(collection(db, 'loyalty'))
            ]);

            const pedidos = pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const loyaltyPorCorreo = {};
            loyaltySnap.docs.forEach(d => { loyaltyPorCorreo[d.id] = d.data(); });

            const dups = detectarDuplicados(pedidos);
            const audit = auditarPuntos(pedidos, loyaltyPorCorreo);

            setDuplicados(dups);
            setInforme(audit);
            setEstado(`Listo: ${pedidos.length} pedidos y ${loyaltySnap.size} saldos revisados.`);
        } catch (error) {
            // Igual que el prompt: un alert no aparece en algunos navegadores y
            // el error se pierde. Se muestra en la página.
            console.error('[Puntos] Error auditando:', error);
            setEstado('No se pudo leer la información: ' + error.message);
        }
        setOcupado(false);
    };

    /** Quiénes se van a corregir. Los correos inventados quedan fuera. */
    const aCorregir = () => (informe || [])
        .filter(c => c.faltante > 0 && !c.correoInventado);

    const pedirConfirmacion = () => {
        const pendientes = aCorregir();
        if (pendientes.length === 0) {
            setEstado('No hay nada que corregir.');
            return;
        }
        setTextoConfirma('');
        setConfirmando({
            pendientes,
            cantidad: pendientes.length,
            puntos: pendientes.reduce((s, c) => s + c.faltante, 0),
            excluidos: (informe || []).filter(c => c.faltante > 0 && c.correoInventado).length
        });
    };

    const aplicar = async () => {
        const { pendientes, cantidad } = confirmando;
        if (textoConfirma.trim() !== String(cantidad)) {
            setEstado(`Escribí ${cantidad} exacto para confirmar. No se cambió nada.`);
            return;
        }

        setConfirmando(null);
        setOcupado(true);
        const fallaron = [];
        for (let i = 0; i < pendientes.length; i++) {
            const c = pendientes[i];
            setEstado(`Corrigiendo ${i + 1} de ${pendientes.length}: ${c.correo}`);
            try {
                const ref = doc(db, 'loyalty', c.correo);
                const datos = {
                    currentPoints: c.saldoCorrecto,
                    points: c.saldoCorrecto,
                    lastUpdated: new Date().toISOString(),
                    corregidoPorAuditoria: new Date().toISOString()
                };
                if (c.tieneDocumento) await updateDoc(ref, datos);
                else await setDoc(ref, { email: c.correo, totalRedeemed: 0, totalEarned: c.saldoCorrecto, ...datos });
            } catch (error) {
                console.error('[Puntos] Error corrigiendo', c.correo, error);
                fallaron.push(c.correo);
            }
        }
        setOcupado(false);
        setEstado(fallaron.length
            ? `Corregidos ${pendientes.length - fallaron.length} de ${pendientes.length}. Fallaron: ${fallaron.join(', ')}`
            : `Listo: ${pendientes.length} saldos corregidos.`);
        await revisar();
    };

    const resumen = informe ? resumenAuditoria(informe, duplicados) : null;
    const descuadrados = informe ? soloDescuadrados(informe) : [];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Award size={24} className="text-bikitchen-orange" aria-hidden="true" />
                    Auditoría de BiPuntos
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Compara lo que cada cliente tiene contra lo que le corresponde.
                    Los pedidos duplicados se cuentan una sola vez.
                </p>
            </header>

            <button
                onClick={revisar}
                disabled={ocupado}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bikitchen-orange text-white text-sm font-bold hover:bg-bikitchen-orange-dark active:scale-95 transition-all disabled:opacity-40"
            >
                <Play size={16} aria-hidden="true" />
                {ocupado ? 'Revisando…' : 'Revisar (no cambia nada)'}
            </button>

            {estado && (
                <p className="mt-3 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    {estado}
                </p>
            )}

            {resumen && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                        {[
                            ['Clientes con pedidos', resumen.clientes],
                            ['Les falta saldo', resumen.conFaltante],
                            ['Puntos a devolver', resumen.puntosADevolver.toLocaleString('es-CR')],
                            ['Tienen de más', resumen.conSobrante]
                        ].map(([t, v]) => (
                            <div key={t} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                <div className="text-2xl font-black text-gray-900">{v}</div>
                                <div className="text-[11px] text-gray-600">{t}</div>
                            </div>
                        ))}
                    </div>

                    {resumen.gruposDuplicados > 0 && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                <Copy size={15} aria-hidden="true" />
                                {resumen.pedidosDuplicados} pedidos duplicados en {resumen.gruposDuplicados} grupos
                            </p>
                            <p className="text-xs text-amber-800 mt-1">
                                No se acreditan: son {resumen.puntosEvitadosPorDuplicados.toLocaleString('es-CR')} puntos
                                que se habrían regalado.
                            </p>
                            <ul className="mt-2 space-y-1">
                                {duplicados.slice(0, 12).map((d, i) => (
                                    <li key={i} className="text-xs text-amber-900">
                                        <strong>{d.cliente || d.correo}</strong> — {d.repetidos + 1} veces el mismo pedido
                                        {' '}(₡{(Number(d.pedidos[0]?.total) || 0).toLocaleString('es-CR')})
                                        {' → '}{d.pedidos.map(p => p.numeroOrden || p.id?.slice(0, 6)).join(', ')}
                                    </li>
                                ))}
                                {duplicados.length > 12 && (
                                    <li className="text-xs text-amber-700">…y {duplicados.length - 12} grupos más</li>
                                )}
                            </ul>
                        </div>
                    )}

                    {descuadrados.length === 0 ? (
                        <p className="mt-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                            <Check size={16} aria-hidden="true" />
                            Todos los saldos están correctos.
                        </p>
                    ) : (
                        <>
                            <div className="mt-4 max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-700">Cliente</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-700">Correo</th>
                                            <th className="text-right px-3 py-2 font-semibold text-gray-700">Pedidos</th>
                                            <th className="text-right px-3 py-2 font-semibold text-gray-700">Tiene</th>
                                            <th className="text-right px-3 py-2 font-semibold text-gray-700">Debería</th>
                                            <th className="text-right px-3 py-2 font-semibold text-gray-700">Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {descuadrados.map((c) => (
                                            <tr key={c.correo} className="border-t border-gray-100">
                                                <td className="px-3 py-2 text-gray-900">{c.cliente || '—'}</td>
                                                <td className="px-3 py-2 text-gray-600">{c.correo}</td>
                                                <td className="px-3 py-2 text-right text-gray-600">
                                                    {c.pedidosContados}
                                                    {c.duplicadosIgnorados > 0 && (
                                                        <span className="text-amber-700"> (+{c.duplicadosIgnorados} dup)</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-600">{c.saldoActual.toLocaleString('es-CR')}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-900">{c.saldoCorrecto.toLocaleString('es-CR')}</td>
                                                <td className={`px-3 py-2 text-right font-bold ${c.faltante > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                    {c.faltante > 0 ? '+' : ''}{c.faltante.toLocaleString('es-CR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <p className="text-sm font-bold text-red-900 flex items-center gap-2 mb-2">
                                    <AlertTriangle size={16} aria-hidden="true" />
                                    Esto cambia el saldo de clientes reales
                                </p>
                                <p className="text-xs text-red-800 mb-3">
                                    Solo se corrige a quien le FALTA saldo. A nadie se le quita nada.
                                    Revisá la lista de arriba antes de darle.
                                </p>
                                {!confirmando ? (
                                    <button
                                        onClick={pedirConfirmacion}
                                        disabled={ocupado}
                                        className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 active:scale-95 transition-all disabled:opacity-40"
                                    >
                                        Corregir los saldos
                                    </button>
                                ) : (
                                    <div className="bg-white border-2 border-red-300 rounded-xl p-4">
                                        <p className="text-sm text-gray-900 mb-1">
                                            Vas a corregirle el saldo a{' '}
                                            <strong>{confirmando.cantidad} clientes</strong> y acreditar{' '}
                                            <strong>{confirmando.puntos.toLocaleString('es-CR')} puntos</strong> en total.
                                        </p>
                                        <p className="text-xs text-gray-600 mb-3">
                                            Los pedidos duplicados ya están descontados.
                                            {confirmando.excluidos > 0 && (
                                                <> Quedan fuera {confirmando.excluidos} con correo inventado.</>
                                            )}
                                        </p>
                                        <label htmlFor="confirmar-cantidad" className="block text-xs font-bold text-gray-800 mb-1">
                                            Escribí {confirmando.cantidad} para confirmar:
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <input
                                                id="confirmar-cantidad"
                                                type="text"
                                                inputMode="numeric"
                                                value={textoConfirma}
                                                onChange={(e) => setTextoConfirma(e.target.value)}
                                                placeholder={String(confirmando.cantidad)}
                                                className="w-28 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                                            />
                                            <button
                                                onClick={aplicar}
                                                disabled={ocupado || textoConfirma.trim() !== String(confirmando.cantidad)}
                                                className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 active:scale-95 transition-all disabled:opacity-40"
                                            >
                                                Sí, corregir
                                            </button>
                                            <button
                                                onClick={() => { setConfirmando(null); setTextoConfirma(''); }}
                                                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
