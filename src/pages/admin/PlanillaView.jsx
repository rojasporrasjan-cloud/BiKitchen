import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, ChevronLeft, ChevronRight, Download, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import LinkDelReloj from '../../components/planilla/LinkDelReloj';
import EmpleadosPlanilla from '../../components/planilla/EmpleadosPlanilla';
import TablaSemanal from '../../components/planilla/TablaSemanal';
import DetalleDelDia from '../../components/planilla/DetalleDelDia';
import { useAuth } from '../../context/AuthContext';
import { pedirALaPlanilla } from '../../utils/planillaClient';
import { fechaCR, lunesDe, diasDeLaSemana, planillaDe, estadoActual, colones, duracion } from '../../utils/planilla';
import { descargarPlanilla } from '../../utils/excelPlanilla';
import { anotarLecturas } from '../../utils/contadorFirestore';

/**
 * Panel → Planilla: quiénes trabajan, cuánto ganan por hora, y el salario de
 * cada persona por día con las marcas del reloj del iPad (/reloj/<código>).
 *
 * Lecturas (regla 17): los empleados (pocos) y las marcas de UNA semana.
 */

const moverSemana = (lunes, semanas) =>
    new Date(new Date(`${lunes}T12:00:00Z`).getTime() + semanas * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const rangoBonito = (dias) => {
    const f = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }).replace('sept', 'set');
    return `${f(dias[0])} al ${f(dias[6])}`;
};

const Dato = ({ valor, etiqueta }) => (
    <div className="px-4 py-3 bg-white/15 rounded-2xl text-center">
        <div className="text-2xl font-black">{valor}</div>
        <div className="mt-0.5 text-xs font-semibold text-white/85">{etiqueta}</div>
    </div>
);

// Salarios: solo el dueño (la función también lo revisa del lado del servidor)
export default function PlanillaView() {
    const { isSuperAdmin } = useAuth();
    if (!isSuperAdmin()) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Lock size={48} className="mb-4 text-gray-300" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="mt-1 text-gray-500">Esta herramienta es solo para el dueño.</p>
            </div>
        );
    }
    return <Planilla />;
}

function Planilla() {
    const hoy = fechaCR();
    const [lunes, setLunes] = useState(() => lunesDe(hoy));
    const [empleados, setEmpleados] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [elegido, setElegido] = useState(null);            // { empleadoId, fecha }
    const dias = useMemo(() => diasDeLaSemana(lunes), [lunes]);

    const cargarEmpleados = useCallback(async () => {
        const r = await pedirALaPlanilla('empleados');
        anotarLecturas(r.empleados.length, 'Planilla');
        setEmpleados(r.empleados);
    }, []);

    const cargarMarcas = useCallback(async () => {
        const r = await pedirALaPlanilla('marcas', { desde: dias[0], hasta: dias[6] });
        anotarLecturas(r.marcas.length, 'Planilla');
        setMarcas(r.marcas);
    }, [dias]);

    const cargar = useCallback(async (que = 'todo') => {
        setCargando(true);
        setError('');
        try {
            await Promise.all([que !== 'marcas' && cargarEmpleados(), que !== 'empleados' && cargarMarcas()]);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, [cargarEmpleados, cargarMarcas]);

    // Los empleados, una vez; las marcas, cada vez que se cambia de semana
    useEffect(() => { cargarEmpleados().catch(e => setError(e.message)); }, [cargarEmpleados]);
    useEffect(() => { cargar('marcas'); }, [cargar]);

    // Los que ya no trabajan solo salen si tienen marcas en la semana
    const visibles = useMemo(() => empleados.filter(e => e.activo !== false || marcas.some(m => m.empleadoId === e.id)), [empleados, marcas]);
    const planilla = useMemo(() => planillaDe(visibles, marcas, dias), [visibles, marcas, dias]);

    const totalSemana = planilla.reduce((s, p) => s + p.totalMonto, 0);
    const totalMinutos = planilla.reduce((s, p) => s + p.totalMinutos, 0);
    const avisos = planilla.reduce((s, p) => s + p.avisos, 0);
    const adentro = dias.includes(hoy)
        ? visibles.filter(e => estadoActual(marcas.filter(m => m.empleadoId === e.id && m.fecha === hoy)).adentro).length
        : null;

    const detalle = elegido && planilla.find(p => p.empleado.id === elegido.empleadoId);

    return (
        <div className="space-y-6">
            <header className="p-5 md:p-6 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 text-white rounded-3xl shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl" aria-hidden="true">
                            <Wallet size={28} />
                        </span>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black">Planilla</h1>
                            <p className="text-sm text-white/85">Horas del reloj y salario de cada persona por día</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Dato valor={colones(totalSemana)} etiqueta="A pagar esta semana" />
                        <Dato valor={duracion(totalMinutos)} etiqueta="Horas trabajadas" />
                        <Dato valor={adentro ?? '—'} etiqueta="Adentro ahora" />
                        <Dato valor={avisos} etiqueta={avisos === 1 ? 'Olvido por corregir' : 'Olvidos por corregir'} />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-white/25">
                    <div className="flex items-center bg-white/20 rounded-xl">
                        <button type="button" onClick={() => setLunes(l => moverSemana(l, -1))} aria-label="Semana anterior" className="p-2.5 hover:bg-white/20 rounded-l-xl">
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <span className="px-2 text-sm font-bold whitespace-nowrap">Semana del {rangoBonito(dias)}</span>
                        <button type="button" onClick={() => setLunes(l => moverSemana(l, 1))} aria-label="Semana siguiente" className="p-2.5 hover:bg-white/20 rounded-r-xl">
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                    {lunes !== lunesDe(hoy) && (
                        <button type="button" onClick={() => setLunes(lunesDe(hoy))} className="px-3 py-2 bg-white/20 hover:bg-white/30 text-sm font-bold rounded-xl">
                            Esta semana
                        </button>
                    )}
                    <button type="button" onClick={() => cargar('marcas')} disabled={cargando}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-sm font-bold rounded-xl disabled:opacity-50">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar
                    </button>
                    <button type="button" onClick={() => descargarPlanilla(planilla, dias)} disabled={planilla.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-orange-600 text-sm font-bold rounded-xl disabled:opacity-50">
                        <Download size={15} aria-hidden="true" /> Descargar Excel
                    </button>
                </div>
            </header>

            {error && (
                <p role="alert" className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-700">
                    <AlertTriangle size={16} aria-hidden="true" /> {error}
                </p>
            )}

            <TablaSemanal planilla={planilla} dias={dias} hoy={hoy}
                onElegirDia={(empleado, fecha) => setElegido({ empleadoId: empleado.id, fecha })} />

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <EmpleadosPlanilla empleados={empleados} onCambio={() => cargar('empleados')} />
                </div>
                <LinkDelReloj />
            </div>

            {detalle && (
                <DetalleDelDia empleado={detalle.empleado} fecha={elegido.fecha} dia={detalle.porDia[elegido.fecha]}
                    onCambio={() => cargar('marcas')} onCerrar={() => setElegido(null)} />
            )}
        </div>
    );
}
