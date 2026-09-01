/**
 * Cuanto hay que poner a cocinar de un renglon de la hoja.
 *
 * Dos reglas que puso Gina el 1 de setiembre de 2026:
 *
 * 1. A los INDIVIDUALES no se les suma merma. "Si son 250 poner 250, si son 500
 *    poner 500, si es kilo poner kilo, porque las cocineras ya saben como
 *    cocinar eso." La merma es para las ollas de los packs, donde se reparte a
 *    ojo; un individual se pesa y se empaca.
 *
 *    Un mismo plato puede ir a las dos cosas —el pollo al pesto va en los packs
 *    Y como individual de 250 g—, asi que la merma se le aplica SOLO a la parte
 *    que va a las ollas.
 *
 * 2. Los gramos se redondean SIEMPRE HACIA ARRIBA. Quedarse corto significa que
 *    a alguien le falta comida; que sobren unos gramos no le hace daño a nadie.
 */

import { MARGEN_COCINA } from './productionHelpers';

/**
 * Cuanto de este renglon va a individuales, en la misma unidad del renglon.
 *
 * Solo cuentan las entradas que se miden igual: sumar 250 g con 1 taza daria
 * un numero que no significa nada.
 */
export const parteDeIndividuales = (item) => {
    const unidad = item?.unit;
    return (item?.individualEntries || [])
        .filter(e => e?.unit === unidad)
        .reduce((acc, e) => acc + (Number(e.qty) || 0), 0);
};

/**
 * @param {object} item    renglon del granel
 * @param {number} margen  factor de merma (1.30 = 30%)
 * @returns {number} lo que hay que cocinar
 */
export const cuantoCocinar = (item, margen = MARGEN_COCINA) => {
    const total = Number(item?.totalQty) || 0;

    // Las unidades ya se cuentan de a una: no se les pone merma ni se redondean.
    if (item?.unit === 'unidades') return total;

    const individuales = Math.min(parteDeIndividuales(item), total);
    const enOllas = Math.max(0, total - individuales);
    const crudo = enOllas * margen + individuales;

    // "Redondear pesos a mas siempre": quedarse corto deja a alguien sin comida.
    if (item?.unit === 'g') return Math.ceil(crudo);
    return Math.round(crudo * 100) / 100;
};
