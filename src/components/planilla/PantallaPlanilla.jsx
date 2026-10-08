import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import EncabezadoPlanilla from './EncabezadoPlanilla';
import HoyEnLaCocina from './HoyEnLaCocina';
import LinkDelReloj from './LinkDelReloj';
import EmpleadosPlanilla from './EmpleadosPlanilla';
import TablaSemanal from './TablaSemanal';
import DetalleDelDia from './DetalleDelDia';
import MarcaEnGrupo from './MarcaEnGrupo';
import { fechaCR, lunesDe, diasDeLaSemana, planillaDe } from '../../utils/planilla';
import { descargarPlanilla } from '../../utils/excelPlanilla';

/**
 * La planilla de la semana. La usan dos:
 * - el panel (Jan): todo, con `puedeEditar` (empleados, correcciones, links);
 * - el link de Gina: lo mismo para VER, sin cambiar nada.
 *
 * `cargarDatos(desde, hasta)` trae { empleados, marcas } de una semana.
 * Sin recarga automática (regla 17): el botón "Actualizar" vuelve a traer.
 */
const moverSemana = (lunes, semanas) =>
    new Date(new Date(`${lunes}T12:00:00Z`).getTime() + semanas * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function PantallaPlanilla({ cargarDatos, puedeEditar = false }) {
    const hoy = fechaCR();
    const [lunes, setLunes] = useState(() => lunesDe(hoy));
    const [empleados, setEmpleados] = useState([]);
    const [listos, setListos] = useState(false);              // para no ofrecer "cargar la lista" antes de saber
    const [marcas, setMarcas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [elegido, setElegido] = useState(null);             // { empleadoId, fecha }
    const [editando, setEditando] = useState(null);           // null | {} (nuevo) | empleado
    const dias = useMemo(() => diasDeLaSemana(lunes), [lunes]);
    const seccionEmpleados = useRef(null);

    // Si se cambia de semana rápido, la respuesta de una semana vieja no tapa la nueva
    const vuelta = useRef(0);
    const cargar = useCallback(async () => {
        const mia = ++vuelta.current;
        setCargando(true);
        setError('');
        try {
            const r = await cargarDatos(dias[0], dias[6]);
            if (mia !== vuelta.current) return;
            setEmpleados(r.empleados);
            setMarcas(r.marcas);
            setListos(true);
        } catch (e) {
            if (mia === vuelta.current) setError(e.message);
        } finally {
            if (mia === vuelta.current) setCargando(false);
        }
    }, [cargarDatos, dias]);

    useEffect(() => { cargar(); }, [cargar]);

    // Los que ya no trabajan solo salen si tienen marcas en la semana
    const visibles = useMemo(() => empleados.filter(e => e.activo !== false || marcas.some(m => m.empleadoId === e.id)), [empleados, marcas]);
    const planilla = useMemo(() => planillaDe(visibles, marcas, dias, hoy), [visibles, marcas, dias, hoy]);

    const esEstaSemana = dias.includes(hoy);
    const detalle = elegido && planilla.find(p => p.empleado.id === elegido.empleadoId);

    const handleAgregarEmpleado = () => {
        setEditando({});
        seccionEmpleados.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="space-y-6 lining-nums">
            <EncabezadoPlanilla dias={dias} esEstaSemana={esEstaSemana} cargando={cargando}
                totalSemana={planilla.reduce((s, p) => s + p.totalMonto, 0)}
                totalMinutos={planilla.reduce((s, p) => s + p.totalMinutos, 0)}
                adentro={esEstaSemana ? planilla.filter(p => p.porDia[hoy]?.enTurno).length : null}
                olvidos={planilla.reduce((s, p) => s + p.avisos, 0)}
                onSemana={(n) => setLunes(l => moverSemana(l, n))} onEstaSemana={() => setLunes(lunesDe(hoy))}
                onActualizar={cargar} onExcel={() => descargarPlanilla(planilla, dias)} puedeExcel={planilla.length > 0}
                onAgregarEmpleado={puedeEditar ? handleAgregarEmpleado : null} />

            {error && (
                <p role="alert" className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-700">
                    <AlertTriangle size={16} aria-hidden="true" /> {error}
                </p>
            )}

            {esEstaSemana && <HoyEnLaCocina planilla={planilla} hoy={hoy} />}

            <TablaSemanal planilla={planilla} dias={dias} hoy={hoy}
                onElegirDia={(empleado, fecha) => setElegido({ empleadoId: empleado.id, fecha })} />

            {/* Solo en la semana de hoy: usa las marcas cargadas para saber quién está adentro */}
            {puedeEditar && esEstaSemana && (
                <MarcaEnGrupo empleados={empleados} marcas={marcas} hoy={hoy} desde={dias[0]} onCambio={cargar} />
            )}

            {puedeEditar && (
                <div ref={seccionEmpleados} className="grid lg:grid-cols-3 gap-6 scroll-mt-6">
                    <div className="lg:col-span-2">
                        <EmpleadosPlanilla empleados={empleados} listos={listos} editando={editando} onEditar={setEditando} onCambio={cargar} />
                    </div>
                    <div className="space-y-6">
                        <LinkDelReloj />
                        <LinkDelReloj paraGina />
                    </div>
                </div>
            )}

            {detalle && (
                <DetalleDelDia empleado={detalle.empleado} fecha={elegido.fecha} dia={detalle.porDia[elegido.fecha]}
                    soloVer={!puedeEditar} onCambio={cargar} onCerrar={() => setElegido(null)} />
            )}
        </div>
    );
}
