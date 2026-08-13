import React, { useState } from 'react';
import { Phone, RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Users, Package } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { toCRInternational, formatCRPhone } from '../../utils/phoneUtils';

/**
 * PhoneAuditView — revisión de solo lectura de los teléfonos guardados.
 *
 * No modifica nada: solo lista los registros cuyo teléfono no se puede usar
 * para armar un link de WhatsApp, o que están guardados en un formato distinto
 * al resto (con código de país incluido).
 */

const STATUS = {
    INVALID: 'invalid',
    PREFIXED: 'prefixed',
    OK: 'ok'
};

function classifyPhone(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return STATUS.INVALID;
    if (!toCRInternational(value)) return STATUS.INVALID;

    // Guardado con el código de país incluido (11 dígitos)
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) return STATUS.PREFIXED;

    return STATUS.OK;
}

export default function PhoneAuditView() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            // 'pedidos' es donde viven los pedidos reales. Antes se leía 'orders',
            // que es la colección vieja en la que ya nadie escribe: la auditoría
            // no veía ni uno solo de los pedidos actuales.
            const [clientesSnap, ordersSnap] = await Promise.all([
                getDocs(collection(db, 'clientes')),
                getDocs(collection(db, 'pedidos'))
            ]);

            const rows = [];
            let okCount = 0;

            clientesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                const raw = data.telefono;
                const status = classifyPhone(raw);
                if (status === STATUS.OK) { okCount++; return; }
                rows.push({
                    id: docSnap.id,
                    origen: 'Cliente',
                    nombre: data.nombre || '(sin nombre)',
                    telefono: raw,
                    status
                });
            });

            ordersSnap.forEach((docSnap) => {
                const data = docSnap.data();
                const raw = data.telefono ?? data.details?.phone ?? data.detalles_entrega?.telefono;
                const status = classifyPhone(raw);
                if (status === STATUS.OK) { okCount++; return; }
                rows.push({
                    id: docSnap.id,
                    origen: 'Pedido',
                    // En 'pedidos' el nombre va en `cliente`
                    nombre: data.cliente || data.nombre || data.details?.name || '(sin nombre)',
                    telefono: raw,
                    status
                });
            });

            // Los inválidos primero: son los que rompen el contacto
            rows.sort((a, b) => (a.status === b.status ? 0 : a.status === STATUS.INVALID ? -1 : 1));

            setResults({
                rows,
                okCount,
                total: clientesSnap.size + ordersSnap.size,
                clientes: clientesSnap.size,
                orders: ordersSnap.size
            });
        } catch (err) {
            console.error('[PhoneAuditView] Error leyendo teléfonos:', err);
            setError(err.message || 'No se pudo leer la base de datos');
        } finally {
            setLoading(false);
        }
    };

    const invalidCount = results?.rows.filter(r => r.status === STATUS.INVALID).length ?? 0;
    const prefixedCount = results?.rows.filter(r => r.status === STATUS.PREFIXED).length ?? 0;

    return (
        <div className="p-4 sm:p-6">
            <AdminPageHeader
                title="Revisión de Teléfonos"
                subtitle="Busca teléfonos guardados que no sirven para contactar al cliente"
                icon={Phone}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-blue-900">
                    Esta página <span className="font-bold">solo lee</span> la información: no cambia
                    ni borra nada. Sirve para ver a cuáles clientes no les vas a poder escribir por
                    WhatsApp desde el panel.
                </p>
            </div>

            <button
                onClick={runAudit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-bikitchen-orange text-white font-bold rounded-xl hover:bg-bikitchen-orange-dark active:scale-[0.98] transition-all disabled:opacity-60 mb-6"
            >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                {loading ? 'Revisando...' : 'Revisar teléfonos'}
            </button>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-bold text-red-900">No se pudo completar la revisión</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {results && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle size={16} className="text-green-600" aria-hidden="true" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Correctos</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{results.okCount}</p>
                            <p className="text-xs text-gray-500 mt-1">de {results.total} registros</p>
                        </div>

                        <div className="bg-white border border-red-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle size={16} className="text-red-600" aria-hidden="true" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">No se puede contactar</span>
                            </div>
                            <p className="text-3xl font-black text-red-600">{invalidCount}</p>
                            <p className="text-xs text-gray-500 mt-1">teléfono vacío o inválido</p>
                        </div>

                        <div className="bg-white border border-amber-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={16} className="text-amber-600" aria-hidden="true" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Formato distinto</span>
                            </div>
                            <p className="text-3xl font-black text-amber-600">{prefixedCount}</p>
                            <p className="text-xs text-gray-500 mt-1">guardado con el 506 adelante</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        Revisados <span className="font-bold">{results.clientes}</span> clientes y{' '}
                        <span className="font-bold">{results.orders}</span> pedidos.
                    </p>

                    {results.rows.length === 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <CheckCircle size={32} className="text-green-600 mx-auto mb-2" aria-hidden="true" />
                            <p className="font-bold text-green-900">Todos los teléfonos están bien</p>
                            <p className="text-sm text-green-700">No hay nada que corregir.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-bold text-gray-600">Estado</th>
                                            <th className="text-left px-4 py-3 font-bold text-gray-600">Origen</th>
                                            <th className="text-left px-4 py-3 font-bold text-gray-600">Nombre</th>
                                            <th className="text-left px-4 py-3 font-bold text-gray-600">Teléfono guardado</th>
                                            <th className="text-left px-4 py-3 font-bold text-gray-600">Debería ser</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.rows.map((row) => (
                                            <tr key={`${row.origen}-${row.id}`} className="border-b border-gray-100 last:border-0">
                                                <td className="px-4 py-3">
                                                    {row.status === STATUS.INVALID ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                                                            <AlertCircle size={12} aria-hidden="true" />
                                                            Inválido
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                                                            <AlertTriangle size={12} aria-hidden="true" />
                                                            Con 506
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-gray-600">
                                                        {row.origen === 'Cliente'
                                                            ? <Users size={13} aria-hidden="true" />
                                                            : <Package size={13} aria-hidden="true" />}
                                                        {row.origen}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 font-medium">{row.nombre}</td>
                                                <td className="px-4 py-3 font-mono text-gray-700">
                                                    {row.telefono ? String(row.telefono) : <span className="text-gray-400 italic">vacío</span>}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-700">
                                                    {row.status === STATUS.PREFIXED
                                                        ? formatCRPhone(row.telefono)
                                                        : <span className="text-gray-400">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
