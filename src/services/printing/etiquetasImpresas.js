/**
 * Qué etiquetas ya salieron de la impresora, para no repetirlas.
 *
 * Las del lunes se adelantan el sábado. Si el lunes entra un pedido nuevo hay
 * que imprimir SOLO lo nuevo: volver a mandar el lote entero son cien etiquetas
 * de más y, peor, deja dos juegos iguales sobre la mesa sin forma de saber cuál
 * es cuál.
 *
 * Se cuenta por GRUPO —el mismo `${tipo}||${plato}` que arma `buildLabelBatch`—
 * y por fecha de producción, porque el lunes y el sábado son tiras distintas.
 *
 * Vive en localStorage por la misma razón que `printJobLog`: `firestore.rules`
 * cierra con `allow read, write: if false`, así que una colección nueva se
 * rechazaría en silencio. Si algún día hace falta compartirlo entre
 * computadoras se cambia solo este archivo.
 *
 * NO es fuente de verdad de los pedidos. Lo que hay que imprimir se calcula
 * siempre desde `pedidos`; esto solo dice cuánto de eso ya se hizo.
 */

const STORAGE_KEY = 'bikitchen_etiquetas_impresas';

const leerTodo = () => {
    try {
        const crudo = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return (crudo && typeof crudo === 'object' && !Array.isArray(crudo)) ? crudo : {};
    } catch {
        return {};   // modo privado, o datos corruptos
    }
};

const guardar = (datos) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(datos)); } catch { /* sin storage */ }
};

/** Lo ya impreso de esa fecha: `{ grupoId: cantidad }`. */
export const leerImpresas = (fecha) => {
    if (!fecha) return {};
    const cuentas = leerTodo()[fecha];
    return (cuentas && typeof cuentas === 'object') ? cuentas : {};
};

/**
 * Cuántas etiquetas de cada grupo salieron DE VERDAD.
 *
 * Se cuentan las primeras `procesadas` de la tira, no las que se mandaron: si
 * la impresora se traba a la mitad, lo que no salió no puede darse por hecho.
 * Los divisores no son etiquetas de comida y no cuentan.
 *
 * @param {Array<{groupId:string, divider?:boolean}>} labels  la tira que se mandó
 * @param {number} procesadas  cuántas confirmó la cola
 * @returns {object} { grupoId: cantidad }
 */
export const contarPorGrupo = (labels, procesadas) => {
    const lista = Array.isArray(labels) ? labels : [];
    const hasta = Number.isFinite(Number(procesadas))
        ? Math.max(0, Math.min(Number(procesadas), lista.length))
        : lista.length;

    const cuentas = {};
    for (let i = 0; i < hasta; i++) {
        const l = lista[i];
        if (!l || l.divider || !l.groupId) continue;
        cuentas[l.groupId] = (cuentas[l.groupId] || 0) + 1;
    }
    return cuentas;
};

/** Suma lo recién impreso a lo que ya había de esa fecha. */
export const anotarImpresas = (fecha, cuentas) => {
    if (!fecha || !cuentas || typeof cuentas !== 'object') return leerImpresas(fecha);

    const todo = leerTodo();
    const previas = (todo[fecha] && typeof todo[fecha] === 'object') ? todo[fecha] : {};
    const siguiente = { ...previas };

    Object.entries(cuentas).forEach(([id, n]) => {
        const cantidad = Number(n);
        if (!Number.isFinite(cantidad) || cantidad <= 0) return;
        siguiente[id] = (Number(siguiente[id]) || 0) + cantidad;
    });

    todo[fecha] = siguiente;
    guardar(todo);
    return siguiente;
};

/** Cuántas faltan de este grupo. Nunca negativo. */
export const faltanDelGrupo = (grupo, impresas) => {
    const pide = Number(grupo?.cantidad) || 0;
    const hecho = Number((impresas || {})[grupo?.id]) || 0;
    return Math.max(0, pide - hecho);
};

/**
 * Los grupos recortados a lo que falta.
 *
 * Los que ya están completos se caen de la lista: dejarlos en cero obliga a
 * revisar renglón por renglón cuáles todavía tienen algo.
 */
export const gruposQueFaltan = (grupos, impresas) => (grupos || [])
    .map(g => ({ ...g, cantidad: faltanDelGrupo(g, impresas), yaImpresas: Number((impresas || {})[g.id]) || 0 }))
    .filter(g => g.cantidad > 0);

/** Cuántas etiquetas se llevan impresas de esa fecha. */
export const totalImpresas = (impresas) => Object.values(impresas || {})
    .reduce((n, x) => n + (Number(x) || 0), 0);

/** Borra la cuenta de una fecha. Para cuando hay que reimprimir todo. */
export const olvidarFecha = (fecha) => {
    if (!fecha) return;
    const todo = leerTodo();
    delete todo[fecha];
    guardar(todo);
};
