/**
 * Las cuentas de la planilla: de las marcas del reloj a horas y a plata.
 *
 * Lo usan la función `planilla` (para saber si alguien entra o sale) y la
 * pantalla Planilla del panel (para el salario de cada día). Una sola cuenta
 * para los dos lados, así no dicen cosas distintas.
 *
 * Costa Rica no tiene horario de verano: siempre UTC-6. Las fechas de la
 * planilla son las de Costa Rica (AAAA-MM-DD), aunque el servidor esté en UTC.
 */
import { JORNADA_HORAS, FACTOR_EXTRA } from '../data/planilla';

const SEIS_HORAS = 6 * 60 * 60 * 1000;
const UN_DIA = 24 * 60 * 60 * 1000;

/** AAAA-MM-DD de Costa Rica para un momento. */
export const fechaCR = (momento = new Date()) =>
    new Date(new Date(momento).getTime() - SEIS_HORAS).toISOString().slice(0, 10);

/** El momento (ISO) de una fecha y hora de Costa Rica: ('2026-10-08', '07:05'). */
export const momentoCR = (fecha, hora) => {
    const [a, m, d] = String(fecha).split('-').map(Number);
    const [hh, mm] = String(hora).split(':').map(Number);
    if ([a, m, d, hh, mm].some(n => !Number.isFinite(n))) return null;
    return new Date(Date.UTC(a, m - 1, d, hh + 6, mm)).toISOString();
};

/** "7:05 a. m." en Costa Rica. */
export const horaCR = (momento) => {
    const t = new Date(new Date(momento).getTime() - SEIS_HORAS);
    if (Number.isNaN(t.getTime())) return '';
    const h = t.getUTCHours();
    const mm = String(t.getUTCMinutes()).padStart(2, '0');
    return `${h % 12 || 12}:${mm} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

/** "HH:MM" de Costa Rica (para los campos de hora). */
export const horaCorta = (momento) => {
    const t = new Date(new Date(momento).getTime() - SEIS_HORAS);
    return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
};

const ordenar = (marcas = []) => [...(marcas || [])].sort((a, b) => String(a.en).localeCompare(String(b.en)));

/** Si la próxima marca de hoy es entrada o salida. */
export const siguienteMarca = (marcasDelDia = []) => {
    const ultima = ordenar(marcasDelDia).at(-1);
    return ultima?.tipo === 'entrada' ? 'salida' : 'entrada';
};

/** Salir a almorzar es una salida con `motivo: 'almuerzo'`; volver, una entrada con el mismo motivo. */
export const esAlmuerzo = (m) => m?.motivo === 'almuerzo';

/** ¿Está adentro ahora? desde cuándo, y si salió a almorzar. */
export const estadoActual = (marcasDelDia = []) => {
    const ultima = ordenar(marcasDelDia).at(-1);
    if (ultima?.tipo === 'entrada') return { adentro: true, almorzando: false, desde: ultima.en };
    return { adentro: false, almorzando: ultima?.tipo === 'salida' && esAlmuerzo(ultima), desde: ultima?.en || null };
};

const minutosEntre = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));

/**
 * Los tramos trabajados de un día: cada entrada con su salida.
 * Una entrada sin salida queda ABIERTA (no se paga hasta que se corrija) y una
 * salida sin entrada se avisa: las dos son olvidos que hay que arreglar.
 *
 * El almuerzo NO se paga: es el rato entre "salir a almorzar" y la entrada que
 * sigue. Queda en `almuerzo` (minutos) para que se vea cuánto duró. Si el día
 * termina en "salir a almorzar", se avisa: o no volvió a marcar, o se fue.
 */
export const tramosDelDia = (marcasDelDia = []) => {
    const tramos = [];
    const avisos = [];
    let abierta = null;
    let almuerzo = 0;
    let saliendoAAlmorzar = null;
    ordenar(marcasDelDia).forEach((m) => {
        if (m.tipo === 'entrada') {
            if (abierta) avisos.push(`Entrada de las ${horaCR(abierta.en)} sin salida`);
            if (saliendoAAlmorzar) almuerzo += minutosEntre(saliendoAAlmorzar.en, m.en);
            saliendoAAlmorzar = null;
            abierta = m;
        } else if (m.tipo === 'salida') {
            if (!abierta) {
                avisos.push(`Salida de las ${horaCR(m.en)} sin entrada`);
                return;
            }
            tramos.push({ entrada: abierta, salida: m, minutos: minutosEntre(abierta.en, m.en) });
            abierta = null;
            saliendoAAlmorzar = esAlmuerzo(m) ? m : null;
        }
    });
    if (abierta) {
        tramos.push({ entrada: abierta, salida: null, minutos: 0 });
        avisos.push(`Falta la salida (entró a las ${horaCR(abierta.en)})`);
    }
    if (saliendoAAlmorzar) avisos.push(`Salió a almorzar a las ${horaCR(saliendoAAlmorzar.en)} y no volvió a marcar`);
    return { tramos, avisos, almuerzo, almorzandoDesde: saliendoAAlmorzar?.en || null };
};

/** Lo que se le paga por los minutos de UN día. */
export const pagoDelDia = (minutos, tarifaHora) => {
    const horas = (Number(minutos) || 0) / 60;
    const tarifa = Number(tarifaHora) || 0;
    const normales = Math.min(horas, JORNADA_HORAS);
    const extra = Math.max(0, horas - JORNADA_HORAS);
    return {
        horas,
        normales,
        extra,
        monto: Math.round(normales * tarifa + extra * tarifa * FACTOR_EXTRA)
    };
};

/** Lunes de la semana de una fecha (AAAA-MM-DD). */
export const lunesDe = (fecha) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    const dia = d.getUTCDay();                       // 0 domingo … 6 sábado
    return new Date(d.getTime() - ((dia + 6) % 7) * UN_DIA).toISOString().slice(0, 10);
};

/** Los 7 días (lunes a domingo) desde un lunes. */
export const diasDeLaSemana = (lunes) =>
    Array.from({ length: 7 }, (_, i) => new Date(new Date(`${lunes}T12:00:00Z`).getTime() + i * UN_DIA).toISOString().slice(0, 10));

/**
 * La planilla de varios días: por empleado, cada día con sus tramos, horas y
 * plata, y el total.
 *
 * Con `hoy`, el turno que sigue abierto HOY no es un olvido: la persona todavía
 * está trabajando. Ese día lleva `enTurno` (desde cuándo) y no cuenta como aviso.
 * Igual el almuerzo de hoy sin vuelta: `enAlmuerzo` (todavía está almorzando).
 */
export const planillaDe = (empleados = [], marcas = [], dias = [], hoy = null) => (empleados || []).map((empleado) => {
    const suyas = (marcas || []).filter(m => m.empleadoId === empleado.id);
    const porDia = {};
    let totalMinutos = 0;
    let totalMonto = 0;
    let avisos = 0;
    dias.forEach((fecha) => {
        const delDia = suyas.filter(m => m.fecha === fecha);
        const { tramos, avisos: todos, almuerzo, almorzandoDesde } = tramosDelDia(delDia);
        const abierto = tramos.at(-1)?.salida === null ? tramos.at(-1).entrada.en : null;
        const enTurno = fecha === hoy ? abierto : null;
        const enAlmuerzo = fecha === hoy ? almorzandoDesde : null;
        const avisosDia = todos.filter(a => !(enTurno && /^Falta la salida/.test(a)) && !(enAlmuerzo && /^Salió a almorzar/.test(a)));
        const minutos = tramos.reduce((s, t) => s + t.minutos, 0);
        const pago = pagoDelDia(minutos, empleado.tarifaHora);
        porDia[fecha] = { tramos, avisos: avisosDia, minutos, ...pago, marcas: delDia, enTurno, enAlmuerzo, almuerzo };
        totalMinutos += minutos;
        totalMonto += pago.monto;
        avisos += avisosDia.length;
    });
    return { empleado, porDia, totalMinutos, totalMonto, avisos };
});

/** "7 h 35 min" */
export const duracion = (minutos) => {
    const m = Math.round(Number(minutos) || 0);
    if (m === 0) return '—';
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
};

/** "₡12.500" */
export const colones = (n) => `₡${Math.round(Number(n) || 0).toLocaleString('es-CR')}`;

/** Iniciales para la tarjeta: "Doña Carmen" → "DC". */
export const iniciales = (nombre) => String(nombre || '?').trim().split(/\s+/).slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '').join('');
