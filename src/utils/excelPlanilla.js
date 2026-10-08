/**
 * El Excel de la planilla de la semana: un resumen por persona y el detalle
 * de cada día (entradas, salidas y plata). xlsx se carga solo al descargar.
 */
import { horaCR } from './planilla';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horas = (minutos) => Math.round((minutos / 60) * 100) / 100;

export const filasDelResumen = (planilla, dias) => planilla.map(({ empleado, porDia, totalMinutos, totalMonto }) => {
    const fila = { Empleado: empleado.nombre, '₡ por hora': Number(empleado.tarifaHora) || 0 };
    dias.forEach((fecha, i) => { fila[`${DIAS[i]} ${fecha.slice(8)} (h)`] = horas(porDia[fecha].minutos); });
    fila['Horas extra'] = horas(dias.reduce((s, f) => s + porDia[f].extra * 60, 0));
    fila['Total horas'] = horas(totalMinutos);
    fila['Total ₡'] = totalMonto;
    return fila;
});

export const filasDelDetalle = (planilla, dias) => planilla.flatMap(({ empleado, porDia }) => dias.flatMap((fecha) => {
    const dia = porDia[fecha];
    return dia.tramos.map((t, i) => ({
        Fecha: fecha,
        Empleado: empleado.nombre,
        Entrada: horaCR(t.entrada.en),
        Salida: t.salida ? `${horaCR(t.salida.en)}${t.salida.motivo === 'almuerzo' ? ' (almuerzo)' : ''}` : 'FALTA',
        Horas: horas(t.minutos),
        'Almuerzo (min)': i === 0 && dia.almuerzo ? dia.almuerzo : '',
        '₡ del día': i === dia.tramos.length - 1 ? dia.monto : '',
        Avisos: i === 0 ? dia.avisos.join(' · ') : ''
    }));
}));

export const descargarPlanilla = async (planilla, dias) => {
    const XLSX = await import('xlsx');
    const libro = XLSX.utils.book_new();
    const resumen = XLSX.utils.json_to_sheet(filasDelResumen(planilla, dias));
    resumen['!cols'] = [{ wch: 20 }, { wch: 11 }, ...dias.map(() => ({ wch: 13 })), { wch: 11 }, { wch: 11 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(libro, resumen, 'Resumen');
    const detalle = XLSX.utils.json_to_sheet(filasDelDetalle(planilla, dias));
    detalle['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 11 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 11 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(libro, detalle, 'Detalle por día');
    XLSX.writeFile(libro, `Planilla BiKitchen ${dias[0]} al ${dias[6]}.xlsx`);
};
