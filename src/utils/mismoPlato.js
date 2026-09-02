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
export const esElMismoPlato = (nombreA, nombreB) => {
    const a = palabrasClave(nombreA);
    const b = palabrasClave(nombreB);
    if (a.length === 0 || b.length === 0) return false;

    // La palabra principal manda: "Sopa de albóndigas" no es "Albóndigas"
    if (a[0] !== b[0]) return false;

    const setA = new Set(a);
    const setB = new Set(b);
    const contenido = (chico, grande) => [...chico].every(p => grande.has(p));

    return contenido(setA, setB) || contenido(setB, setA);
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
    const candidatos = Object.entries(mapa || {})
        .filter(([, item]) => item.unit === unidad)
        .filter(([, item]) => esElMismoPlato(item.name, nombre));

    if (candidatos.length === 1) return { clave: candidatos[0][0], ambiguo: [] };
    if (candidatos.length > 1) {
        return { clave: null, ambiguo: candidatos.map(([, item]) => item.name) };
    }
    return { clave: null, ambiguo: [] };
};

/**
 * El nombre más completo gana.
 *
 * Si el pack dice "Albóndigas" y el individual "Albóndigas de res artesanales",
 * en la hoja conviene el largo: dice mejor qué hay que cocinar.
 */
export const nombreMasCompleto = (a, b) =>
    (palabrasClave(b).length > palabrasClave(a).length ? b : a);
