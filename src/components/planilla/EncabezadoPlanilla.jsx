import React from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Wallet, Clock, UserCheck, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import { colones, duracion } from '../../utils/planilla';

/** Arriba de la planilla: la semana, los botones y los cuatro números que importan. */
const rangoBonito = (dias) => {
    const f = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' }).replace('septiembre', 'setiembre');
    return `${f(dias[0])} al ${f(dias[6])}`;
};

const Numero = ({ icono: Icono, valor, etiqueta, tono }) => (
    <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <span className={`hidden sm:flex items-center justify-center shrink-0 w-11 h-11 rounded-xl ${tono}`} aria-hidden="true">
            <Icono size={22} />
        </span>
        <span className="min-w-0">
            <span className="block text-lg sm:text-2xl font-black text-gray-900 leading-tight">{valor}</span>
            <span className="block text-xs font-semibold text-gray-500">{etiqueta}</span>
        </span>
    </div>
);

export default function EncabezadoPlanilla({
    dias, esEstaSemana, cargando, totalSemana, totalMinutos, adentro, olvidos,
    onSemana, onEstaSemana, onActualizar, onExcel, puedeExcel, onAgregarEmpleado
}) {
    const boton = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-xl transition-colors';
    return (
        <>
            <header className="relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-amber-500 text-white rounded-3xl shadow-xl">
                <span className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10" aria-hidden="true" />
                <span className="absolute -bottom-32 right-40 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl" aria-hidden="true">
                            <Wallet size={28} />
                        </span>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-white">Planilla</h1>
                            <p className="text-sm sm:text-base font-semibold text-white/85">Semana del {rangoBonito(dias)}</p>
                        </div>
                    </div>
                    <img src="/assets/logo.png" alt="" aria-hidden="true" className="hidden md:block w-36 h-auto brightness-0 invert opacity-90" />
                </div>
                <div className="relative flex flex-wrap items-center gap-2 mt-6">
                    <div className="flex items-center bg-white/20 rounded-xl">
                        <button type="button" onClick={() => onSemana(-1)} aria-label="Semana anterior" className="p-2.5 hover:bg-white/20 rounded-l-xl">
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <span className="px-1 text-sm font-bold">Cambiar semana</span>
                        <button type="button" onClick={() => onSemana(1)} aria-label="Semana siguiente" className="p-2.5 hover:bg-white/20 rounded-r-xl">
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                    {!esEstaSemana && (
                        <button type="button" onClick={onEstaSemana} className={`${boton} bg-white/20 hover:bg-white/30`}>Volver a esta semana</button>
                    )}
                    <button type="button" onClick={onActualizar} disabled={cargando} className={`${boton} bg-white/20 hover:bg-white/30 disabled:opacity-50`}>
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar
                    </button>
                    <button type="button" onClick={onExcel} disabled={!puedeExcel} className={`${boton} bg-white text-orange-600 hover:bg-orange-50 shadow-sm disabled:opacity-50`}>
                        <Download size={15} aria-hidden="true" /> Descargar Excel
                    </button>
                    {onAgregarEmpleado && (
                        <button type="button" onClick={onAgregarEmpleado} className={`${boton} bg-gray-900 text-white hover:bg-gray-800 shadow-sm`}>
                            <UserPlus size={15} aria-hidden="true" /> Agregar empleado
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Numero icono={Wallet} valor={colones(totalSemana)} etiqueta="A pagar esta semana" tono="bg-orange-100 text-bikitchen-orange" />
                <Numero icono={Clock} valor={duracion(totalMinutos)} etiqueta="Horas trabajadas" tono="bg-sky-100 text-sky-600" />
                <Numero icono={UserCheck} valor={adentro ?? '—'} etiqueta="Trabajando ahora" tono="bg-emerald-100 text-emerald-600" />
                {olvidos > 0
                    ? <Numero icono={AlertTriangle} valor={olvidos} etiqueta={olvidos === 1 ? 'Olvido por corregir' : 'Olvidos por corregir'} tono="bg-amber-100 text-amber-600" />
                    : <Numero icono={CheckCircle2} valor="Todo bien" etiqueta="Sin olvidos de marca" tono="bg-emerald-100 text-emerald-600" />}
            </div>
        </>
    );
}
