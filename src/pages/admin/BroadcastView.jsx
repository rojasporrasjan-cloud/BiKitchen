import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Send, Users, Copy, Download, Check } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';
import { useAuth } from '../../context/AuthContext';
import PlantillaEditor from '../../components/admin/PlantillaEditor';
import DestinatariosTabla from '../../components/admin/DestinatariosTabla';
import EnvioKommo from '../../components/admin/EnvioKommo';
import {
    construirClientes,
    aplicarSegmento,
    SEGMENTOS
} from '../../utils/segmentacionClientes';
import {
    renderPlantilla,
    variablesDesconocidas,
    clientesConHuecos,
    PLANTILLAS_BASE
} from '../../utils/plantillasDifusion';
import { listarPlantillas } from '../../utils/firestoreDifusion';

/**
 * Listas de difusión — solo para el dueño.
 *
 * Este módulo NO manda mensajes. Arma la lista de a quién le toca qué y con qué
 * texto; el envío se hace desde Kommo. No es una limitación nuestra: la Chats API
 * de Kommo solo deja mandar por un canal que la propia integración aporte, y el
 * WhatsApp de Gina está conectado con la integración nativa de Kommo.
 *
 * Lo que sí ponemos es lo que Kommo no puede saber: en qué semana va cada pack y
 * a quién se le está por acabar. Ese dato sale de getSubscriptionProgress(), el
 * mismo que usa Packs Mensuales, para que las dos pantallas no se contradigan.
 */
export default function BroadcastView() {
    const { orders, loading } = useOrders();
    const { isSuperAdmin } = useAuth();

    const [segmentoId, setSegmentoId] = useState('renovacion');
    const [opciones, setOpciones] = useState({ dias: 7, texto: '' });
    const [texto, setTexto] = useState(PLANTILLAS_BASE[0].texto);
    const [plantillas, setPlantillas] = useState(PLANTILLAS_BASE);
    const [excluidos, setExcluidos] = useState(() => new Set());
    const [copiado, setCopiado] = useState('');

    const recargarPlantillas = useCallback(async () => {
        try {
            const guardadas = await listarPlantillas();
            // Si todavía no hay ninguna guardada, se muestran las de arranque
            setPlantillas(guardadas.length > 0 ? guardadas : PLANTILLAS_BASE);
        } catch (error) {
            console.error('[Difusión] Error cargando plantillas:', error);
        }
    }, []);

    // `vivo` evita escribir estado si el usuario se va de la pantalla antes de
    // que Firestore conteste
    useEffect(() => {
        let vivo = true;
        listarPlantillas()
            .then((guardadas) => {
                if (vivo && guardadas.length > 0) setPlantillas(guardadas);
            })
            .catch((error) => console.error('[Difusión] Error cargando plantillas:', error));
        return () => { vivo = false; };
    }, []);

    const segmento = SEGMENTOS.find((s) => s.id === segmentoId);

    const clientes = useMemo(() => construirClientes(orders), [orders]);
    const candidatos = useMemo(
        () => aplicarSegmento(clientes, segmentoId, opciones),
        [clientes, segmentoId, opciones]
    );
    // Los que quedan después de destildar a mano
    const destinatarios = useMemo(
        () => candidatos.filter((c) => !excluidos.has(c.telefono)),
        [candidatos, excluidos]
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
        setOpciones({ dias: s?.opcion?.valor ?? 7, texto: '' });
        setExcluidos(new Set()); // otro segmento, otras exclusiones
    };

    const alternar = (telefono) => setExcluidos((prev) => {
        const siguiente = new Set(prev);
        if (siguiente.has(telefono)) siguiente.delete(telefono);
        else siguiente.add(telefono);
        return siguiente;
    });

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
            ['Nombre', 'Telefono', 'Correo', 'Zona', 'Ultimo pack', 'Avance', 'Proxima entrega', 'Mensaje'],
            ...destinatarios.map((c) => [
                c.nombre, c.telefonoOriginal || c.telefono, c.correo, c.zona,
                c.planes[0] || '', c.suscripcion.etiqueta, c.suscripcion.proxima || '',
                renderPlantilla(texto, c)
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
                                min="0"
                                value={opciones.dias}
                                onChange={(e) => setOpciones({ ...opciones, dias: Number(e.target.value) || 0 })}
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
                        {excluidos.size > 0 && ` (${excluidos.size} destildado${excluidos.size > 1 ? 's' : ''})`}
                        {loading && ' — todavía cargando pedidos…'}
                    </span>
                    <p className="text-[11px] text-gray-600 mt-1">
                        Los que pidieron no recibir promociones quedan fuera siempre.
                    </p>
                </div>
            </section>

            {/* 2. Qué se les dice */}
            <PlantillaEditor
                plantillas={plantillas}
                recargar={recargarPlantillas}
                texto={texto}
                onTextoChange={setTexto}
                desconocidas={desconocidas}
                conHuecos={conHuecos}
            />

            {/* 3. Vista previa y salida */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-3">3. Cómo queda</h2>

                {ejemplo ? (
                    <>
                        <div className="bg-[#DCF8C6] rounded-xl px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap max-w-md">
                            {renderPlantilla(texto, ejemplo)}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Ejemplo con {ejemplo.nombre}. Cada quien recibe el suyo con sus datos.
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-gray-500">
                        No hay clientes seleccionados, así que no hay nada que previsualizar.
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

                <DestinatariosTabla
                    candidatos={candidatos}
                    excluidos={excluidos}
                    onAlternar={alternar}
                />
            </section>

            <EnvioKommo destinatarios={destinatarios} segmentoId={segmentoId} />
        </div>
    );
}
