import React, { useState } from 'react';
import { X } from 'lucide-react';
import { COLORES_EMPLEADO, tonoDe } from '../../data/planilla';

/** Agregar o editar un empleado: nombre, cuánto gana por hora, PIN y color. */
export default function FormularioEmpleado({ empleado, guardando, error, onGuardar, onCancelar }) {
    const [nombre, setNombre] = useState(empleado?.nombre || '');
    const [tarifaHora, setTarifaHora] = useState(empleado?.tarifaHora ?? '');
    const [pin, setPin] = useState(empleado?.pin || '');
    const [color, setColor] = useState(empleado?.color || COLORES_EMPLEADO[0]);
    const [activo, setActivo] = useState(empleado?.activo !== false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onGuardar({ id: empleado?.id, nombre, tarifaHora: Number(tarifaHora), pin, color, activo });
    };

    const campo = 'w-full mt-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-bikitchen-orange focus:outline-none';

    return (
        <form onSubmit={handleSubmit} className="relative p-5 bg-orange-50/60 border border-orange-100 rounded-2xl">
            <button type="button" onClick={onCancelar} aria-label="Cancelar"
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                <X size={18} aria-hidden="true" />
            </button>
            <h3 className="font-black text-gray-900">{empleado?.id ? `Editar a ${empleado.nombre}` : 'Agregar empleado'}</h3>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <label className="text-sm font-bold text-gray-700">
                    Nombre
                    <input className={campo} value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Isabel" />
                </label>
                <label className="text-sm font-bold text-gray-700">
                    ₡ por hora
                    <input className={campo} type="number" inputMode="numeric" min="0" step="1" value={tarifaHora}
                        onChange={e => setTarifaHora(e.target.value)} required placeholder="Ej: 1600" />
                </label>
                <label className="text-sm font-bold text-gray-700">
                    PIN <span className="font-normal text-gray-500">(opcional, 4 números)</span>
                    <input className={campo} inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Sin PIN" />
                </label>
            </div>
            <fieldset className="mt-4">
                <legend className="text-sm font-bold text-gray-700">Color en el reloj</legend>
                <div className="flex flex-wrap gap-2 mt-2">
                    {COLORES_EMPLEADO.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                            className={`w-9 h-9 rounded-full ${tonoDe(c).solido} transition-transform ${color === c ? 'ring-4 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'}`} />
                    ))}
                </div>
            </fieldset>
            <label className="flex items-center gap-2 mt-4 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="w-4 h-4 accent-bikitchen-orange" />
                Trabaja aquí (sale en el reloj)
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
            <div className="flex gap-2 mt-4">
                <button type="submit" disabled={guardando}
                    className="px-5 py-2.5 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold rounded-xl disabled:opacity-40">
                    {guardando ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" onClick={onCancelar} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl">
                    Cancelar
                </button>
            </div>
        </form>
    );
}
