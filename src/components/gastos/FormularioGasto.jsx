import React, { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { CATEGORIAS_GASTO, FORMAS_DE_PAGO, categoriaDe } from '../../data/gastos';
import { leerMonto, validarGasto } from '../../utils/gastos';
import { colones, fechaCR } from '../../utils/planilla';

/**
 * Anotar un gasto en 10 segundos: monto, categoría con un toque, qué fue, y
 * guardar. Lo demás (proveedor, forma de pago, fecha) es opcional y ya viene puesto.
 */
const ayerCR = () => fechaCR(new Date(Date.now() - 24 * 60 * 60 * 1000));

const vacio = (fecha) => ({ monto: 0, categoria: '', que: '', proveedor: '', pago: '', fecha });

export default function FormularioGasto({ editando, proveedores = [], onGuardar, onCancelar }) {
    const hoy = fechaCR();
    const [f, setF] = useState(() => (editando ? { ...vacio(hoy), ...editando } : vacio(hoy)));
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const enCurso = useRef(false);
    const cambiar = (campo, valor) => { setF(x => ({ ...x, [campo]: valor })); setError(''); };
    const cat = f.categoria ? categoriaDe(f.categoria) : null;

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (enCurso.current) return;                        // dos toques: cuenta uno
        const { error: problema } = validarGasto(f);
        if (problema) { setError(problema); return; }
        enCurso.current = true;
        setGuardando(true);
        try {
            const ok = await onGuardar(f);
            if (ok && !editando) setF(x => ({ ...vacio(x.fecha), pago: x.pago }));   // la fecha y la forma de pago se quedan
        } finally {
            enCurso.current = false;
            setGuardando(false);
        }
    };

    const chip = (activo) => `px-3.5 py-2 rounded-full text-sm font-bold border-2 transition-colors ${activo
        ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700'}`;

    return (
        <form onSubmit={handleGuardar} className="p-5 bg-white rounded-3xl shadow-sm ring-1 ring-black/5 lining-nums">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-900">{editando ? 'Corregir gasto' : 'Anotar un gasto'}</h2>
                {editando && (
                    <button type="button" onClick={onCancelar} aria-label="Cancelar" className="p-2 text-gray-400 hover:text-gray-700 rounded-full">
                        <X size={20} aria-hidden="true" />
                    </button>
                )}
            </div>

            <label className="block mt-4 text-sm font-bold text-gray-600" htmlFor="monto-gasto">¿Cuánto?</label>
            <div className="flex items-center mt-1 px-4 bg-orange-50 border-2 border-orange-200 focus-within:border-bikitchen-orange rounded-2xl">
                <span className="text-3xl font-black text-bikitchen-orange" aria-hidden="true">₡</span>
                <input
                    id="monto-gasto"
                    inputMode="numeric"
                    autoComplete="off"
                    value={f.monto ? f.monto.toLocaleString('es-CR') : ''}
                    onChange={e => cambiar('monto', leerMonto(e.target.value))}
                    placeholder="0"
                    className="w-full py-3 pl-2 bg-transparent text-4xl font-black text-gray-900 tabular-nums focus:outline-none"
                />
            </div>

            <p className="mt-5 text-sm font-bold text-gray-600" id="titulo-categoria">¿En qué?</p>
            <div className="grid grid-cols-3 gap-2 mt-2" role="group" aria-labelledby="titulo-categoria">
                {CATEGORIAS_GASTO.map(c => (
                    <button key={c.id} type="button" onClick={() => cambiar('categoria', c.id)} aria-pressed={f.categoria === c.id}
                        className={`flex flex-col items-center gap-1 px-1 py-3 rounded-2xl border-2 text-xs font-bold leading-tight transition-transform duration-100 active:scale-95 ${f.categoria === c.id
                            ? 'bg-bikitchen-orange border-bikitchen-orange text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
                        {c.nombre}
                    </button>
                ))}
            </div>

            <label className="block mt-5 text-sm font-bold text-gray-600" htmlFor="que-gasto">
                ¿Qué fue? {f.categoria === 'otros' ? <span className="text-red-600">(obligatorio)</span> : <span className="font-normal text-gray-400">(opcional)</span>}
            </label>
            <input id="que-gasto" value={f.que} onChange={e => cambiar('que', e.target.value)} maxLength={140}
                placeholder={cat ? cat.ejemplo : 'Pollo 20 kg, tazas de 500 g…'}
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 focus:border-bikitchen-orange rounded-2xl text-base focus:outline-none" />

            <label className="block mt-4 text-sm font-bold text-gray-600" htmlFor="proveedor-gasto">
                ¿A quién? <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input id="proveedor-gasto" list="proveedores-gasto" value={f.proveedor} onChange={e => cambiar('proveedor', e.target.value)} maxLength={80}
                placeholder="Proveedor, persona o tienda"
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 focus:border-bikitchen-orange rounded-2xl text-base focus:outline-none" />
            <datalist id="proveedores-gasto">{proveedores.map(p => <option key={p} value={p} />)}</datalist>

            <p className="mt-4 text-sm font-bold text-gray-600">¿Cómo se pagó? <span className="font-normal text-gray-400">(opcional)</span></p>
            <div className="flex flex-wrap gap-2 mt-2">
                {FORMAS_DE_PAGO.map(p => (
                    <button key={p} type="button" onClick={() => cambiar('pago', f.pago === p ? '' : p)} aria-pressed={f.pago === p} className={chip(f.pago === p)}>{p}</button>
                ))}
            </div>

            <p className="mt-4 text-sm font-bold text-gray-600">¿Cuándo?</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <button type="button" onClick={() => cambiar('fecha', hoy)} aria-pressed={f.fecha === hoy} className={chip(f.fecha === hoy)}>Hoy</button>
                <button type="button" onClick={() => cambiar('fecha', ayerCR())} aria-pressed={f.fecha === ayerCR()} className={chip(f.fecha === ayerCR())}>Ayer</button>
                <input type="date" value={f.fecha} max={hoy} onChange={e => cambiar('fecha', e.target.value)} aria-label="Otra fecha"
                    className="px-3 py-2 border-2 border-gray-200 rounded-full text-sm font-bold" />
            </div>

            {error && <p role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700">{error}</p>}

            <button type="submit" disabled={guardando}
                className="flex items-center justify-center gap-2 w-full mt-5 py-4 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white text-lg font-black rounded-2xl shadow-md transition-transform duration-100 active:scale-95 disabled:opacity-50">
                <Check size={22} aria-hidden="true" />
                {guardando ? 'Guardando…' : (f.monto > 0 && cat ? `Guardar ${colones(f.monto)} en ${cat.nombre}` : (editando ? 'Guardar cambios' : 'Guardar'))}
            </button>
        </form>
    );
}
