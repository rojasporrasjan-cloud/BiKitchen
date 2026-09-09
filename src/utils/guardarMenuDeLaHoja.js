/**
 * Editar el menu de la semana desde la hoja de produccion.
 *
 * Un menu equivocado cuesta igual que un pedido equivocado —el 8 de setiembre
 * el Sin Carbos salio con las proteinas del pack vegetariano y las cenas con el
 * menu de la semana anterior— pero corregirlo obligaba a salir de la hoja, ir a
 * Menus y buscar cual de los catorce era.
 *
 * DIFERENCIA IMPORTANTE CON EDITAR UN PEDIDO: esto cambia lo que come TODA la
 * gente que lleva ese pack, no una persona. Por eso la pantalla lo dice y pide
 * confirmacion; aca abajo solo se arma el cambio.
 */

/** Los almuerzos viven arriba (`sinCarbos`); las cenas, anidadas (`cena.regular`). */
export const rutaDelMenu = (familia, esCena = false) => {
    const clave = String(familia || '').trim();
    if (!clave) return null;
    return esCena ? `cena.${clave}` : clave;
};

/** Un plato limpio y con su numero, listo para guardar. */
export const platoLimpio = (plato, i) => ({
    numero: Number(plato?.numero) || i + 1,
    proteina: String(plato?.proteina ?? '').trim(),
    vegetal: String(plato?.vegetal ?? '').trim(),
    carbo: String(plato?.carbo ?? '').trim()
});

/**
 * Si el menu editado se puede guardar.
 *
 * Un plato sin proteina no es un plato: si se guarda, la hoja imprime un
 * renglon vacio y la cocina no sabe que hacer. Se avisa CUAL falta, que es lo
 * que permite arreglarlo sin adivinar.
 */
export const revisarMenuEditado = (platos = []) => {
    const faltan = (platos || [])
        .map((p, i) => (String(p?.proteina ?? '').trim() ? null : i + 1))
        .filter(Boolean);

    if (faltan.length === 0) return { sePuede: true, problema: null };
    return {
        sePuede: false,
        problema: faltan.length === 1
            ? `Al plato ${faltan[0]} le falta la proteína.`
            : `A los platos ${faltan.join(', ')} les falta la proteína.`
    };
};

/**
 * El cambio para `updateDoc`, o null si no hay nada distinto.
 *
 * Firestore entiende la ruta con punto —`cena.regular`— y reemplaza solo esa
 * parte, sin tocar el resto del documento de menus.
 */
export const cambiosDelMenu = ({ familia, esCena = false, platos, menus }) => {
    const ruta = rutaDelMenu(familia, esCena);
    if (!ruta) return null;

    const nuevos = (platos || []).map(platoLimpio);
    const antes = (esCena ? menus?.cena?.[familia] : menus?.[familia]) || [];

    const iguales = antes.length === nuevos.length && nuevos.every((p, i) => {
        const a = antes[i] || {};
        const nombre = (x) => String(x?.nombre ?? x ?? '').trim();
        return nombre(a.proteina) === p.proteina
            && nombre(a.vegetal) === p.vegetal
            && nombre(a.carbo) === p.carbo;
    });
    if (iguales) return null;

    return {
        [ruta]: nuevos,
        // Sin esto el resto de la app sigue sirviendo el menu viejo de su cache
        'meta.lastModifiedTimestamp': Date.now(),
        'meta.invalidateCache': true
    };
};

/** Los platos de una familia, en la forma que usa el editor. */
export const platosParaEditar = (menus, familia, esCena = false) => {
    const crudos = (esCena ? menus?.cena?.[familia] : menus?.[familia]) || [];
    return crudos.map((p, i) => ({
        numero: Number(p?.numero) || i + 1,
        proteina: String(p?.proteina?.nombre ?? p?.proteina ?? ''),
        vegetal: String(p?.vegetal?.nombre ?? p?.vegetal ?? ''),
        carbo: String(p?.carbo?.nombre ?? p?.carbo ?? '')
    }));
};
