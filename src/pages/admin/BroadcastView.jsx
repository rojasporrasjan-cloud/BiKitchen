import React, { useState, useMemo } from 'react';
import { Send, Users, Copy, Download, AlertTriangle, Check, MessageCircle } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';
import { useAuth } from '../../context/AuthContext';
import {
    construirClientes,
    aplicarSegmento,
    SEGMENTOS
} from '../../utils/segmentacionClientes';
import {
    renderPlantilla,
    variablesDesconocidas,
    clientesConHuecos,
    PLANTILLAS_BASE,
    VARIABLES
} from '../../utils/plantillasDifusion';

/**
 * Listas de difusión — solo para el dueño.
 *
 * Este módulo NO manda mensajes. Arma la lista de a quién le toca qué y con qué
 * texto; el envío se hace desde Kommo. No es una limitación nuestra: la Chats API
 * de Kommo solo deja mandar por un canal que la propia integración aporte, y el
 * WhatsApp de Gina está conectado con la integración nativa de Kommo.
 *
 * Lo que sí ponemos es lo que Kommo no puede saber: en qué semana va cada pack,
 * quién está por quedarse sin comida, quién hace rato no pide.
 */
export default function BroadcastView() {
    const { orders, loading } = useOrders();
    const { isSuperAdmin } = useAuth();

    const [segmentoId, setSegmentoId] = useState('renovacion');
    const [opciones, setOpciones] = useState({ dias: 7, texto: '' });
    const [texto, setTexto] = useState(PLANTILLAS_BASE[0].texto);
    const [copiado, setCopiado] = useState('');

    const segmento = SEGMENTOS.find((s) => s.id === segmentoId);

    const clientes = useMemo(() => construirClientes(orders), [orders]);
    const destinatarios = useMemo(
        () => aplicarSegmento(clientes, segmentoId, opciones),
        [clientes, segmentoId, opciones]
    );

    const desconocidas = useMemo(() => variablesDesconocidas(texto), [texto]);
    const conHuecos = useMemo(
        () => clientesConHuecos(texto, destinatarios),
        [texto, destinatarios]
    );

    if (!isSuperAdmin()) {
        return <div className="p-8 text-center text-gray-600">Esta sección es solo para el dueño.</div>;
    }

    const elegirSegmento = (id) => {
        const s = SEGMENTOS.find((x) => x.id === id);
        setSegmentoId(id);
        setOpciones({ dias: s?.opcion?.valor ?? 7, texto: s?.opcion?.campo === 'texto' ? '' : '' });
    };

    const avisar = (que) => {
        setCopiado(que);
        setTimeout(() => setCopiado(''), 2000);
    };

    const copiarNumeros = () => {
        navigator.clipboard.writeText(destinatarios.map((c) => c.telefonoOriginal || c.telefono).join('\n'));
        avisar('numeros');
    };

    const descargarCSV = () => {
        const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const filas = [
            ['Nombre', 'Telefono', 'Correo', 'Zona', 'Ultimo pack', 'Mensaje'],
            ...destinatarios.map((c) => [
                c.nombre, c.telefonoOriginal || c.telefono, c.correo, c.zona,
                c.planes[0] || '', renderPlantilla(texto, c)
            ])
        ];
        // BOM para que Excel abra las tildes bien
        const csv = '﻿' + filas.map((f) => f.map(escapar).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `difusion_${segmentoId}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        avisar('csv');
    };

    const ejemplo = destinatarios[0];

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Send size={24} className="text-bikitchen-orange" aria-hidden="true" />
                    Listas de Difusión
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Armá la lista y el mensaje acá. El envío se hace desde Kommo.
                </p>
            </header>

            {/* 1. A quién */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 mb-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Users size={16} aria-hidden="true" /> 1. ¿A quién?
                </h2>

                <div className="flex flex-wrap gap-2">
                    {SEGMENTOS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => elegirSegmento(s.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                segmentoId === s.id
                                    ? 'bg-bikitchen-orange text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <p className="text-xs text-gray-600 mt-3">{segmento?.descripcion}</p>

                {segmento?.opcion && (
                    <div className="mt-3 flex items-center gap-2">
                        <label htmlFor="opcion-segmento" className="text-xs font-semibold text-gray-700">
                            {segmento.opcion.label}:
                        </label>
                        {segmento.opcion.campo === 'dias' ? (
                            <input
                                id="opcion-segmento"
                                type="number"
                                min="1"
                                value={opciones.dias}
                                onChange={(e) => setOpciones({ ...opciones, dias: Number(e.target.value) || 1 })}
                                className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                            />
                        ) : (
                            <input
                                id="opcion-segmento"
                                type="text"
                                value={opciones.texto}
                                onChange={(e) => setOpciones({ ...opciones, texto: e.target.value })}
                                placeholder="Escribí para buscar"
                                className="flex-1 max-w-xs px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                            />
                        )}
                    </div>
                )}

                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                    <span className="text-2xl font-black text-bikitchen-orange">{destinatarios.length}</span>
                    <span className="text-sm text-gray-700 ml-2">
                        {destinatarios.length === 1 ? 'cliente' : 'clientes'}
                        {loading && ' (todavía cargando pedidos…)'}
                    </span>
                    <p className="text-[11px] text-gray-600 mt-1">
                        Los que pidieron no recibir promociones quedan fuera siempre.
                    </p>
                </div>
            </section>

            {/* 2. Qué se les dice */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 mb-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageCircle size={16} aria-hidden="true" /> 2. ¿Qué se les dice?
                </h2>

                <div className="flex flex-wrap gap-2 mb-3">
                    {PLANTILLAS_BASE.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setTexto(p.texto)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
                        >
                            {p.nombre}
                        </button>
                    ))}
                </div>

                <label htmlFor="texto-mensaje" className="sr-only">Texto del mensaje</label>
                <textarea
                    id="texto-mensaje"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                    {VARIABLES.map((v) => (
                        <button
                            key={v.clave}
                            onClick={() => setTexto((t) => `${t}{{${v.clave}}}`)}
                            title={v.descripcion}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[11px] font-mono hover:bg-blue-100 transition-colors"
                        >
                            {`{{${v.clave}}}`}
                        </button>
                    ))}
                </div>

                {desconocidas.length > 0 && (
                    <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                            Estas variables no existen y se van a mandar tal cual:{' '}
                            <strong>{desconocidas.map((d) => `{{${d}}}`).join(', ')}</strong>
                        </span>
                    </p>
                )}

                {conHuecos.length > 0 && (
                    <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                            A <strong>{conHuecos.length}</strong> {conHuecos.length === 1 ? 'cliente le' : 'clientes les'}
                            {' '}falta algún dato y el mensaje les llegaría con un espacio en blanco
                            ({conHuecos.slice(0, 3).map((c) => c.nombre).join(', ')}
                            {conHuecos.length > 3 ? '…' : ''}).
                        </span>
                    </p>
                )}
            </section>

            {/* 3. Vista previa y salida */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-3">3. Cómo queda</h2>

                {ejemplo ? (
                    <div className="bg-[#DCF8C6] rounded-xl px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap max-w-md">
                        {renderPlantilla(texto, ejemplo)}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">
                        No hay clientes en este segmento, así que no hay nada que previsualizar.
                    </p>
                )}
                {ejemplo && (
                    <p className="text-[11px] text-gray-500 mt-1.5">
                        Ejemplo con {ejemplo.nombre}. Cada quien recibe el suyo con sus datos.
                    </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                    <button
                        onClick={descargarCSV}
                        disabled={destinatarios.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40"
                    >
                        {copiado === 'csv' ? <Check size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                        Descargar CSV para Kommo
                    </button>
                    <button
                        onClick={copiarNumeros}
                        disabled={destinatarios.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm font-bold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-40"
                    >
                        {copiado === 'numeros' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        Copiar los números
                    </button>
                </div>

                {destinatarios.length > 0 && (
                    <div className="mt-4 max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Cliente</th>
                                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Teléfono</th>
                                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Zona</th>
                                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Última entrega</th>
                                </tr>
                            </thead>
                            <tbody>
                                {destinatarios.map((c) => (
                                    <tr key={c.telefono} className="border-t border-gray-100">
                                        <td className="px-3 py-2 text-gray-900">{c.nombre}</td>
                                        <td className="px-3 py-2 text-gray-600">{c.telefonoOriginal || c.telefono}</td>
                                        <td className="px-3 py-2 text-gray-600">{c.zona || '—'}</td>
                                        <td className="px-3 py-2 text-gray-600">{c.ultimaEntrega || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
