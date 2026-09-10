/**
 * Que dos dias cubre la proxima hornada de cocina.
 *
 * El ciclo es siempre el mismo: se cocina para el SABADO y el LUNES juntos,
 * porque son los dos dias de entrega de esa tanda y comparten el menu de la
 * semana. La hoja sale el jueves con los mensuales y quincenales, y se completa
 * el viernes y el sabado con lo que fue entrando.
 */

const DIA = 24 * 60 * 60 * 1000;

const aTexto = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

/** Se usa mediodia para que el cambio de horario no corra el dia. */
const desdeTexto = (iso) => new Date(`${iso}T12:00:00`);

/** El sabado que viene, o hoy mismo si hoy es sabado. */
export const proximoSabado = (hoyISO) => {
    const hoy = desdeTexto(hoyISO);
    const faltan = (6 - hoy.getDay() + 7) % 7;   // 6 = sabado
    return aTexto(new Date(hoy.getTime() + faltan * DIA));
};

/** El lunes que sigue a ese sabado: dos dias despues. */
export const lunesDespuesDe = (sabadoISO) =>
    aTexto(new Date(desdeTexto(sabadoISO).getTime() + 2 * DIA));

/**
 * Las dos fechas de la proxima hornada.
 *
 * @param {string} hoyISO  YYYY-MM-DD
 * @returns {{ sabado: string, lunes: string }}
 */
export const proximaHornada = (hoyISO) => {
    const sabado = proximoSabado(hoyISO);
    return { sabado, lunes: lunesDespuesDe(sabado) };
};
