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
    
    // Si es un pack de solo proteínas a la carta (Pack 5 Proteínas, Pack 3 Proteínas, etc), es un ítem individual
    if (/pack\s*\d*\s*prote[íi]na/i.test(n) || /pack\s+de\s+prote[íi]na/i.test(n)) {
        return null;
    }

    if (n.includes('familiar') && n.includes('deluxe')) return 'familiarDeluxe';
    if (n.includes('familiar') && n.includes('premium')) return 'familiarPremium';
    if (n.includes('familiar')) return 'familiarPremium';
    if ((n.includes('bajo') || n.includes('bajas')) && n.includes('calor')) return 'bajoCalorias';
    if (n.includes('sin carbos')) return 'sinCarbos';
    if (n.includes('keto')) return 'keto';
    if (n.includes('vegetariano')) return 'vegetariano';
    if (n.includes('casadito')) return 'casaditos';
    if (n.includes('full pack') || (n.includes('deluxe') && !n.includes('familiar'))) return 'fullPack';
    if (n.includes('desayuno')) return 'desayuno';
    if ((n.includes('regular') || n.includes('estandar') || n.includes('estándar'))) return 'regular';
    if (n.includes('mensual') || n.includes('quincenal') || n.includes('two pack') || n.includes('2 pack') || n.includes('semanal')) return 'regular';
    return null;
};

/**
 * ¿Se imprime como platos sueltos? Estos NO se buscan en el Menú Semanal: los
 * platos vienen escritos en el pedido, cada uno con su gramaje.
 */
export const isIndividualPack = (name) => {
    const n = String(name || '').toLowerCase();

    // Si el nombre corresponde a un pack oficial, MANDA eso.
    if (mapPackNameToMenuKey(n)) return false;

    return n.includes('individual')
        || /pack\s*\d*\s*prote[íi]na/i.test(n)
        || /prote[íi]na/i.test(n)
        || n.includes('granel')
        || n.includes('porción') || n.includes('porcion')
        || n.includes('torta')
        || n.includes('empanada')
        || n.includes('wrap');
};

/**
 * Cómo lo clasifica la hoja de verdad.
 *
 * Un nombre que no cuadra con ningún Menú Semanal se imprime como platos
 * sueltos: es lo que hace `isActuallyIndividual` en PrintProductionView. La
 * revisión previa tiene que usar el MISMO criterio, o avisa de problemas que no
 * existen y se termina ignorando.
 */
export const esIndividualEnLaHoja = (name) =>
    isIndividualPack(name) || !mapPackNameToMenuKey(name);

/** Gramos de proteína por porción cuando el plato no trae el dato. */
export const getDefaultGrams = (packName) => {
    const n = String(packName || '').toLowerCase();
    if (((n.includes('bajo') || n.includes('bajas')) && n.includes('calor')) || n.includes('sin carbo')) return 120;
    if (n.includes('keto')) return 200;
    if (n.includes('regular') || n.includes('casadito')) return 100;
    return 150; // Full pack y default
};
