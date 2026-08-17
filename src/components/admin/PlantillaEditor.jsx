import React, { useState } from 'react';
import { Save, Trash2, Plus, AlertTriangle, MessageCircle } from 'lucide-react';
import {
    crearPlantilla,
    actualizarPlantilla,
    borrarPlantilla
} from '../../utils/firestoreDifusion';
import { VARIABLES } from '../../utils/plantillasDifusion';

/**
 * Editor de las plantillas de difusión.
 *
 * Las plantillas viven en Firestore, así que se crean y editan desde acá sin
 * tocar el código. El texto que quede seleccionado se manda hacia arriba para
 * que la pantalla arme la vista previa y la exportación.
 */
export default function PlantillaEditor({
    plantillas,
    recargar,
    texto,
    onTextoChange,
    desconocidas = [],
    conHuecos = []
}) {
    const [activaId, setActivaId] = useState(null);
    const [nombre, setNombre] = useState('');
    const [nombreMeta, setNombreMeta] = useState('');
    const [guardando, setGuardando] = useState(false);

    const abrir = (p) => {
        setActivaId(p.id || null);
        setNombre(p.nombre || '');
        setNombreMeta(p.nombreMeta || '');
        onTextoChange(p.texto || '');
    };

    const nueva = () => {
        setActivaId(null);
        setNombre('');
        setNombreMeta('');
        onTextoChange('');
    };

    const guardar = async () => {
        if (!nombre.trim()) {
            alert('Ponele un nombre a la plantilla para poder encontrarla después.');
            return;
        }
        setGuardando(true);
        try {
            const datos = { nombre, texto, nombreMeta };
            if (activaId) await actualizarPlantilla(activaId, datos);
            else setActivaId(await crearPlantilla(datos));
            await recargar();
        } catch (error) {
            console.error('[Difusión] Error guardando la plantilla:', error);
            alert('No se pudo guardar la plantilla. Revisá la conexión e intentá de nuevo.');
        }
        setGuardando(false);
    };

    const borrar = async () => {
        if (!activaId) return;
        if (!window.confirm(`¿Borrar la plantilla "${nombre}"? No se puede deshacer.`)) return;
        try {
            await borrarPlantilla(activaId);
            await recargar();
            nueva();
        } catch (error) {
            console.error('[Difusión] Error borrando la plantilla:', error);
            alert('No se pudo borrar la plantilla.');
        }
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 mb-4">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle size={16} aria-hidden="true" /> 2. ¿Qué se les dice?
            </h2>

            <div className="flex flex-wrap gap-2 mb-3">
                {plantillas.map((p) => (
                    <button
                        key={p.id || p.nombre}
                        onClick={() => abrir(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            activaId && activaId === p.id
                                ? 'bg-bikitchen-orange text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {p.nombre}
                    </button>
                ))}
                <button
                    onClick={nueva}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                    <Plus size={13} aria-hidden="true" /> Nueva
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-2 mb-2">
                <div>
                    <label htmlFor="plantilla-nombre" className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Nombre de la plantilla
                    </label>
                    <input
                        id="plantilla-nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Recordatorio de renovación"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="plantilla-meta" className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Plantilla aprobada en Meta <span className="font-normal text-gray-500">(opcional)</span>
                    </label>
                    <input
                        id="plantilla-meta"
                        type="text"
                        value={nombreMeta}
                        onChange={(e) => setNombreMeta(e.target.value)}
                        placeholder="Ej: renovacion_pack_v1"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
                    />
                </div>
            </div>

            <label htmlFor="texto-mensaje" className="sr-only">Texto del mensaje</label>
            <textarea
                id="texto-mensaje"
                value={texto}
                onChange={(e) => onTextoChange(e.target.value)}
                rows={6}
                placeholder="Escribí el mensaje. Usá los botones de abajo para meter los datos del cliente."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                    <button
                        key={v.clave}
                        onClick={() => onTextoChange(`${texto}{{${v.clave}}}`)}
                        title={v.descripcion}
                        className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[11px] font-mono hover:bg-blue-100 transition-colors"
                    >
                        {`{{${v.clave}}}`}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
                <button
                    onClick={guardar}
                    disabled={guardando || !texto.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bikitchen-orange text-white text-sm font-bold hover:bg-bikitchen-orange-dark active:scale-95 transition-all disabled:opacity-40"
                >
                    <Save size={15} aria-hidden="true" />
                    {guardando ? 'Guardando…' : activaId ? 'Guardar cambios' : 'Guardar como nueva'}
                </button>
                {activaId && (
                    <button
                        onClick={borrar}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 active:scale-95 transition-all"
                    >
                        <Trash2 size={15} aria-hidden="true" /> Borrar
                    </button>
                )}
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
                        {conHuecos.length > 3 ? '…' : ''}). Destildalos abajo o cambiá el texto.
                    </span>
                </p>
            )}
        </section>
    );
}
