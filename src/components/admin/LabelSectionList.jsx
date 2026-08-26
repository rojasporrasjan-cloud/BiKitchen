import React from 'react';
import { Tag } from 'lucide-react';
import LabelGroupCard from './LabelGroupCard';
import { estadoSeccion, estaIncluido } from '../../utils/labels/labelSelection';

/**
 * Las proteínas agrupadas por tipo de plan, con su casilla para incluir o
 * quitar la sección entera.
 *
 * La casilla tiene tres estados —todas, algunas, ninguna— porque con solo dos
 * no se distingue "quité una" de "no hay ninguna", y era imposible saber en qué
 * quedó la selección de un vistazo.
 */
export default function LabelSectionList({
    secciones, hayGrupos, cargando,
    excluded, onToggleSeccion, onToggleGrupo,
    settings, logo, expirationDateTexto,
    onPreview, onReprint, reprintQty, onReprintQtyChange, canReprint
}) {
    if (!hayGrupos) {
        return (
            <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-100 text-center">
                <Tag size={32} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="font-bold text-gray-700">No hay etiquetas para esta fecha</p>
                <p className="text-sm text-gray-500 mt-1">
                    {cargando ? 'Cargando pedidos…' : 'No se encontraron pedidos confirmados con entrega este día.'}
                </p>
            </div>
        );
    }

    return secciones.map(seccion => {
        const ids = seccion.grupos.map(g => g.id);
        const estado = estadoSeccion(excluded, ids);

        return (
            <div key={seccion.tipo}>
                <button
                    onClick={() => onToggleSeccion(ids)}
                    className="w-full flex items-center gap-3 mb-3 group text-left"
                    aria-label={`${estado === 'todos' ? 'Quitar' : 'Incluir'} todas las etiquetas de ${seccion.tipo}`}
                >
                    <span
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            estado === 'ninguno'
                                ? 'bg-white border-gray-300 group-hover:border-bikitchen-orange'
                                : 'bg-bikitchen-orange border-bikitchen-orange'
                        }`}
                        aria-hidden="true"
                    >
                        {estado === 'todos' && (
                            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none">
                                <path d="M2 6.5 4.5 9 10 3.5" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                        {estado === 'algunos' && (
                            <span className="w-2.5 h-0.5 bg-white rounded-full" />
                        )}
                    </span>

                    <h3 className="font-black text-gray-900 text-lg">{seccion.tipo}</h3>
                    <span className="px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-bold">
                        {seccion.total} etiquetas
                    </span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {seccion.grupos.map(grupo => (
                        <LabelGroupCard
                            key={grupo.id}
                            grupo={grupo}
                            settings={settings}
                            logo={logo}
                            expirationDate={expirationDateTexto}
                            selected={estaIncluido(excluded, grupo.id)}
                            onToggle={() => onToggleGrupo(grupo.id)}
                            onPreview={() => onPreview(grupo.id)}
                            onReprint={() => onReprint(grupo)}
                            reprintQty={reprintQty[grupo.id] ?? 1}
                            onReprintQtyChange={(v) => onReprintQtyChange(grupo.id, v)}
                            canReprint={canReprint}
                        />
                    ))}
                </div>
            </div>
        );
    });
}
