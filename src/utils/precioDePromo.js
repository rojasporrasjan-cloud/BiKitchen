/**
 * El precio de un pack dentro de una promoción.
 *
 * Se vendio un Pack Mensual Bajo Calorias en CERO colones. El pedido de Daniel
 * Milanes entro por la web el 1 de setiembre de 2026 con el pack a ₡0 y un
 * total de ₡6.000, que es solo el envio.
 *
 * La promo guarda el precio en DOS formas segun como se creo:
 *
 *   precios: [{ nombre: 'Pack Bajo Calorias', precio: 99500 }, ...]   por pack
 *   precio: 77500                                                    uno solo
 *
 * El codigo preguntaba `if (promo.precios && Array.isArray(promo.precios))` y
 * se metia en esa rama aunque el arreglo estuviera VACIO —`[]` es truthy—, no
 * encontraba nada, y devolvia 0 sin llegar nunca al respaldo `promo.precio`,
 * que en esa promo tenia los 77.500.
 *
 * Acá se recorren las dos formas hasta encontrar un precio de verdad, y si no
 * hay ninguno se devuelve null: null es "no se sabe", que NO es lo mismo que
 * "sale gratis". Quien llame tiene que negarse a vender con null.
 */

const norm = (t) => String(t || '').toLowerCase().trim();

/** Busca el pack dentro de una lista de precios. */
const enLista = (lista, pack) => {
    if (!Array.isArray(lista) || lista.length === 0) return null;
    const n = norm(pack);
    const hit = lista.find(p => {
        const nombre = norm(p?.nombre);
        return nombre === n || nombre.includes(n) || n.includes(nombre);
    });
    const precio = Number(hit?.precio);
    return precio > 0 ? precio : null;
};

/**
 * @param {object} promo  documento de la promoción
 * @param {string} pack   nombre del pack elegido
 * @returns {number|null} el precio, o null si no se pudo determinar
 */
export const precioDePromo = (promo, pack) => {
    if (!promo) return null;
    return enLista(promo.precios, pack)
        ?? enLista(promo.detalles?.packs, pack)
        ?? (Number(promo.precio) > 0 ? Number(promo.precio) : null);
};
