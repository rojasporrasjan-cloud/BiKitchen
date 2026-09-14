/**
 * Cómo pedirle a Firestore SOLO los pedidos de unas fechas.
 *
 * "podrías solo utilizar recursos para cargar los pedidos del día o los que se
 *  necesitan para no estar gastando tanto" — Jan, 14 de setiembre de 2026.
 *
 * Antes la hoja de producción bajaba todo lo de los últimos 40 días (~340
 * pedidos) y además el menú del panel bajaba la colección entera (~600) en cada
 * página. Para una hoja de sábado + lunes hacen falta unos 90.
 *
 * LA TRAMPA: no alcanza con buscar la fecha dentro de `fechas_entrega`.
 *
 * `getScheduleFromOrder` —de donde sale el calendario que usa toda la cocina—
 * a veces NO lee las fechas guardadas: cuando un pack dice "mensual" y tiene
 * menos de cuatro guardadas, las CALCULA sumando semanas a `fecha_entrega`.
 * Esas fechas calculadas no están escritas en ningún lado, así que una
 * consulta por fecha no las encuentra y el cliente desaparece de la hoja sin
 * aviso. Por eso son DOS consultas y se juntan:
 *
 *   1. `fechas_entrega` contiene alguna de las fechas     → las guardadas
 *   2. `fecha_entrega` entre (primera − 4 semanas) y la última → las calculadas
 *
 * Una fecha calculada cae como mucho tres semanas después de `fecha_entrega`
 * (un mensual: la base más 7, 14 y 21 días). Se toman cuatro para dejar una
 * semana de margen. Después, `pedidosDeLaHoja` filtra en memoria con el mismo
 * `getScheduleFromOrder` de siempre: la consulta solo tiene que no perder a
 * nadie, no decidir quién va.
 */

/** Hasta dónde puede caer una fecha calculada después de `fecha_entrega`. */
export const DIAS_HACIA_ATRAS = 28;

/** Firestore acepta hasta 30 valores en un `array-contains-any`. */
export const MAXIMO_POR_CONSULTA = 30;

const esFecha = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || ''));

const correr = (iso, dias) => {
    const [y, m, d] = iso.split('-').map(Number);
    const fecha = new Date(Date.UTC(y, m - 1, d + dias));
    return fecha.toISOString().slice(0, 10);
};

/**
 * Las consultas que hay que hacer para unas fechas.
 *
 * @param {string[]} fechas  YYYY-MM-DD
 * @returns {{ grupos: string[][], desde: string, hasta: string } | null}
 */
export const consultasParaFechas = (fechas = []) => {
    const lista = [...new Set((fechas || []).filter(esFecha))].sort();
    if (lista.length === 0) return null;
    const grupos = [];
    for (let i = 0; i < lista.length; i += MAXIMO_POR_CONSULTA) {
        grupos.push(lista.slice(i, i + MAXIMO_POR_CONSULTA));
    }
    return {
        grupos,
        desde: correr(lista[0], -DIAS_HACIA_ATRAS),
        hasta: lista[lista.length - 1]
    };
};

/**
 * ¿Las consultas traen este pedido? Es lo que Firestore haría, escrito a mano
 * para poder probarlo contra el calendario de verdad.
 */
export const laConsultaLoTrae = (pedido, fechas = []) => {
    const plan = consultasParaFechas(fechas);
    if (!plan) return false;
    const guardadas = Array.isArray(pedido?.fechas_entrega) ? pedido.fechas_entrega : [];
    if (plan.grupos.some(g => g.some(f => guardadas.includes(f)))) return true;
    const base = pedido?.fecha_entrega;
    return typeof base === 'string' && base >= plan.desde && base <= plan.hasta;
};

/** Todas las fechas entre dos, incluidas. */
export const fechasEntre = (desde, hasta) => {
    if (!esFecha(desde) || !esFecha(hasta) || desde > hasta) return [];
    const salida = [];
    for (let f = desde; f <= hasta; f = correr(f, 1)) salida.push(f);
    return salida;
};

/**
 * Las fechas de reparto para los selectores de fecha: lunes, miércoles y
 * sábado, de una semana atrás a seis adelante.
 *
 * Los selectores se armaban recorriendo TODOS los pedidos para ver qué fechas
 * tenían entregas, y para eso cada pantalla bajaba la colección entera. Un día
 * fuera de este calendario se elige con el campo de fecha libre.
 *
 * @param {Date} [hoy]
 */
export const fechasDeReparto = (hoy = new Date(), { atras = 7, adelante = 42 } = {}) => {
    const base = new Date(hoy);
    base.setHours(12, 0, 0, 0);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const salida = [];
    for (let i = -atras; i <= adelante; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        if ([1, 3, 6].includes(d.getDay())) salida.push(iso(d));
    }
    return salida;
};
