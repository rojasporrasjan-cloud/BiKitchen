import React, { useMemo, useState } from 'react';
import { UsersRound, Check } from 'lucide-react';
import { tonoDe } from '../../data/planilla';
import { estadoActual, iniciales } from '../../utils/planilla';
import { pedirALaPlanilla } from '../../utils/planillaClient';

/**
 * "Hoy todas entraron a las 7:15 y nadie marcó": la entrada (o la salida) de
 * varias personas a la misma hora, de una vez. Solo se puede elegir a quien le
 * toca esa marca: entrada a quien está afuera, salida a quien está adentro.
 */
export default function MarcaEnGrupo({ empleados, marcas, hoy, desde, onCambio }) {
    const [fecha, setFecha] = useState(hoy);
    const [hora, setHora] = useState('');
    const [tipo, setTipo] = useState('entrada');
    const [quitados, setQuitados] = useState(() => new Set());
    const [ocupado, setOcupado] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const activos = useMemo(() => empleados.filter(e => e.activo !== false), [empleados]);
    const puede = (e) => estadoActual(marcas.filter(m => m.empleadoId === e.id && m.fecha === fecha)).adentro === (tipo === 'salida');
    const elegidos = activos.filter(e => puede(e) && !quitados.has(e.id));

    const handleAlternar = (id) => setQuitados((q) => {
        const nuevo = new Set(q);
        if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
        return nuevo;
    });

    const handleMarcar = async (ev) => {
        ev.preventDefault();
        setOcupado(true);
        setError('');
        setMensaje('');
        let hechas = 0;
        try {
            for (const e of elegidos) {
                await pedirALaPlanilla('agregarMarca', { marca: { empleadoId: e.id, fecha, hora, tipo, nota: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} en grupo` } });
                hechas += 1;
            }
            setMensaje(`Listo: ${tipo} de ${hechas} ${hechas === 1 ? 'persona' : 'personas'} a las ${hora}.`);
        } catch (e) {
            setError(`Se marcaron ${hechas}. ${e.message}`);
        } finally {
            setOcupado(false);
            setQuitados(new Set());
            onCambio();
        }
    };

    if (activos.length === 0) return null;

    return (
        <section className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm" aria-labelledby="titulo-grupo">
            <h2 id="titulo-grupo" className="flex items-center gap-2 text-lg font-black text-gray-900">
                <UsersRound size={20} className="text-bikitchen-orange" aria-hidden="true" /> Marcar a varias a la vez
            </h2>
            <p className="mt-1 text-sm text-gray-600">Para cuando llegaron (o se fueron) juntas y nadie marcó en el iPad.</p>
            <form onSubmit={handleMarcar}>
                <div className="flex flex-wrap items-end gap-2 mt-3">
                    <select value={tipo} onChange={e => { setTipo(e.target.value); setQuitados(new Set()); }} aria-label="Entrada o salida"
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl font-bold">
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                    </select>
                    <input type="date" value={fecha} min={desde} max={hoy} onChange={e => { setFecha(e.target.value); setQuitados(new Set()); }} required aria-label="Día"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold" />
                    <input type="time" value={hora} onChange={e => setHora(e.target.value)} required aria-label="Hora"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold" />
                </div>
                <ul className="flex flex-wrap gap-2 mt-3">
                    {activos.map((e) => {
                        const habilitado = puede(e);
                        const marcado = habilitado && !quitados.has(e.id);
                        return (
                            <li key={e.id}>
                                <button type="button" onClick={() => handleAlternar(e.id)} disabled={!habilitado} aria-pressed={marcado}
                                    title={habilitado ? '' : (tipo === 'entrada' ? 'Ya está adentro ese día' : 'No está adentro ese día')}
                                    className={`inline-flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-full border text-sm font-bold transition-colors ${marcado
                                        ? 'bg-orange-50 border-bikitchen-orange text-gray-900'
                                        : 'bg-white border-gray-200 text-gray-400'} disabled:opacity-40`}>
                                    <span className={`flex items-center justify-center w-7 h-7 rounded-full ${tonoDe(e.color).solido} text-white text-xs font-black`} aria-hidden="true">
                                        {marcado ? <Check size={14} strokeWidth={3} /> : iniciales(e.nombre)}
                                    </span>
                                    {e.nombre}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <button type="submit" disabled={ocupado || !hora || elegidos.length === 0}
                    className="mt-4 px-5 py-2.5 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold rounded-xl disabled:opacity-40">
                    {ocupado ? 'Marcando…' : `Marcar ${tipo} a ${elegidos.length} ${elegidos.length === 1 ? 'persona' : 'personas'}`}
                </button>
            </form>
            {mensaje && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{mensaje}</p>}
            {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
        </section>
    );
}
