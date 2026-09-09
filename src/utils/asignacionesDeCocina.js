/**
 * Que cocinera hace cada platillo, guardado por fecha.
 *
 * El reparto de estaciones vivia solo en memoria: se repartia, se cerraba la
 * pagina y se perdia todo. Volver el sabado a la hoja del lunes significaba
 * repartir de cero cuarenta platillos, o imprimir con "SIN ASIGNAR" en media
 * hoja.
 *
 * Se guarda POR FECHA de produccion porque el reparto del miercoles no sirve
 * para el sabado: son platos distintos y a veces cocineras distintas.
 *
 * Vive en localStorage por la misma razon que `etiquetasImpresas`:
 * `firestore.rules` cierra con `allow read, write: if false`, asi que una
 * coleccion nueva se rechazaria en silencio. Si algun dia hace falta compartirlo
 * entre computadoras se cambia solo este archivo.
 */

const LLAVE = 'bikitchen_asignaciones_cocina';

const leerTodo = () => {
    try {
        const crudo = JSON.parse(localStorage.getItem(LLAVE) || '{}');
        return (crudo && typeof crudo === 'object' && !Array.isArray(crudo)) ? crudo : {};
    } catch {
        return {};   // modo privado, o datos corruptos
    }
};

const guardar = (datos) => {
    try { localStorage.setItem(LLAVE, JSON.stringify(datos)); } catch { /* sin storage */ }
};

/** El reparto guardado de esa fecha: `{ platillo: COCINERA }`. */
export const leerAsignaciones = (fecha) => {
    if (!fecha) return {};
    const suyas = leerTodo()[fecha];
    return (suyas && typeof suyas === 'object') ? suyas : {};
};

/**
 * Guarda el reparto de una fecha.
 *
 * Los platillos SIN cocinera no se guardan: dejarlos en blanco ocupa lugar y no
 * dice nada que no diga su ausencia.
 */
export const guardarAsignaciones = (fecha, asignaciones) => {
    if (!fecha) return {};
    const limpias = {};
    Object.entries(asignaciones || {}).forEach(([plato, quien]) => {
        const nombre = String(quien || '').trim().toUpperCase();
        if (plato && nombre) limpias[plato] = nombre;
    });

    const todo = leerTodo();
    if (Object.keys(limpias).length === 0) delete todo[fecha];
    else todo[fecha] = limpias;
    guardar(todo);
    return limpias;
};

/**
 * Lo guardado, pero solo de los platillos que HOY existen.
 *
 * Un platillo que ya no esta en la hoja —porque el cliente cancelo o cambio el
 * menu— no tiene que arrastrar su cocinera: reaparecia como asignado si el plato
 * volvia semanas despues, con una cocinera que quiza ya ni hace eso.
 */
export const asignacionesVigentes = (fecha, platillos = []) => {
    const guardadas = leerAsignaciones(fecha);
    const existen = new Set((platillos || []).map(p => String(p?.name ?? p ?? '')));
    const vigentes = {};
    Object.entries(guardadas).forEach(([plato, quien]) => {
        if (existen.has(plato)) vigentes[plato] = quien;
    });
    return vigentes;
};

/** Cuantos platillos tienen cocinera y cuantos no. */
export const cuantasFaltan = (platillos = [], asignaciones = {}) => {
    const total = (platillos || []).length;
    const puestas = (platillos || [])
        .filter(p => String(asignaciones[String(p?.name ?? p ?? '')] || '').trim()).length;
    return { total, puestas, faltan: Math.max(0, total - puestas) };
};

/** Borra el reparto de una fecha. Para empezar de cero. */
export const olvidarAsignaciones = (fecha) => {
    if (!fecha) return;
    const todo = leerTodo();
    delete todo[fecha];
    guardar(todo);
};
