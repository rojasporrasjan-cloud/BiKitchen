/**
 * Qué grupos de etiquetas entran en el lote.
 *
 * La selección se guarda como el conjunto de lo EXCLUIDO, no de lo incluido:
 * así, cuando cambia la fecha y aparecen grupos nuevos, entran seleccionados
 * por defecto en vez de quedar fuera sin que nadie lo note.
 *
 * Vive aparte de la pantalla para poder probarlo: un botón de "incluir todas"
 * que no incluye todas se descubre en un test, no imprimiendo 150 etiquetas.
 */

/** ¿Este grupo entra en el lote? */
export const estaIncluido = (excluidos, id) => !excluidos.has(id);

/** Cuántos de estos ids están incluidos. */
export const contarIncluidos = (excluidos, ids) =>
    ids.reduce((acc, id) => acc + (estaIncluido(excluidos, id) ? 1 : 0), 0);

/**
 * Estado de una sección completa.
 * 'todos' | 'ninguno' | 'algunos'  (vacía cuenta como 'ninguno')
 */
export const estadoSeccion = (excluidos, ids) => {
    if (ids.length === 0) return 'ninguno';
    const incluidos = contarIncluidos(excluidos, ids);
    if (incluidos === 0) return 'ninguno';
    if (incluidos === ids.length) return 'todos';
    return 'algunos';
};

/** Invierte un grupo. */
export const alternarGrupo = (excluidos, id) => {
    const next = new Set(excluidos);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
};

/** Incluye o excluye una lista completa de golpe. */
export const fijarGrupos = (excluidos, ids, incluir) => {
    const next = new Set(excluidos);
    ids.forEach(id => incluir ? next.delete(id) : next.add(id));
    return next;
};

/**
 * Lo que hace el botón de la sección.
 *
 * Con la sección a medias incluye todo, que es lo que espera quien lo toca:
 * si ya hay algunas marcadas y querés el resto, no tiene sentido que el botón
 * las borre primero.
 */
export const alternarSeccion = (excluidos, ids) => {
    const estado = estadoSeccion(excluidos, ids);
    return fijarGrupos(excluidos, ids, estado !== 'todos');
};
