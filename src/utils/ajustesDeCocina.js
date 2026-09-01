/**
 * Los cambios que Gina hace a mano sobre la hoja de cocina.
 *
 * La hoja calcula cuanto cocinar, pero el calculo se equivoca: los gramajes
 * estaban en dos lugares distintos, las guarniciones venian pegadas, el
 * familiar tenia la porcion de un individual. Cada una de esas la descubrio
 * ella cocinando.
 *
 * Con esto puede corregir el numero, la unidad o la nota de empaque ahi mismo,
 * y el cambio queda guardado para esa fecha. NO se pierde al recargar ni al
 * volver a calcular la hoja.
 *
 * Un ajuste guardado es tambien un aviso para nosotros: si Gina corrige el
 * mismo plato todas las semanas, el que esta mal es el calculo, no el plato.
 * Por eso se guarda quien y cuando, y la hoja los marca a la vista.
 */

/** Colección de Firestore. Un documento por fecha de produccion. */
export const COLECCION_AJUSTES = 'ajustes_cocina';

/**
 * La llave de un renglon dentro de la hoja.
 *
 * El nombre del plato no alcanza: el mismo nombre puede ir en gramos para los
 * packs y en tazas para los individuales, y son dos renglones distintos.
 */
export const claveDeRenglon = (nombre, unidad) =>
    `${String(nombre || '').trim().toLowerCase()}|${String(unidad || '').trim().toLowerCase()}`;

/** Un ajuste vacio es no haber tocado nada: no se guarda. */
const tieneAlgo = (a) =>
    !!a && (Number.isFinite(a.cantidad) || (a.unidad && a.unidad.trim()) || (a.nota && a.nota.trim()));

/**
 * Aplica los ajustes guardados a los renglones ya calculados.
 *
 * Lo que Gina escribio MANDA sobre el calculo. Cada renglon tocado queda con
 * `ajustado: true` para que la hoja lo pueda marcar.
 *
 * @param {Array}  renglones  lo que calculo la hoja
 * @param {object} ajustes    { [clave]: { cantidad?, unidad?, nota? } }
 */
export const aplicarAjustes = (renglones, ajustes) => {
    const guardados = ajustes || {};
    return (renglones || []).map(item => {
        const ajuste = guardados[claveDeRenglon(item?.name, item?.unit)];
        if (!tieneAlgo(ajuste)) return item;

        const tocado = { ...item, ajustado: true };
        if (Number.isFinite(ajuste.cantidad)) {
            tocado.cantidadAjustada = ajuste.cantidad;
        }
        if (ajuste.unidad && ajuste.unidad.trim()) {
            tocado.unit = ajuste.unidad.trim();
        }
        if (ajuste.nota && ajuste.nota.trim()) {
            tocado.notaAjustada = ajuste.nota.trim();
        }
        return tocado;
    });
};

/**
 * La cantidad que hay que imprimir: la de Gina si la hay, si no la calculada.
 *
 * Ojo con el cero: "0" es una correccion legitima —no cocinar nada de eso— y
 * `||` lo tomaria por vacio y volveria al calculo.
 */
export const cantidadFinal = (item, calculada) =>
    Number.isFinite(item?.cantidadAjustada) ? item.cantidadAjustada : calculada;

/** Guarda un ajuste sobre los que ya habia, o lo borra si quedo vacio. */
export const conAjuste = (ajustes, nombre, unidad, cambio) => {
    const copia = { ...(ajustes || {}) };
    const clave = claveDeRenglon(nombre, unidad);
    const combinado = { ...(copia[clave] || {}), ...(cambio || {}) };

    // Un campo que se deja en blanco vuelve al calculo, no se queda vacio.
    if (combinado.cantidad === null || combinado.cantidad === '') delete combinado.cantidad;
    if (!combinado.unidad) delete combinado.unidad;
    if (!combinado.nota) delete combinado.nota;

    if (!tieneAlgo(combinado)) delete copia[clave];
    else copia[clave] = combinado;

    return copia;
};
