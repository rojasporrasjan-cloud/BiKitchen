import React, { useState, useMemo } from 'react';
import { MessageCircle, Search, CheckCircle, AlertTriangle, Package, Lock } from 'lucide-react';
import { collection, query, where, getDocs, limit, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrdersContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ImportedOrderPreview from '../../components/admin/ImportedOrderPreview';
import { extractOrderNumbers, parseOrderBlock } from '../../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore, resolverCorreo } from '../../utils/buildPedidoFromImport';
import { nivelPorPuntos } from '../../config/loyalty';
import { upsertClient } from '../../services/clientService';
import { formatPrice } from '../../utils/formatters';
import { getOrderStatusLabel, CONFIRMABLE_STATUSES } from '../../config/orderStatus';

/**
 * Importador de pedidos desde el texto que reenvía la administración.
 *
 * Se ancla al número de pedido y NO confía en el resto del texto pegado: una vez
 * ubicado el pedido, todo lo que se muestra sale de Firestore. Así el texto no
 * puede alterar un pedido real por venir mal copiado.
 *
 * La confirmación pasa por updateOrderStatus() y no por un updateDoc directo,
 * para que se otorguen los BiPuntos y el bono de referido igual que siempre.
 */
export default function WhatsAppImportView() {
    const { isSuperAdmin, currentUser } = useAuth();
    const { updateOrderStatus } = useOrders();

    const [rawText, setRawText] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [notice, setNotice] = useState(null);
    const [draft, setDraft] = useState(null);
    const [edits, setEdits] = useState({});
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(null);

    /**
     * El pedido se recalcula con lo que el usuario corrigió a mano.
     *
     * Hace falta porque el mensaje de WhatsApp NO trae teléfono ni correo, y
     * Firestore exige los dos para crear el pedido. Sin poder completarlos,
     * ningún pedido pegado desde WhatsApp se podría guardar.
     *
     * Va ANTES del guard de permisos a propósito: los hooks tienen que llamarse
     * siempre en el mismo orden. Al cargar la página currentUser todavía es null,
     * así que isSuperAdmin() pasa de false a true y React reventaría si el hook
     * quedara del otro lado del return.
     */
    const draftPedido = useMemo(() => {
        if (!draft) return null;

        const merged = {
            ...draft.parsed,
            ...(edits.cliente !== undefined && { cliente: edits.cliente }),
            ...(edits.telefono !== undefined && { telefono: edits.telefono }),
            ...(edits.correo !== undefined && { correo: edits.correo }),
            ...(edits.zona !== undefined && { zona: edits.zona }),
            ...(edits.direccion !== undefined && { direccion: edits.direccion }),
            ...(edits.total !== undefined && { total: edits.total !== '' ? Number(edits.total) : null }),
            ...(edits.costoEnvio !== undefined && { costoEnvio: edits.costoEnvio !== '' ? Number(edits.costoEnvio) : 0 }),
            ...(edits.fecha && { fechasEntrega: [edits.fecha] }),
            // Permite corregir precios de ítems e instrucciones/proteínas
            items: (draft.parsed.items || []).map((item, i) => {
                const customPrice = edits[`precio_${i}`];
                const customProt = edits[`proteinas_${i}`];
                return {
                    ...item,
                    ...(customPrice !== undefined && { precio: customPrice !== '' ? Number(customPrice) : item.precio }),
                    ...(customProt !== undefined && {
                        proteinas: customProt
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean)
                    })
                };
            })
        };

        const pedido = buildPedidoFromImport(merged, {
            createdBy: currentUser?.email || 'admin'
        });

        return { merged, pedido, problems: validatePedidoForFirestore(pedido) };
    }, [draft, edits, currentUser]);

    if (!isSuperAdmin()) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Lock size={48} className="text-gray-300 mb-4" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="text-gray-500 mt-1">Esta herramienta es solo para el dueño.</p>
            </div>
        );
    }

    const handleSearch = async () => {
        const numbers = extractOrderNumbers(rawText);
        setNotice(null);
        setResults([]);

        if (numbers.length === 0) {
            setNotice({
                type: 'warn',
                text: 'No encontré ningún número de pedido en el texto. Tiene que aparecer como #ORD-XXXXXX.'
            });
            return;
        }

        setSearching(true);
        try {
            const found = await Promise.all(numbers.map(async (numeroOrden) => {
                const snap = await getDocs(query(
                    collection(db, 'pedidos'),
                    where('numeroOrden', '==', numeroOrden),
                    limit(1)
                ));
                if (snap.empty) return { numeroOrden, found: false };
                return {
                    numeroOrden,
                    found: true,
                    docId: snap.docs[0].id,
                    order: snap.docs[0].data()
                };
            }));
            setResults(found);
        } catch (error) {
            console.error('[Importador] Error buscando pedidos:', error);
            setNotice({ type: 'error', text: 'Error buscando los pedidos. Revisá la conexión e intentá de nuevo.' });
        } finally {
            setSearching(false);
        }
    };

    const patchResult = (numeroOrden, patch) => {
        setResults(prev => prev.map(r => (r.numeroOrden === numeroOrden ? { ...r, ...patch } : r)));
    };

    const handleConfirm = async (result) => {
        patchResult(result.numeroOrden, { confirming: true, error: null });
        try {
            await updateOrderStatus(result.docId, 'confirmed');
            patchResult(result.numeroOrden, {
                confirming: false,
                justConfirmed: true,
                order: { ...result.order, status: 'confirmed' }
            });
        } catch (error) {
            console.error('[Importador] Error confirmando pedido:', error);
            patchResult(result.numeroOrden, {
                confirming: false,
                error: 'No se pudo confirmar. Revisá los permisos e intentá de nuevo.'
            });
        }
    };

    /** Lee TODO el texto pegado como un pedido nuevo y arma la vista previa. */
    const handlePrepareDraft = () => {
        setDraft({ parsed: parseOrderBlock(rawText) });
        setEdits({});
        setCreated(null);
    };

    /**
     * @param {boolean} confirmar - true = además marcarlo confirmado.
     *
     * Confirmar importa para la hoja impresa: la pantalla de Producción muestra
     * todos los pedidos, pero la hoja que se imprime para cocina y empaque SOLO
     * incluye los confirmados. Un pedido sin confirmar se ve en pantalla y no
     * sale impreso.
     */
    const handleCreate = async (confirmar = false) => {
        if (!draftPedido || draftPedido.problems.length > 0) return;
        setCreating(true);
        try {
            // Si el cliente ya tiene cuenta de BiPuntos, se usa SU nivel para
            // calcular los puntos. Sin esto, un cliente Oro que pide por WhatsApp
            // recibiría la tasa base y menos puntos que comprando en la web.
            let nivelCliente = null;
            const { correo, esPlaceholder } = resolverCorreo(
                draftPedido.merged.correo,
                draftPedido.merged.telefono
            );
            if (correo && !esPlaceholder) {
                try {
                    const snap = await getDoc(doc(db, 'loyalty', correo));
                    nivelCliente = nivelPorPuntos(snap.exists() ? snap.data().totalEarned : 0);
                } catch (nivelErr) {
                    console.warn('[Importador] No se pudo leer el nivel de BiPuntos:', nivelErr.message);
                }
            }

            const pedido = buildPedidoFromImport(draftPedido.merged, {
                createdBy: currentUser?.email || 'admin',
                nivelCliente
            });

            const ref = await addDoc(collection(db, 'pedidos'), pedido);

            // Registrar al cliente en el CRM, igual que hace el checkout de la web.
            // upsertClient busca primero por correo y después por teléfono, así que
            // un cliente que vuelve a pedir NO se duplica: se le suma el pedido.
            //
            // OJO: si el correo es inventado no se manda, para que el cliente quede
            // identificado por su teléfono. Si se mandara, se crearía una ficha con
            // un correo falso que después no cruzaría con el real del cliente.
            try {
                await upsertClient({
                    nombre: pedido.cliente,
                    telefono: pedido.telefono,
                    correo: pedido.correoEsPlaceholder ? undefined : pedido.correo,
                    direccion: pedido.direccion
                });
            } catch (crmError) {
                // Que falle el CRM no puede tumbar el pedido, que es lo importante
                console.error('[Importador] Error registrando el cliente:', crmError);
            }

            // Confirmar pasa por updateOrderStatus, que es el único camino que
            // otorga BiPuntos y bono de referido.
            if (confirmar) {
                await updateOrderStatus(ref.id, 'confirmed');
            }

            const finalOrder = confirmar
                ? { ...pedido, status: 'confirmed' }
                : pedido;

            setCreated({ numeroOrden: pedido.numeroOrden, docId: ref.id, confirmado: confirmar });

            setResults(prev => [...prev, {
                numeroOrden: pedido.numeroOrden,
                found: true,
                docId: ref.id,
                order: finalOrder
            }]);
        } catch (error) {
            console.error('[Importador] Error creando pedido:', error);
            setNotice({
                type: 'error',
                text: 'Firebase rechazó el pedido. Suele ser por las reglas de Firestore: revisá que la regla de create de /pedidos/ permita este documento.'
            });
        } finally {
            setCreating(false);
        }
    };

    const pendientes = results.filter(r => r.found && CONFIRMABLE_STATUSES.includes(r.order.status));
    const noEncontrados = results.filter(r => !r.found);

    return (
        <div className="space-y-6 pb-20">
            <AdminPageHeader
                icon={MessageCircle}
                title="Importar pedidos de WhatsApp"
                subtitle="Pegá el texto del pedido y confirmalo sin digitar nada"
                stats={results.length > 0 ? [
                    { value: results.length, label: 'Detectados' },
                    { value: pendientes.length, label: 'Por confirmar' },
                    { value: noEncontrados.length, label: 'No están en el sistema' }
                ] : []}
                gradient="from-green-600 via-emerald-500 to-teal-500"
            />

            {/* Entrada de texto */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-6">
                <label htmlFor="raw-order-text" className="block text-sm font-bold text-gray-700 mb-2">
                    Texto del pedido
                </label>
                <textarea
                    id="raw-order-text"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={'Pegá acá el correo de aviso o el mensaje de WhatsApp completo.\n\nPodés pegar varios pedidos de una vez.'}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all outline-none resize-y min-h-[220px] font-mono text-sm"
                />

                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                    <button
                        onClick={handleSearch}
                        disabled={searching || !rawText.trim()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {searching ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" aria-hidden="true" />
                        ) : (
                            <><Search size={20} aria-hidden="true" /> Buscar pedidos</>
                        )}
                    </button>

                    <button
                        onClick={handlePrepareDraft}
                        disabled={!rawText.trim()}
                        className="w-full sm:w-auto px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all disabled:opacity-50"
                    >
                        Es un pedido nuevo del chat
                    </button>

                    {rawText && (
                        <button
                            onClick={() => {
                                setRawText(''); setResults([]); setNotice(null);
                                setDraft(null); setCreated(null); setEdits({});
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {notice && (
                    <div className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
                        }`}>
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {notice.text}
                    </div>
                )}
            </div>

            {/* Vista previa de un pedido manual, antes de crearlo */}
            {draftPedido && (
                <ImportedOrderPreview
                    parsed={draftPedido.merged}
                    pedido={draftPedido.pedido}
                    problems={draftPedido.problems}
                    warnings={draft.parsed.warnings}
                    creating={creating}
                    created={created}
                    onCreate={handleCreate}
                    onEdit={(campo, valor) => setEdits(prev => ({ ...prev, [campo]: valor }))}
                />
            )}

            {/* Resultados */}
            {results.map((result) => (
                <div
                    key={result.numeroOrden}
                    className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-5"
                >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                            <Package size={20} className="text-gray-400 mt-1 shrink-0" aria-hidden="true" />
                            <div>
                                <p className="font-bold text-gray-900">{result.numeroOrden}</p>

                                {result.found ? (
                                    <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                        <p>{result.order.cliente || 'Sin nombre'} · {result.order.telefono || 'sin teléfono'}</p>
                                        <p>
                                            {formatPrice(result.order.total || 0)}
                                            {result.order.fecha_entrega ? ` · entrega ${result.order.fecha_entrega}` : ''}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Estado: <span className="font-medium">{getOrderStatusLabel(result.order.status)}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-700 mt-1">
                                        No está en el sistema — es un pedido manual del chat.
                                        Crearlo desde acá todavía no está disponible.
                                    </p>
                                )}

                                {result.error && (
                                    <p className="text-sm text-red-600 mt-2 font-medium">{result.error}</p>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0">
                            {result.found && result.justConfirmed && (
                                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
                                    <CheckCircle size={16} aria-hidden="true" />
                                    Confirmado
                                </span>
                            )}

                            {result.found && !result.justConfirmed && CONFIRMABLE_STATUSES.includes(result.order.status) && (
                                <button
                                    onClick={() => handleConfirm(result)}
                                    disabled={result.confirming}
                                    className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {result.confirming ? 'Confirmando…' : '✅ Confirmar pago'}
                                </button>
                            )}

                            {result.found && !result.justConfirmed && !CONFIRMABLE_STATUSES.includes(result.order.status) && (
                                <span className="text-xs text-gray-500">
                                    {result.order.status === 'cancelled'
                                        ? 'Cancelado — reactivalo desde Pedidos'
                                        : 'Ya estaba confirmado'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
