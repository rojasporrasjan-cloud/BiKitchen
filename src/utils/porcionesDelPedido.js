/**
 * Cuántas porciones de un plato salen de un pedido.
 *
 * Es EL número del que cuelga todo: las etiquetas que se imprimen, los platos
 * que se empacan y los gramos que se ponen a cocinar. Si cada hoja lo calcula
 * por su cuenta, tarde o temprano una dice 3 y la otra 9 sobre el mismo pedido.
 *
 * Estaba escrito tres veces con tres resultados distintos:
 *
 *   · labelDomain.js      Math.max(packs, cantidad) * vecesPorPack   ← el bueno
 *   · buildKitchenSheetData    cantidadMenus * cantidad              ← multiplica
 *   · consolidarCocina         packs * cantidad * vecesPorPack       ← multiplica
 *
 * LA CANTIDAD NO SE MULTIPLICA, SE TOMA LA MAYOR. Un pedido puede traer cuántos
 * packs lleva en `cantidadMenus` (cuando entra por la web) o en la cantidad del
 * ítem (cuando entra por WhatsApp), y a veces en las dos. Son dos formas de
 * escribir el mismo dato, no dos datos que se multipliquen: a quien lleva 3
 * packs le salían 9.
 *
 * Es el mismo criterio que `cantidadDePacks`, y el que ya usaban las etiquetas.
 */

import { mapPackNameToMenuKey, esPersonalizado } from './packClassification';

/**
 * @param {object} pedido - pedido normalizado (mapPedidosFromLegacy)
 * @param {object} plato  - uno de sus platos
 * @returns {number} porciones de ESE plato
 */
export const porcionesDelPlato = (pedido, plato) => {
    // Cuántos packs lleva el pedido entero
    const packs = Number(pedido?.cantidadMenus) > 0 ? Number(pedido.cantidadMenus) : 1;
    // Cuántas veces pidió ese ítem
    const delItem = Number(plato?.cantidad) > 0 ? Number(plato.cantidad) : 1;
    // Cuántas veces se repite ESTE plato dentro de un pack. Un PERSONALIZADO
    // puede llevar 2 de una receta y 4 de otra.
    const veces = Number(plato?.vecesPorPack) > 0 ? Number(plato.vecesPorPack) : 1;

    // Es pack si mapea a un menu semanal, o si es un PERSONALIZADO. Ojo: NO
    // sirve `esIndividualEnLaHoja`, que parece el inverso pero no lo es. Un
    // PERSONALIZADO a proposito no mapea a ningun menu —si mapeara, la hoja le
    // pondria los platos del menu oficial en vez de los suyos— y esa funcion lo
    // daria por suelto, ignorando cuantos packs lleva. Esta es la misma
    // definicion que usan las etiquetas.
    const nombrePlan = pedido?.plan || pedido?.tipoMenu || '';
    const esPack = !!mapPackNameToMenuKey(nombrePlan) || esPersonalizado(nombrePlan);

    // En un producto suelto manda la cantidad del plato: un pedido con
    // "1× salsa y 5× pollo" no lleva 5 de cada cosa. En un pack, la cantidad
    // habla del pedido entero, así que se toma la mayor de las dos.
    return (esPack ? Math.max(packs, delItem) : delItem) * veces;
};
