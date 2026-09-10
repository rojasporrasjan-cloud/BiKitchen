/**
 * Reconocer que dos renglones son el MISMO plato escrito distinto.
 *
 * El acumulador de la hoja de cocina se indexa por nombre exacto. En los datos
 * reales el mismo plato viene escrito de muchas formas —"Albóndigas",
 * "Albóndigas de res", "Albondigas artesanales", "Albóndigas de res artesanales
 * en salsa de tomate rostizado"— así que el del pack y el del individual no se
 * reconocen, salen en dos renglones y la cocina los prepara DOS VECES.
 *
 * Emparejar nombres de comida es peligroso: juntar dos platos que no son el
 * mismo es peor que dejarlos separados, porque alguien recibe lo que no pidió y
 * nadie se da cuenta hasta que el cliente reclama. Por eso acá NO hay parecido
 * difuso ni porcentajes. Se piden tres cosas, todas estrictas:
 *
 *   1. MISMA UNIDAD. Gramos y tazas nunca se juntan (ver granelKitchen.js).
 *   2. MISMA PALABRA PRINCIPAL. "Sopa de albóndigas" NO es "Albóndigas":
 *      la primera palabra dice qué es el plato.
 *   3. UNO CONTIENE AL OTRO. Las palabras de un nombre tienen que estar todas
 *      dentro del otro. "Albóndigas de res" ⊂ "Albóndigas de res artesanales"
 *      calza; "Pollo al ajillo" y "Pollo teriyaki" no, porque ninguno contiene
 *      al otro.
 *
 * Y si un nombre podría juntarse con DOS renglones distintos, no se junta con
 * ninguno: "Pollo" cabe igual en "Pollo al ajillo" que en "Pollo teriyaki", y
 * adivinar cuál sería inventar. Eso se reporta para que lo decida una persona.
 */

/** Palabras que no distinguen un plato de otro. */
const VACIAS = new Set([
    'de', 'del', 'en', 'con', 'y', 'a', 'al', 'la', 'el', 'los', 'las',
    'un', 'una', 'para', 'sin', 'su', 'lo'
]);

/**
 * Palabras que nombran una VARIEDAD del ingrediente, no una forma de cocinarlo.
 *
 * Si una está en un nombre y no en el otro, son platos distintos aunque uno
 * contenga al otro. Son colores y clases: el frijol blanco y el rojo se compran
 * aparte y se cocinan aparte.
 */
/**
 * Conectores que hacen del nombre largo OTRO plato, no el mismo escrito mejor.
 *
 *   "Picadillo de vainica Y zanahoria"        -> ademas lleva zanahoria
 *   "Zuchinnis salteados CON hongos"          -> ademas lleva hongos
 *   "Mix de vegetales ESTILO Mediterraneo"    -> otra preparacion
 *
 * "estilo" entro el 10 de setiembre de 2026. Sin el, "Mix de vegetales estilo
 * Mediterraneo" —que solo existe en el menu de cena vegetariana— se fusionaba
 * con el "Mix de vegetales" del bajo calorias, y como gana el nombre mas largo
 * la hoja le pedia a Gina 58 porciones de un plato que no estaba en el menu de
 * la semana. Ella lo cacho: "no tenemos mix de vegetales mediterraneos".
 *
 * Un nombre que la cocina no reconoce es peor que dos renglones separados: se
 * para a preguntar, o peor, cocina otra cosa.
 */
const DISTINGUEN = new Set(['y', 'con', 'estilo']);

const VARIEDADES = new Set([
    'blanco', 'blancos', 'blanca', 'blancas',
    'negro', 'negros', 'negra', 'negras',
    'rojo', 'rojos', 'roja', 'rojas',
    'verde', 'verdes',
    'integral', 'integrales',
    'tierno', 'tiernos', 'tierna', 'tiernas'
]);

/**
 * Lo que agrega el nombre mas largo: ¿dice de QUE es, o dice que le PONEN algo?
 *
 * El conector lo distingue, y es lo unico que lo distingue:
 *
 *   "Albondigas DE res"                -> de que son. Mismo plato.
 *   "Carne mechada EN salsa criolla"   -> como se cocina. Mismo plato.
 *   "Picadillo de vainica Y zanahoria" -> ademas lleva zanahoria. Otro plato.
 *   "Zuchinnis salteados CON hongos"   -> ademas lleva hongos. Otro plato.
 *
 * Sin esto, al cliente keto que pidio picadillo de vainica sola le caia
 * zanahoria, y a los ocho packs de zuchinnis salteados les caian hongos y
 * cebolla caramelizada.
 */
const agregaIngredientes = (nombreLargo, palabrasDelCorto) => {
    const palabras = sinTildes(nombreLargo).replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/).filter(Boolean);
    const yaEsta = new Set(palabrasDelCorto);
    for (let i = 1; i < palabras.length; i++) {
        if (!DISTINGUEN.has(palabras[i - 1])) continue;
        const p = palabras[i];
        if (VACIAS.has(p)) continue;
        if (!yaEsta.has(p)) return true;   // le suma algo que el otro no tiene
    }
    return false;
};

const sinTildes = (texto) => String(texto || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Las palabras que de verdad distinguen el plato, en orden.
 * "Albóndigas de res artesanales" -> ['albondigas', 'res', 'artesanales']
 */
export const palabrasClave = (nombre) => sinTildes(nombre)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 0 && !VACIAS.has(p));

/** La palabra que dice QUÉ es el plato. Es la primera que no es de relleno. */
export const palabraPrincipal = (nombre) => palabrasClave(nombre)[0] || '';

/**
 * ¿Son el mismo plato escrito distinto?
 *
 * No mira la unidad: eso lo decide quien llama, porque depende del acumulador.
 */
/**
 * Los dos nombres hablan del mismo ingrediente base, sin mirar la variedad.
 *
 * Sirve para saber si un nombre podría confundirse con varios renglones —"Arroz"
 * con "Arroz blanco" y con "Arroz al perejil"—, que es cuando hay que dejarlo
 * aparte en vez de adivinar.
 */
export const seParecen = (nombreA, nombreB) => {
    const a = palabrasClave(nombreA);
    const b = palabrasClave(nombreB);
    if (a.length === 0 || b.length === 0) return false;
    if (a[0] !== b[0]) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    const contenido = (chico, grande) => [...chico].every(p => grande.has(p));
    return contenido(setA, setB) || contenido(setB, setA);
};

export const esElMismoPlato = (nombreA, nombreB) => {
    const a = palabrasClave(nombreA);
    const b = palabrasClave(nombreB);
    if (a.length === 0 || b.length === 0) return false;

    // La palabra principal manda: "Sopa de albóndigas" no es "Albóndigas"
    if (a[0] !== b[0]) return false;

    const setA = new Set(a);
    const setB = new Set(b);

    // Una VARIEDAD no es una preparación.
    //
    // "Carne mechada" y "Carne mechada en salsa criolla" son la misma carne
    // cocinada de una forma: se juntan. Pero "Frijoles" y "Frijoles blancos"
    // son dos frijoles distintos, y la regla de "uno contiene al otro" los
    // juntaba. Los frijoles del casadito se estaban sumando al renglón de los
    // blancos: la hoja pedía 101 tazas donde hacían falta 33, y Gina lo tenía
    // claro —en su lista manda "frijoles blancos 30 tazas" y "frijoles
    // arreglado 10 tazas" por separado—.
    const soloEnUno = [...setA].filter(p => !setB.has(p))
        .concat([...setB].filter(p => !setA.has(p)));
    if (soloEnUno.some(p => VARIEDADES.has(p))) return false;

    const contenido = (chico, grande) => [...chico].every(p => grande.has(p));
    if (!contenido(setA, setB) && !contenido(setB, setA)) return false;

    // El largo contiene al corto. Falta ver si lo que le agrega es como se
    // cocina —mismo plato— o algo que le ponen encima —otro plato—.
    const [corto, largo] = a.length <= b.length ? [a, nombreB] : [b, nombreA];
    return !agregaIngredientes(largo, corto);
};

/**
 * Busca en el acumulador el renglón que ya tiene este plato.
 *
 * @param {object} mapa    acumulador de granel, { clave: { name, unit, ... } }
 * @param {string} nombre  nombre del plato que se quiere sumar
 * @param {string} unidad  'g' | 'taza(s)' | 'unidades' | 'kg'
 * @returns {{clave: string|null, ambiguo: Array<string>}}
 *          `clave` es dónde sumarlo. Si viene en null y `ambiguo` trae nombres,
 *          es que calzaba con varios y hay que preguntar en vez de adivinar.
 */
export const buscarRenglonDelMismoPlato = (mapa, nombre, unidad) => {
    // La AMBIGÜEDAD se mide sin mirar variedades, a propósito.
    //
    // "Arroz" —el del casadito, que sale de partir "Arroz, frijoles y
    // maduros"— se parece a "Arroz blanco" y a "Arroz al perejil". Que sean
    // dos es justamente lo que dice que no se sabe cuál es: queda aparte, que
    // es lo correcto. Si la variedad se filtrara antes de contar, quedaría uno
    // solo y las 69 tazas del casadito se irían al arroz al perejil.
    const parecidos = Object.entries(mapa || {})
        .filter(([, item]) => item.unit === unidad)
        // Un ingrediente suelto no es un plato: "arroz" y "frijoles" salen de
        // partir el carbo del casadito, "Arroz, frijoles y maduros". No se
        // fusionan con nada, ni nada se fusiona con ellos. Sin esto, "Arroz al
        // perejil" se metia en el renglon del arroz del casadito y se llevaba
        // su nombre: la hoja pedia 71 tazas de arroz al perejil cuando eran 2.
        .filter(([, item]) => !item.sueltoDeGuarnicion)
        .filter(([, item]) => seParecen(item.name, nombre));

    if (parecidos.length > 1) {
        return { clave: null, ambiguo: parecidos.map(([, item]) => item.name) };
    }
    if (parecidos.length === 0) return { clave: null, ambiguo: [] };

    // Uno solo: se junta salvo que sean variedades distintas del mismo
    // ingrediente, como los frijoles blancos y los del casadito.
    const [clave, item] = parecidos[0];
    return esElMismoPlato(item.name, nombre)
        ? { clave, ambiguo: [] }
        : { clave: null, ambiguo: [] };
};

/**
 * El nombre más completo gana.
 *
 * Si el pack dice "Albóndigas" y el individual "Albóndigas de res artesanales",
 * en la hoja conviene el largo: dice mejor qué hay que cocinar.
 */
export const nombreMasCompleto = (a, b) =>
    (palabrasClave(b).length > palabrasClave(a).length ? b : a);
