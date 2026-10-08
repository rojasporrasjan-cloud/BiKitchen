import React, { useRef, useState } from 'react';
import { X, Trash2, Plus, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { horaCR, duracion, colones } from '../../utils/planilla';
import { FACTOR_EXTRA } from '../../data/planilla';
import { pedirALaPlanilla } from '../../utils/planillaClient';

/**
 * Un día de una persona: sus marcas, lo que se le paga, y cómo corregir.
 * Si alguien se olvidó de marcar la salida, se agrega acá con la hora real.
 */
const fechaLarga = (fecha) => new Date(`${fecha}T12:00:00`)
    .toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace('septiembre', 'setiembre');

export default function DetalleDelDia({ empleado, fecha, dia, onCambio, onCerrar }) {
    const sugerido = dia.enTurno || dia.avisos.some(a => /Falta la salida/.test(a)) ? 'salida' : 'entrada';
    const [tipo, setTipo] = useState(sugerido);
    const [hora, setHora] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');

    const enCurso = useRef(false);                      // dos clics rápidos: cuenta uno
    const correr = async (accion, datos) => {
        if (enCurso.current) return false;
        enCurso.current = true;
        setOcupado(true);
        setError('');
        try {
            await pedirALaPlanilla(accion, datos);
            await onCambio();
            return true;
        } catch (e) {
            setError(e.message);
            return false;
        } finally {
            enCurso.current = false;
            setOcupado(false);
        }
    };

    const handleAgregar = async (e) => {
        e.preventDefault();
        if (await correr('agregarMarca', { marca: { empleadoId: empleado.id, fecha, hora, tipo } })) setHora('');
    };

    const handleBorrar = (marca) => {
        if (!window.confirm(`¿Borrar la ${marca.tipo} de las ${horaCR(marca.en)}?`)) return;
        correr('borrarMarca', { id: marca.id });
    };

    const marcas = [...dia.marcas].sort((a, b) => String(a.en).localeCompare(String(b.en)));

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onCerrar}>
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-detalle" onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
                <button type="button" onClick={onCerrar} aria-label="Cerrar"
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full">
                    <X size={20} aria-hidden="true" />
                </button>
                <h2 id="titulo-detalle" className="text-xl font-black text-gray-900">{empleado.nombre}</h2>
                <p className="text-sm font-semibold text-gray-500 first-letter:uppercase">{fechaLarga(fecha)}</p>

                {dia.enTurno && (
                    <p className="flex items-start gap-2 mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl text-sm font-bold text-sky-800">
                        <span className="shrink-0 w-2.5 h-2.5 mt-1 bg-sky-500 rounded-full" aria-hidden="true" />
                        Está trabajando desde las {horaCR(dia.enTurno)}. Cuando marque la salida en el iPad se calcula el pago de hoy.
                    </p>
                )}
                {dia.avisos.map(a => (
                    <p key={a} className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-800">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> {a}. Hasta corregirlo, ese rato no se paga.
                    </p>
                ))}

                <ul className="mt-4 space-y-2">
                    {marcas.length === 0 && <li className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">No marcó este día.</li>}
                    {marcas.map(m => (
                        <li key={m.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                            {m.tipo === 'entrada'
                                ? <LogIn size={18} className="text-emerald-600" aria-hidden="true" />
                                : <LogOut size={18} className="text-bikitchen-orange" aria-hidden="true" />}
                            <span className="flex-1">
                                <span className="font-bold text-gray-900 capitalize">{m.tipo}</span>{' '}
                                <span className="text-gray-700">{horaCR(m.en)}</span>
                                {m.origen === 'panel' && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">a mano</span>}
                            </span>
                            <button type="button" onClick={() => handleBorrar(m)} disabled={ocupado} aria-label={`Borrar ${m.tipo} de las ${horaCR(m.en)}`}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40">
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>

                {dia.minutos > 0 && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-2xl">
                        <p className="flex justify-between text-sm text-gray-700"><span>Trabajó</span><b>{duracion(dia.minutos)}</b></p>
                        {dia.extra > 0 && (
                            <p className="flex justify-between text-sm text-gray-700">
                                <span>De eso, extra (×{FACTOR_EXTRA})</span><b>{duracion(dia.extra * 60)}</b>
                            </p>
                        )}
                        <p className="flex justify-between mt-1 text-lg font-black text-emerald-800"><span>Salario del día</span><span>{colones(dia.monto)}</span></p>
                    </div>
                )}

                <form onSubmit={handleAgregar} className="mt-5 p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-black text-gray-900">Agregar una marca olvidada</p>
                    <div className="flex flex-wrap items-end gap-2 mt-2">
                        <select value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Entrada o salida"
                            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl font-bold">
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                        </select>
                        <input type="time" value={hora} onChange={e => setHora(e.target.value)} required aria-label="Hora"
                            className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold" />
                        <button type="submit" disabled={ocupado || !hora}
                            className="inline-flex items-center gap-1 px-4 py-2.5 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-sm font-bold rounded-xl disabled:opacity-40">
                            <Plus size={16} aria-hidden="true" /> Agregar
                        </button>
                    </div>
                </form>
                {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
            </div>
        </div>
    );
}
