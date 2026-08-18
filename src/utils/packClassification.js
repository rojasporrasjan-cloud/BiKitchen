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
    if (n.includes('familiar') && n.includes('deluxe')) return 'familiarDeluxe';
    if (n.includes('familiar') && n.includes('premium')) return 'familiarPremium';
    if (n.includes('familiar')) return 'familiarPremium';
    if ((n.includes('bajo') || n.includes('bajas')) && n.includes('calor')) return 'bajoCalorias';
    if (n.includes('sin carbos')) return 'sinCarbos';
    if (n.includes('keto')) return 'keto';
    if (n.includes('vegetariano')) return 'vegetariano';
    if (n.includes('casadito')) return 'casaditos';
    if (n.includes('full pack') || (n.includes('deluxe') && !n.includes('familiar'))) return 'fullPack';
    // Los desayunos van ANTES del comodín de abajo. Si se dejan después,
    // "Pack Desayunos Mensual" cae en la regla de "mensual" y la cocina recibe
    // el menú de almuerzos: gallo pinto convertido en carne mechada.
    if (n.includes('desayuno')) return 'desayuno';
    if ((n.includes('regular') || n.includes('estandar') || n.includes('estándar'))) return 'regular';
    // Comodín: un pack que solo dice cada cuánto viene se asume regular. Tiene
    // que quedar de último, después de todos los tipos con nombre propio.
    if ((n.includes('mensual') || n.includes('quincenal')) && !n.includes('proteína') && !n.includes('proteina')) return 'regular';
    return null;
};

/**
 * ¿Se imprime como platos sueltos? Estos NO se buscan en el Menú Semanal: los
 * platos vienen escritos en el pedido, cada uno con su gramaje.
 */
export const isIndividualPack = (name) => {
    const n = String(name || '').toLowerCase();

    // Si el nombre corresponde a un pack oficial, MANDA eso.
    //
    // El nombre del pack suele arrastrar la nota del cambio que pidió el cliente:
    // "pack vegetariano cambiar tortas de espinaca por pollo en salsa hongos".
    // Sin esta línea, la palabra "tortas" saca ese pack de su menú y la cocina
    // prepara 1 porción suelta en vez de los 5 platos del Pack Vegetariano.
    if (mapPackNameToMenuKey(n)) return false;

    return n.includes('individual')
        || n.includes('proteína') || n.includes('proteina')
        || n.includes('granel')
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
