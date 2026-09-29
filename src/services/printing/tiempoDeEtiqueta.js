/**
 * Cuánto tarda UNA etiqueta en salir del cabezal.
 *
 * Transmitir los bytes no es imprimir. La M110 saca papel a unos 18 mm/s, y
 * hasta que no termina, lo que se le mande encima **se pierde**: la impresora se
 * queda sin memoria y la etiqueta no sale. Pasó de verdad dos veces: de un lote
 * de 11 salieron 9 y la décima quedó cortada, y en el teléfono de 5 salieron 3.
 *
 * Vive aparte para que lo usen los dos que lo necesitan —el adaptador, para
 * esperar, y el calibrador, para avisar— sin que ninguno arrastre al otro ni
 * haya dos números distintos dando vueltas.
 */

/** A esta velocidad sale el papel. Medido, no de la ficha técnica. */
const MM_POR_SEGUNDO = 18;

/** Lo que tarda el motor en arrancar y en cortar. */
const MARGEN_MS = 450;

/**
 * Los milisegundos que hay que esperar por una etiqueta de este alto.
 *
 * @param {{heightMm?: number}} settings
 * @returns {number}
 */
export const tiempoQueTardaLaEtiquetaMs = (settings) => {
    const altoMm = Number(settings?.heightMm) > 0 ? Number(settings.heightMm) : 20;
    return Math.round((altoMm / MM_POR_SEGUNDO) * 1000) + MARGEN_MS;
};

/**
 * La pausa que de verdad se va a usar entre una etiqueta y la siguiente.
 *
 * Un valor puesto a mano **nunca puede quedar por debajo** de lo que tarda el
 * papel: por debajo de eso no es "más rápido", es perder etiquetas.
 *
 * Y es fácil caer ahí sin querer: el control del calibrador va de 0 a 4000 de
 * 250 en 250, así que el primer paso después de "automática" es 250 ms — para
 * una etiqueta de 25 mm, siete veces menos de lo que necesita. Así quedó
 * guardada la calibración compartida y así perdió etiquetas en la compu.
 *
 * @param {{heightMm?: number, interLabelDelayMs?: number}} settings
 * @returns {number}
 */
export const pausaEntreEtiquetasMs = (settings) => {
    const necesaria = tiempoQueTardaLaEtiquetaMs(settings);
    const fijada = Number(settings?.interLabelDelayMs) || 0;
    return fijada > necesaria ? fijada : necesaria;
};

/**
 * ¿El número escrito a mano se queda corto y por eso no se usa?
 *
 * Sirve para decírselo a quien está calibrando, en vez de dejarlo creer que
 * movió algo. `0` es "automática" y no es quedarse corto.
 *
 * @returns {null | {fijada: number, necesaria: number}}
 */
export const pausaDemasiadoCorta = (settings) => {
    const fijada = Number(settings?.interLabelDelayMs) || 0;
    if (fijada <= 0) return null;
    const necesaria = tiempoQueTardaLaEtiquetaMs(settings);
    return fijada < necesaria ? { fijada, necesaria } : null;
};
