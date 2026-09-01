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

    // "Paquete Deluxe" es el nombre VISIBLE del Pack Familiar Deluxe
    // (packsData.js: 'Pack Familiar Deluxe' -> nombre: 'Paquete Deluxe'). El
    // checkout guarda ese nombre en `plan` y ahi se pierde la palabra
    // "Familiar", asi que la regla de mas abajo —deluxe sin familiar es Full
    // Pack— lo mandaba a cocinar 5 platos individuales de 150 g en vez de los 7
    // para 4 personas que pago. Le paso a 11 pedidos, 9 ya entregados.
    //
    // "Pack Deluxe" a secas NO entra: hay un pedido asi con categoria
    // Individuales, que es otro producto.
    if (n.includes('paquete deluxe')) return 'familiarDeluxe';
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

/**
 * Gramos de proteína por porción cuando el plato no trae el dato.
 *
 * Un gramaje escrito en el nombre MANDA sobre todo lo demás. Hace falta para
 * los pedidos PERSONALIZADO: su nombre no puede calzar con ningún pack —si
 * calzara, la hoja les pondría los platos del menú oficial en vez de los suyos—
 * y sin gramaje caían en los 150 g por defecto. A Sonia Oreamuno, que es Pack
 * Regular de 100 g, eso le subía la porción un 50%.
 */
export const getDefaultGrams = (packName) => {
    const n = String(packName || '').toLowerCase();

    const escrito = n.match(/(\d{2,4})\s*(?:gramos|grs?|g)\b/);
    if (escrito) return Number(escrito[1]);

    if (((n.includes('bajo') || n.includes('bajas')) && n.includes('calor')) || n.includes('sin carbo')) return 120;
    if (n.includes('keto')) return 200;
    if (n.includes('regular') || n.includes('casadito')) return 100;
    return 150; // Full pack y default
};

/**
 * Un pack PERSONALIZADO: sus platos salen del propio pedido, no del menu
 * semanal.
 *
 * Gina los lleva asi en su pestaña "Personalizado". Los usa quien pide el menu
 * de OTRA semana —a Fatima Arauz habia que reponerle las cenas del menu del
 * 25 al 31 de agosto— o quien pide cambios que ya no calzan con ningun pack.
 */
export const esPersonalizado = (name) => /^personalizado/i.test(String(name || '').trim());

/**
 * ¿El pack lleva fila de harina?
 *
 * Keto y Sin Carbos no llevan, por definicion. Y tampoco un pack cuyos platos
 * simplemente no traen carbo: las cenas Sin Carbos que se le repusieron a
 * Fatima Arauz son proteina y vegetal, y la hoja les imprimia una tercera fila
 * con "—" y "0.5" al lado, como si hubiera media taza de algo que servir.
 */
export const llevaFilaDeCarbo = (platos, menuKey) => {
    if (menuKey === 'keto' || menuKey === 'sinCarbos') return false;
    if (!Array.isArray(platos) || platos.length === 0) return true;
    return platos.some(p => {
        const n = typeof p?.carbo === 'string' ? p.carbo : p?.carbo?.nombre;
        return !!n && String(n).trim() !== '' && String(n).trim() !== '—';
    });
};

/**
 * Lleva fila de vegetal?
 *
 * El Paquete Deluxe son SIETE platos completos para 4 personas —"Estofado de
 * carne de res (4 porciones)", "Canelones rellenos con queso (4 porciones)"—.
 * No traen vegetal aparte, pero la hoja les imprimia igual una segunda fila
 * vacia con un "1" al lado, como si hubiera una taza de algo que servir. Catorce
 * renglones para siete platos, la mitad en blanco.
 */
export const llevaFilaDeVegetal = (platos) => {
    if (!Array.isArray(platos) || platos.length === 0) return true;
    return platos.some(p => {
        const n = typeof p?.vegetal === 'string' ? p.vegetal : p?.vegetal?.nombre;
        return !!n && String(n).trim() !== '' && String(n).trim() !== '—';
    });
};

/**
 * Bajo que nombre se imprime la hoja de empaque de un pack.
 *
 * Los packs de una misma familia comparten menu, asi que se juntan en UNA sola
 * hoja: "Pack Bajo Calorias Promo Almuerzo y Cena" y "Pack 2 Semanas Bajo
 * Calorias" son los mismos cinco platos.
 *
 * Un PERSONALIZADO no. Sus platos son suyos y el nombre de familia solo dice
 * como se empaca —cuanta proteina, si lleva harina—. A Fatima Arauz, que lleva
 * las cenas del menu del 25 al 31 de agosto, se la metian en la hoja del Pack
 * Sin Carbos de ESTA semana y le cambiaban los cinco platos.
 *
 * @param {string} packName        nombre del pack en el pedido
 * @param {string} etiquetaFamilia nombre de la familia (MENU_LABELS), si tiene
 */
export const nombreDeHojaDeEmpaque = (packName, etiquetaFamilia) =>
    esPersonalizado(packName) ? packName : (etiquetaFamilia || packName);

/**
 * Cuanto lleva CADA PLATO de cada familia de pack.
 *
 * Estaba a medias y repartido: la proteina salia de getDefaultGrams y el
 * vegetal y la harina eran 1 y 0,5 fijos para todos, escritos a mano en cinco
 * lugares distintos de la hoja. Gina lo corrigio al sacar la hoja del miercoles
 * 2 de setiembre de 2026:
 *
 *   Keto        1,5 taza de vegetal   (no 1)
 *   Casaditos   1,5 de harina y 0,5 de vegetal   (estaba al reves)
 *   Familiar    la porcion es 1 kg o 4 tazas, no gramos por persona
 *
 * `proteina: null` quiere decir que el plato NO se mide en gramos por persona:
 * es una bandeja entera y el numero por plato no significa nada.
 */
export const PORCIONES_POR_FAMILIA = {
    bajoCalorias:    { proteina: 120,  vegetal: 1,   carbo: 0.5 },
    sinCarbos:       { proteina: 120,  vegetal: 1,   carbo: 0   },
    keto:            { proteina: 200,  vegetal: 1.5, carbo: 0   },
    regular:         { proteina: 100,  vegetal: 1,   carbo: 0.5 },
    casaditos:       { proteina: 100,  vegetal: 0.5, carbo: 1.5 },
    vegetariano:     { proteina: 150,  vegetal: 1,   carbo: 0.5 },
    fullPack:        { proteina: 150,  vegetal: 1,   carbo: 0.5 },
    familiarPremium: { proteina: null, vegetal: null, carbo: null, textoPorcion: '1 KG O 4 TAZAS POR PLATO', porcionCorta: '1 kg o 4 tazas' },
    familiarDeluxe:  { proteina: null, vegetal: null, carbo: null, textoPorcion: '1 KG O 4 TAZAS POR PLATO', porcionCorta: '1 kg o 4 tazas' }
};

const PORCION_POR_DEFECTO = { proteina: 150, vegetal: 1, carbo: 0.5 };

/** Lo que lleva un plato de ese pack. Acepta el nombre o la clave del menu. */
export const porcionesDelPack = (packNameOMenuKey) => {
    const clave = PORCIONES_POR_FAMILIA[packNameOMenuKey]
        ? packNameOMenuKey
        : mapPackNameToMenuKey(packNameOMenuKey);
    return PORCIONES_POR_FAMILIA[clave] || PORCION_POR_DEFECTO;
};

/**
 * Familias que se cocinan APARTE y hay que poder verlas de un vistazo.
 *
 * "Ojala en la hoja de produccion especifique que es keto porque se cocina
 * aparte, igual cuando es vegetariano" — Gina.
 */
export const AVISO_DE_FAMILIA = {
    keto: 'KETO — SE COCINA APARTE',
    vegetariano: 'VEGETARIANO — SE COCINA APARTE'
};

export const avisoDeFamilia = (packName) => AVISO_DE_FAMILIA[mapPackNameToMenuKey(packName)] || '';
