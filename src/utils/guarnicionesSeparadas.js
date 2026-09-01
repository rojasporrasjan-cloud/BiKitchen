/**
 * Las guarniciones van cada una en su olla, y no todas se miden en tazas.
 *
 * Correcciones de Gina al sacar la hoja del miercoles 2 de setiembre de 2026:
 *
 *   "se cocina arroz frijoles y maduros juntos, tiene que ser todo por aparte,
 *    y si en caso sea 1 taza se cocina 1 taza de cada uno. Los maduros para el
 *    casadito son 2 unidades."
 *
 * `separarComponentes` ya parte las listas escritas con COMA ("Arroz, frijoles
 * y maduros"). Falta la que no la lleva —"Arroz y frijoles"— y falta que cada
 * parte use SU unidad: los maduros se cuentan de a dos por plato, no por taza.
 */

/** Guarniciones que se cuentan sueltas y no por taza. */
export const GUARNICIONES_POR_UNIDAD = {
    maduros: 2,
    maduro: 2
};

const sinTildes = (t) => String(t || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().trim();

/**
 * Nombres de guarnicion que son un solo ingrediente. Solo se parte por " y "
 * cuando TODAS las partes estan en esta lista: asi "Arroz y frijoles" se parte
 * y "Canelones rellenos con queso y envueltos en huevo" no.
 */
const INGREDIENTE_SUELTO = new Set([
    'arroz', 'frijoles', 'frijol', 'maduros', 'maduro', 'platano maduro',
    'platanos maduros', 'ensalada', 'pure de papa', 'tortillas'
]);

/**
 * Parte "Arroz y frijoles" en sus dos ollas.
 *
 * @returns {Array<string>} las partes, o [nombre] si no era una lista
 */
export const separarPorY = (nombre) => {
    const original = String(nombre || '').trim();
    if (!/\s+y\s+/i.test(original)) return [original];

    const partes = original.split(/\s+y\s+/i).map(p => p.trim()).filter(Boolean);
    if (partes.length < 2) return [original];
    if (!partes.every(p => INGREDIENTE_SUELTO.has(sinTildes(p)))) return [original];

    return partes.map(p => p.charAt(0).toUpperCase() + p.slice(1));
};

/**
 * Cuanto lleva UNA guarnicion, ya separada de las demas.
 *
 * Los maduros se cuentan de a dos por plato; todo lo demas conserva la cantidad
 * del renglon, porque "si en caso sea 1 taza se cocina 1 taza de cada uno".
 *
 * @param {string} nombre        la guarnicion ya suelta
 * @param {number} cantidad      lo que traia el renglon completo
 * @param {string} unidad        la unidad del renglon
 * @param {number} platos        cuantos platos se hacen
 */
export const cantidadDeGuarnicion = (nombre, cantidad, unidad, platos) => {
    const porUnidad = GUARNICIONES_POR_UNIDAD[sinTildes(nombre)];
    if (porUnidad && Number(platos) > 0) {
        return { cantidad: porUnidad * Number(platos), unidad: 'unidad(es)' };
    }
    return { cantidad, unidad };
};
