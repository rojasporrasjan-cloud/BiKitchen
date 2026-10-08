import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import EncabezadoPlanilla from '../../components/planilla/EncabezadoPlanilla';
import HoyEnLaCocina from '../../components/planilla/HoyEnLaCocina';
import LinkDelReloj from '../../components/planilla/LinkDelReloj';
import EmpleadosPlanilla from '../../components/planilla/EmpleadosPlanilla';
import TablaSemanal from '../../components/planilla/TablaSemanal';
import DetalleDelDia from '../../components/planilla/DetalleDelDia';
import MarcaEnGrupo from '../../components/planilla/MarcaEnGrupo';
import { useAuth } from '../../context/AuthContext';
import { pedirALaPlanilla } from '../../utils/planillaClient';
import { fechaCR, lunesDe, diasDeLaSemana, planillaDe } from '../../utils/planilla';
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
    const [empleadosListos, setEmpleadosListos] = useState(false);   // para no ofrecer "cargar la lista" antes de saber
    const [marcas, setMarcas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [elegido, setElegido] = useState(null);            // { empleadoId, fecha }
    const dias = useMemo(() => diasDeLaSemana(lunes), [lunes]);

    const cargarEmpleados = useCallback(async () => {
        const r = await pedirALaPlanilla('empleados');
        anotarLecturas(r.empleados.length, 'Planilla');
        setEmpleados(r.empleados);
        setEmpleadosListos(true);
    }, []);

    // Si se cambia de semana rápido, la respuesta de una semana vieja no tapa la nueva
    const vuelta = useRef(0);
    const cargarMarcas = useCallback(async () => {
        const mia = ++vuelta.current;
        const r = await pedirALaPlanilla('marcas', { desde: dias[0], hasta: dias[6] });
        anotarLecturas(r.marcas.length, 'Planilla');
        if (mia === vuelta.current) setMarcas(r.marcas);
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
    const planilla = useMemo(() => planillaDe(visibles, marcas, dias, hoy), [visibles, marcas, dias, hoy]);

    const totalSemana = planilla.reduce((s, p) => s + p.totalMonto, 0);
    const totalMinutos = planilla.reduce((s, p) => s + p.totalMinutos, 0);
    const olvidos = planilla.reduce((s, p) => s + p.avisos, 0);
    const esEstaSemana = dias.includes(hoy);
    const adentro = esEstaSemana ? planilla.filter(p => p.porDia[hoy]?.enTurno).length : null;

    const detalle = elegido && planilla.find(p => p.empleado.id === elegido.empleadoId);

    return (
        <div className="space-y-6 lining-nums">
            <EncabezadoPlanilla dias={dias} esEstaSemana={esEstaSemana} cargando={cargando}
                totalSemana={totalSemana} totalMinutos={totalMinutos} adentro={adentro} olvidos={olvidos}
                onSemana={(n) => setLunes(l => moverSemana(l, n))} onEstaSemana={() => setLunes(lunesDe(hoy))}
                onActualizar={() => cargar('marcas')} onExcel={() => descargarPlanilla(planilla, dias)} puedeExcel={planilla.length > 0} />

            {error && (
                <p role="alert" className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-700">
                    <AlertTriangle size={16} aria-hidden="true" /> {error}
                </p>
            )}

            {esEstaSemana && <HoyEnLaCocina planilla={planilla} hoy={hoy} />}

            <TablaSemanal planilla={planilla} dias={dias} hoy={hoy}
                onElegirDia={(empleado, fecha) => setElegido({ empleadoId: empleado.id, fecha })} />

            {/* Solo en la semana de hoy: usa las marcas cargadas para saber quién está adentro */}
            {dias.includes(hoy) && (
                <MarcaEnGrupo empleados={empleados} marcas={marcas} hoy={hoy} desde={dias[0]} onCambio={() => cargar('marcas')} />
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <EmpleadosPlanilla empleados={empleados} listos={empleadosListos} onCambio={() => cargar('empleados')} />
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
