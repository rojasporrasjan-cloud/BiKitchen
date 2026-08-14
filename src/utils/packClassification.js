/**
 * Clasificación de packs para las hojas de producción.
 *
 * De acá depende que un pedido salga bien o mal impreso, así que vive aparte de
 * la vista para poder probarlo:
 *
 *  - isIndividualPack()    → decide si el pedido se imprime como platos sueltos
 *                            (con su gramaje) o como pack de Menú Semanal.
 *  - mapPackNameToMenuKey() → busca el menú oficial de la semana. Si devuelve null
 *                            y el pack NO es individual, sale el aviso rojo
 *                            "Falta configurar el Menú Semanal".
 *  - getDefaultGrams()      → gramaje por porción cuando el plato no trae el suyo.
 *
 * El nombre que reciben es `plan || tipoMenu` del pedido.
 */

/** Menú oficial de la semana al que corresponde el pack. null = no hay menú. */
export const mapPackNameToMenuKey = (name) => {
    const n = String(name || '').toLowerCase();
    if ((n.includes('bajo') || n.includes('bajas')) && n.includes('calor')) return 'bajoCalorias';
    if (n.includes('sin carbos')) return 'sinCarbos';
    if (n.includes('keto')) return 'keto';
    if (n.includes('vegetariano')) return 'vegetariano';
    if (n.includes('casadito')) return 'casaditos';
    if (n.includes('full pack')) return 'fullPack';
    if (n.includes('desayuno')) return 'desayuno';
    if (n.includes('regular') || n.includes('estandar') || n.includes('estándar')) return 'regular';
    if ((n.includes('mensual') || n.includes('quincenal')) && !n.includes('proteína') && !n.includes('proteina')) return 'regular';
    return null;
};

/**
 * ¿Se imprime como platos sueltos? Estos NO se buscan en el Menú Semanal: los
 * platos vienen escritos en el pedido, cada uno con su gramaje.
 */
export const isIndividualPack = (name) => {
    const n = String(name || '').toLowerCase();
    return n.includes('individual')
        || n.includes('proteína') || n.includes('proteina')
        || n.includes('granel');
};

/** Gramos de proteína por porción cuando el plato no trae el dato. */
export const getDefaultGrams = (packName) => {
    const n = String(packName || '').toLowerCase();
    if (((n.includes('bajo') || n.includes('bajas')) && n.includes('calor')) || n.includes('sin carbo')) return 120;
    if (n.includes('keto')) return 200;
    if (n.includes('regular') || n.includes('casadito')) return 100;
    return 150; // Full pack y default
};
