/**
 * Platos que Gina dice que son el mismo, aunque se escriban distinto.
 *
 * `mismoPlato.js` junta lo que puede probar: misma unidad, misma palabra
 * principal, y un nombre contenido en el otro. Cuando un nombre calza con VARIOS
 * renglones no junta ninguno, porque elegir mal es peor que dejarlos separados.
 *
 * Ese es justo el caso de las carnes mechadas:
 *
 *   Carne mechada en salsa          ⊂ Carne mechada de res en salsa
 *   Carne mechada en salsa          ⊂ Carne mechada en salsa criolla
 *   Carne mechada de res en salsa   ⊄ Carne mechada en salsa criolla
 *
 * Las tres son la misma olla, pero eso no se deduce de los nombres: lo sabe
 * quien cocina. Acá se guarda lo que esa persona decidió, para no tener que
 * repetirlo cada semana.
 *
 * Se guarda en el navegador de quien arma la hoja. No toca pedidos, ni menús, ni
 * nada de Firestore: es solo una preferencia de cómo mostrar la hoja, así que si
 * se pierde no se pierde información del negocio.
 */

const LLAVE = 'bikitchen.unionesDePlatos';

/** Mismo criterio de igualdad que el acumulador: espacios y mayúsculas dan igual. */
export const claveDeNombre = (nombre) =>
    String(nombre || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Por cada nombre unido, a qué renglón tiene que ir.
 *
 * @param {Array<Array<string>>} uniones - grupos de nombres que son el mismo plato
 * @returns {Map<string, string>} clave del nombre -> nombre del renglón destino
 */
export const destinosDeUnion = (uniones) => {
    const destinos = new Map();
    (uniones || []).forEach(grupo => {
        if (!Array.isArray(grupo) || grupo.length < 2) return;
        // El primero manda: es el que quedó de nombre visible al unir
        const destino = grupo[0];
        grupo.forEach(nombre => destinos.set(claveDeNombre(nombre), destino));
    });
    return destinos;
};

/**
 * Une un grupo nuevo con los que ya existían.
 *
 * Si alguno de los nombres ya estaba en otro grupo, los dos grupos pasan a ser
 * uno solo: si A es lo mismo que B, y B lo mismo que C, entonces los tres van a
 * la misma olla.
 */
export const agregarUnion = (uniones, nombres) => {
    const limpios = [...new Set((nombres || []).map(n => String(n || '').trim()).filter(Boolean))];
    if (limpios.length < 2) return uniones || [];

    const claves = new Set(limpios.map(claveDeNombre));
    const tocados = [];
    const resto = [];

    (uniones || []).forEach(grupo => {
        if (grupo.some(n => claves.has(claveDeNombre(n)))) tocados.push(grupo);
        else resto.push(grupo);
    });

    const fusionado = [];
    const vistos = new Set();
    [...tocados.flat(), ...limpios].forEach(n => {
        const k = claveDeNombre(n);
        if (vistos.has(k)) return;
        vistos.add(k);
        fusionado.push(n);
    });

    return [...resto, fusionado];
};

/** Deshace el grupo que contenga ese nombre. */
export const quitarUnion = (uniones, nombre) => {
    const k = claveDeNombre(nombre);
    return (uniones || []).filter(grupo => !grupo.some(n => claveDeNombre(n) === k));
};

/** Lee lo guardado. Si algo está corrupto, se arranca de cero sin romper la hoja. */
export const leerUniones = () => {
    try {
        const crudo = window.localStorage.getItem(LLAVE);
        if (!crudo) return [];
        const datos = JSON.parse(crudo);
        if (!Array.isArray(datos)) return [];
        return datos.filter(g => Array.isArray(g) && g.length >= 2);
    } catch {
        return [];
    }
};

/** Guarda. Si el navegador no deja (modo privado), la hoja sigue funcionando. */
export const guardarUniones = (uniones) => {
    try {
        window.localStorage.setItem(LLAVE, JSON.stringify(uniones || []));
    } catch {
        // Sin guardar: las uniones valen para esta sesión y ya
    }
};
