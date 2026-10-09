import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import FormularioGasto from './FormularioGasto';
import ListaDeGastos from './ListaDeGastos';
import ResumenGastos from './ResumenGastos';
import { categoriaDe } from '../../data/gastos';
import { nuevoIdGasto, proveedoresUsados } from '../../utils/gastos';
import { colones, diasDeLaSemana, fechaCR, lunesDe } from '../../utils/planilla';

/**
 * Los gastos de una semana: anotar, corregir, borrar y ver en qué se fue la plata.
 * La usan el link de Gina (`/gastos/<código>`) y el panel (Panel → Gastos).
 * `pedir(accion, datos)` llama a la función `gastos` con el código o con la sesión.
 */
const moverSemana = (lunes, n) => new Date(new Date(`${lunes}T12:00:00Z`).getTime() + n * 7 * 86400000).toISOString().slice(0, 10);
const corta = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' }).replace('septiembre', 'setiembre');

export default function PantallaGastos({ pedir, soloVer = false, abajo = null }) {
    const hoy = fechaCR();
    const [lunes, setLunes] = useState(() => lunesDe(hoy));
    const dias = useMemo(() => diasDeLaSemana(lunes), [lunes]);
    const [gastos, setGastos] = useState([]);
    const [listos, setListos] = useState(false);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [editando, setEditando] = useState(null);
    const idNuevo = useRef(nuevoIdGasto());            // el mismo id si se reintenta: no se duplica
    const vuelta = useRef(0);

    const [recarga, setRecarga] = useState(0);
    const cargar = useCallback(() => setRecarga(n => n + 1), []);

    useEffect(() => {
        const mia = ++vuelta.current;
        pedir('lista', { desde: dias[0], hasta: dias[6] })
            .then((r) => {
                if (mia !== vuelta.current) return;          // una semana vieja no tapa la nueva
                setGastos(r.gastos || []);
                setListos(true);
                setError('');
            })
            .catch((e) => { if (mia === vuelta.current) setError(e.message); });
    }, [pedir, dias, recarga]);

    const handleGuardar = async (entrada) => {
        const idGasto = editando ? editando.id : idNuevo.current;
        const { fecha, categoria, monto, que, proveedor, pago } = entrada;
        try {
            await pedir('guardar', { idGasto, gasto: { fecha, categoria, monto, que, proveedor, pago } });
            if (!editando) idNuevo.current = nuevoIdGasto();
            const otraSemana = fecha < dias[0] || fecha > dias[6];
            setAviso(`Guardado: ${colones(monto)} en ${categoriaDe(categoria).nombre}${otraSemana ? ' (es de otra semana)' : ''}`);
            setError('');
            setEditando(null);
            cargar();
            return true;
        } catch (e) {
            setAviso('');
            setError(e.sinInternet ? 'No se guardó: no hay internet. Revisá la señal y tocá «Guardar» otra vez.' : e.message);
            return false;
        }
    };

    const handleBorrar = async (g) => {
        if (!window.confirm(`¿Borrar ${categoriaDe(g.categoria).nombre} de ${colones(g.monto)}?`)) return;
        try {
            await pedir('borrar', { id: g.id });
            setAviso('Gasto borrado');
            if (editando?.id === g.id) setEditando(null);
            cargar();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleEditar = (g) => {
        setEditando(g);
        setAviso('');
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    const total = gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);

    return (
        <div className="space-y-4 lining-nums">
            <section className="flex items-center justify-between gap-2 p-4 bg-white rounded-3xl shadow-sm ring-1 ring-black/5" aria-label="Semana">
                <button type="button" onClick={() => setLunes(l => moverSemana(l, -1))} aria-label="Semana anterior" className="p-2 text-gray-500 hover:text-gray-900 rounded-full">
                    <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Semana del {corta(dias[0])} al {corta(dias[6])}</p>
                    <p className="text-3xl font-black text-gray-900">{listos ? colones(total) : '…'}</p>
                    <p className="text-xs font-semibold text-gray-500">{gastos.length === 1 ? '1 gasto' : `${gastos.length} gastos`}</p>
                </div>
                <button type="button" onClick={() => setLunes(l => moverSemana(l, 1))} disabled={dias.includes(hoy)} aria-label="Semana siguiente"
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-full disabled:opacity-20">
                    <ChevronRight size={22} aria-hidden="true" />
                </button>
            </section>

            {aviso && (
                <p role="status" className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl font-bold text-emerald-800">
                    <CheckCircle2 size={20} aria-hidden="true" /> {aviso}
                </p>
            )}
            {error && (
                <p role="alert" className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl font-bold text-red-700">
                    <AlertTriangle size={20} className="shrink-0" aria-hidden="true" /> {error}
                </p>
            )}

            {!soloVer && (
                <FormularioGasto key={editando?.id || 'nuevo'} editando={editando} proveedores={proveedoresUsados(gastos)}
                    onGuardar={handleGuardar} onCancelar={() => setEditando(null)} />
            )}

            <ResumenGastos gastos={gastos} />
            {listos && <ListaDeGastos gastos={gastos} soloVer={soloVer} onEditar={handleEditar} onBorrar={handleBorrar} />}
            {abajo}
        </div>
    );
}
