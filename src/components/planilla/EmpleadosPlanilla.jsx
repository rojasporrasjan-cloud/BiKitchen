import React, { useState } from 'react';
import { UserPlus, Pencil, Lock } from 'lucide-react';
import FormularioEmpleado from './FormularioEmpleado';
import { tonoDe } from '../../data/planilla';
import { colones, iniciales } from '../../utils/planilla';
import { pedirALaPlanilla } from '../../utils/planillaClient';

/** Quiénes trabajan y cuánto gana cada uno por hora. */
export default function EmpleadosPlanilla({ empleados, onCambio }) {
    const [editando, setEditando] = useState(null);       // null | {} (nuevo) | empleado
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async (empleado) => {
        setGuardando(true);
        setError('');
        try {
            await pedirALaPlanilla('guardarEmpleado', { empleado });
            setEditando(null);
            onCambio();
        } catch (e) {
            setError(e.message);
        } finally {
            setGuardando(false);
        }
    };

    const handleCancelar = () => {
        setEditando(null);
        setError('');
    };

    return (
        <section className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm" aria-labelledby="titulo-empleados">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-empleados" className="text-lg font-black text-gray-900">Empleados</h2>
                {!editando && (
                    <button type="button" onClick={() => setEditando({})}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-sm font-bold rounded-xl">
                        <UserPlus size={16} aria-hidden="true" /> Agregar
                    </button>
                )}
            </div>

            {editando && (
                <div className="mt-4">
                    <FormularioEmpleado key={editando.id || 'nuevo'} empleado={editando} guardando={guardando} error={error}
                        onGuardar={handleGuardar} onCancelar={handleCancelar} />
                </div>
            )}

            {empleados.length === 0 && !editando && (
                <p className="mt-4 p-6 bg-gray-50 rounded-2xl text-center text-gray-600">
                    Agregá a las personas que trabajan en la cocina con lo que ganan por hora. Después aparecen en el reloj del iPad.
                </p>
            )}

            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {empleados.map(e => (
                    <li key={e.id} className={`flex items-center gap-3 p-3 border border-gray-100 rounded-2xl ${e.activo === false ? 'opacity-50' : ''}`}>
                        <span className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-full ${tonoDe(e.color).solido} text-white font-black`}
                            aria-hidden="true">
                            {iniciales(e.nombre)}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="flex items-center gap-1.5 font-bold text-gray-900 truncate">
                                {e.nombre}
                                {e.pin && <Lock size={12} className="text-gray-400" aria-label="Tiene PIN" />}
                            </p>
                            <p className="text-sm text-gray-600">
                                {colones(e.tarifaHora)} / hora{e.activo === false ? ' · ya no trabaja' : ''}
                            </p>
                        </div>
                        <button type="button" onClick={() => setEditando(e)} aria-label={`Editar a ${e.nombre}`}
                            className="p-2 text-gray-400 hover:text-bikitchen-orange hover:bg-orange-50 rounded-lg">
                            <Pencil size={16} aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
