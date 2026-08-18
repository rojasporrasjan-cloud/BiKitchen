/**
 * Acumula las cantidades a cocinar a granel para la hoja de cocina.
 *
 * Existe por un error real encontrado en la hoja del 19 de agosto de 2026:
 *
 *   Picadillo de vainica y zanahoria ....... 207 TAZA(S)
 *
 * cuando los demás vegetales iban en 12. El mismo plato es VEGETAL en un menú
 * (12 tazas) y PROTEÍNA en otro (195 g), y como el acumulador se indexaba solo
 * por el nombre, los gramos caían en la casilla de las tazas: 12 + 195 = 207.
 *
 * La cocina habría leído "207 tazas de picadillo".
 *
 * Se arregla indexando por nombre + unidad, para que gramos y tazas nunca
 * terminen en el mismo número. Un plato que sea las dos cosas sale en dos
 * líneas, cada una con su unidad, que es lo correcto: son dos preparaciones
 * distintas.
 */

/**
 * Normaliza el nombre para que no se dupliquen líneas por espacios de más.
 *
 * "Yuca al ajillo" y "Yuca al ajillo " salían como dos renglones distintos en
 * la hoja, y en cocina no hay forma de saber si son lo mismo o no.
 */
export const normalizarNombrePlato = (nombre) =>
    String(nombre || '').replace(/\s+/g, ' ').trim();

/** Clave del acumulador: el nombre NO alcanza, hace falta también la unidad. */
export const claveGranel = (nombre, unidad) =>
    `${normalizarNombrePlato(nombre).toLowerCase()}|${unidad}`;

/**
 * Suma una cantidad al acumulador.
 *
 * @param {object} mapa - acumulador (se modifica)
 * @param {string} nombre - nombre del plato
 * @param {number} cantidad - cuánto sumar
 * @param {string} unidad - 'g' o 'taza(s)'
 * @param {(n: string) => string} [categoria] - para agrupar por estación
 */
export const sumarAGranel = (mapa, nombre, cantidad, unidad, categoria) => {
    const limpio = normalizarNombrePlato(nombre);
    if (!limpio || limpio === '—') return mapa;

    const clave = claveGranel(limpio, unidad);
    if (!mapa[clave]) {
        mapa[clave] = {
            name: limpio,
            category: categoria ? categoria(limpio) : 'Otros',
            totalQty: 0,
            unit: unidad,
            isBulk: true
        };
    }
    mapa[clave].totalQty += Number(cantidad) || 0;
    return mapa;
};
