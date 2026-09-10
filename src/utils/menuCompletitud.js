/**
 * Cuantos campos de un plato estan llenos.
 *
 * El contador del editor de menus decia "0 / 5 platos completos" aunque los
 * quince campos estuvieran escritos, porque el carbohidrato se sumaba DOS
 * veces: una en el conteo y otra en el return. Un plato completo daba 4 y el
 * contador exigia exactamente 3, asi que ninguno calificaba nunca.
 *
 * No es cosmetico. Es la unica senal de que el menu quedo cargado: Gina llena
 * el menu de la semana, el contador sigue en cero y no tiene como saber si
 * guardo. La semana del 8 de setiembre el menu de cena quedo con el de la
 * semana anterior y nadie se entero hasta que la comida estaba cocinandose.
 *
 * @param {object} plato  { proteina, vegetal, carbo }
 * @param {object} tipo
 * @param {boolean} tipo.isSingleField  familiares y desayunos: un solo campo
 * @param {boolean} tipo.isSinCarbos    sin carbos: el carbo no cuenta
 * @returns {number} cuantos campos requeridos estan llenos
 */
export const camposLlenos = (plato, { isSingleField = false, isSinCarbos = false } = {}) => {
    const lleno = (x) => !!String(x ?? '').trim();

    // Los familiares y los desayunos son un platillo con nombre y nada mas
    if (isSingleField) return lleno(plato?.proteina) ? 1 : 0;

    let n = 0;
    if (lleno(plato?.proteina)) n += 1;
    if (lleno(plato?.vegetal)) n += 1;
    // El sin carbos se completa con proteina y vegetal: el carbo no va
    if (!isSinCarbos && lleno(plato?.carbo)) n += 1;
    return n;
};

/** Cuantos campos hacen falta para dar un plato por completo. */
export const camposQuePide = ({ isSingleField = false, isSinCarbos = false } = {}) =>
    (isSingleField ? 1 : (isSinCarbos ? 2 : 3));

/** Si el plato esta completo para su tipo de menu. */
export const platoCompleto = (plato, tipo = {}) =>
    camposLlenos(plato, tipo) === camposQuePide(tipo);
