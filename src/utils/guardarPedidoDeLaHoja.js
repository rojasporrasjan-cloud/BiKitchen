/**
 * Armar el cambio que se le manda a Firestore al editar un pedido desde la hoja.
 *
 * Se separa de la pantalla porque tiene una trampa: las proteinas elegidas NO
 * viven en la raiz del pedido, viven DENTRO del primer item, en `proteinas`.
 * Escribirlas arriba no rompe nada visible —el PATCH devuelve 200— pero la hoja
 * sigue leyendo las de adentro y todo queda igual, sin ningun error a la vista.
 *
 * Por eso hay que reescribir el arreglo `items` completo: Firestore no sabe
 * actualizar un campo dentro de un elemento de un arreglo.
 */

/** Los renglones escritos a mano, limpios y sin vacios. */
export const proteinasEscritas = (texto) => String(texto ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * El arreglo `items` con las proteinas puestas en el primero.
 *
 * Solo se toca el primer item porque es donde el pedido guarda la eleccion del
 * pack; los demas —cuando los hay— son productos sueltos con su propio nombre.
 */
export const itemsConProteinas = (items, proteinas) => {
    const lista = Array.isArray(items) ? items : [];
    if (lista.length === 0) return lista;
    return lista.map((it, i) => (i === 0 ? { ...it, proteinas: [...(proteinas || [])] } : it));
};

/**
 * El objeto que se le pasa a `updateDoc`.
 *
 * Devuelve `null` cuando no hay nada que cambiar: mandar un PATCH vacio gasta
 * una escritura y ensucia la fecha de modificacion sin motivo.
 *
 * @param {object} pedido    el pedido tal como esta guardado
 * @param {object} edicion   { observaciones, proteinas }
 */
export const cambiosDelPedido = (pedido, edicion = {}) => {
    const cambios = {};

    const notasAntes = String(pedido?.observaciones ?? '');
    const notasAhora = String(edicion.observaciones ?? '');
    if (notasAhora !== notasAntes) cambios.observaciones = notasAhora;

    // `proteinas: null` significa "este pedido no es de proteinas, no las toques"
    if (Array.isArray(edicion.proteinas)) {
        const antes = (pedido?.items?.[0]?.proteinas) || [];
        const ahora = edicion.proteinas;
        const distintas = antes.length !== ahora.length
            || antes.some((x, i) => String(x) !== String(ahora[i]));
        if (distintas) cambios.items = itemsConProteinas(pedido?.items, ahora);
    }

    return Object.keys(cambios).length ? cambios : null;
};

/**
 * Cuantas proteinas pide el nombre del pack, o 0 si no es un pack de proteinas.
 *
 * Sirve para saber si mostrar el campo y contra que comparar. "Pack de 3
 * proteinas de 250 g" pide 3; "Pack Regular" no pide ninguna.
 */
export const cuantasProteinasPide = (nombre) => {
    const m = String(nombre || '').match(/(\d+)\s*prote[ií]nas?/i);
    const n = m ? Number(m[1]) : 0;
    return n > 1 ? n : 0;
};

/** El cambio para sacar un pedido de la hoja sin borrarlo. */
export const cambioParaCancelar = (motivo = 'Cancelado desde la hoja de produccion') => ({
    status: 'cancelled',
    canceladoMotivo: motivo
});
