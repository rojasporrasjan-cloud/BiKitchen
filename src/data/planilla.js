/**
 * Reglas de la planilla. Para cambiarlas no hace falta saber de código.
 *
 * Se paga por hora. Lo que pase de JORNADA_HORAS en un día se cuenta como hora
 * extra y se paga a FACTOR_EXTRA (en Costa Rica, tiempo y medio). Si BiKitchen
 * no paga extras distinto, poner FACTOR_EXTRA = 1.
 */
export const JORNADA_HORAS = 8;
export const FACTOR_EXTRA = 1.5;

/** Si alguien marca dos veces seguidas en este rato, la segunda no cuenta (dedo doble). */
export const SEGUNDOS_ENTRE_MARCAS = 60;

/**
 * Las cuatro marcas posibles. El almuerzo es una salida (o entrada) con
 * `motivo: 'almuerzo'`: el rato almorzando no se paga, pero queda anotado.
 */
export const ACCIONES_RELOJ = {
    entrada: { tipo: 'entrada', motivo: null, nombre: 'Entrada' },
    almuerzo: { tipo: 'salida', motivo: 'almuerzo', nombre: 'Salida a almorzar' },
    vuelta: { tipo: 'entrada', motivo: 'almuerzo', nombre: 'Vuelta del almuerzo' },
    salida: { tipo: 'salida', motivo: null, nombre: 'Salida' }
};

export const accionDeMarca = (m) => {
    if (m?.tipo === 'entrada') return m.motivo === 'almuerzo' ? 'vuelta' : 'entrada';
    return m?.motivo === 'almuerzo' ? 'almuerzo' : 'salida';
};

/** Colores de las tarjetas del reloj (se elige uno al crear el empleado). */
export const COLORES_EMPLEADO = [
    'orange', 'emerald', 'sky', 'violet', 'rose', 'amber', 'teal', 'indigo', 'lime', 'pink'
];

/** Las clases de cada color, completas (Tailwind no ve las armadas con `bg-${color}`). */
export const TONOS_EMPLEADO = {
    orange: { solido: 'bg-orange-500', suave: 'bg-orange-500/15', texto: 'text-orange-300', anillo: 'ring-orange-400' },
    emerald: { solido: 'bg-emerald-500', suave: 'bg-emerald-500/15', texto: 'text-emerald-300', anillo: 'ring-emerald-400' },
    sky: { solido: 'bg-sky-500', suave: 'bg-sky-500/15', texto: 'text-sky-300', anillo: 'ring-sky-400' },
    violet: { solido: 'bg-violet-500', suave: 'bg-violet-500/15', texto: 'text-violet-300', anillo: 'ring-violet-400' },
    rose: { solido: 'bg-rose-500', suave: 'bg-rose-500/15', texto: 'text-rose-300', anillo: 'ring-rose-400' },
    amber: { solido: 'bg-amber-500', suave: 'bg-amber-500/15', texto: 'text-amber-300', anillo: 'ring-amber-400' },
    teal: { solido: 'bg-teal-500', suave: 'bg-teal-500/15', texto: 'text-teal-300', anillo: 'ring-teal-400' },
    indigo: { solido: 'bg-indigo-500', suave: 'bg-indigo-500/15', texto: 'text-indigo-300', anillo: 'ring-indigo-400' },
    lime: { solido: 'bg-lime-500', suave: 'bg-lime-500/15', texto: 'text-lime-300', anillo: 'ring-lime-400' },
    pink: { solido: 'bg-pink-500', suave: 'bg-pink-500/15', texto: 'text-pink-300', anillo: 'ring-pink-400' }
};

export const tonoDe = (color) => TONOS_EMPLEADO[color] || TONOS_EMPLEADO.orange;

/**
 * La lista de Gina (8 oct 2026): quién trabaja y cuánto gana por hora.
 * Sale como botón en Planilla solo mientras no hay ningún empleado cargado;
 * después todo se cambia desde el panel, no aquí.
 */
export const EMPLEADOS_INICIALES = [
    { nombre: 'Doña Carmen', tarifaHora: 2500 },
    { nombre: 'Rosa', tarifaHora: 2000 },
    { nombre: 'Fernanda', tarifaHora: 2200 },
    { nombre: 'Osmany', tarifaHora: 1800 },
    { nombre: 'Paula', tarifaHora: 2000 },
    { nombre: 'Natasha', tarifaHora: 1800 },
    { nombre: 'Tannia', tarifaHora: 1900 },
    { nombre: 'Allison', tarifaHora: 1800 },
    { nombre: 'Isabel', tarifaHora: 1800 }      // "Novia Ever Isa" en la lista de Gina
];
