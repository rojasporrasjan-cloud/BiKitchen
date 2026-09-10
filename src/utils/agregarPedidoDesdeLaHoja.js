/**
 * Meter un pedido que falta, desde la hoja de produccion.
 *
 * Carlos H. Herrera no salio en la hoja del lunes 7 porque se cargo a las 3:51
 * de la manana del 8, con la entrega ya pasada. Gina lo pidio la noche anterior
 * y no habia forma de meterlo sin salir de la hoja, abrir Pedidos y llenar el
 * formulario largo.
 *
 * Esto arma el pedido minimo: cliente, zona, cuantos packs y la fecha de la
 * hoja. Lo demas se completa despues; lo urgente es que entre a cocinarse.
 */

/** Solo hace falta el nombre. El resto se puede completar despues. */
export const revisarPedidoNuevo = ({ cliente, cantidad } = {}) => {
    const nombre = String(cliente || '').trim();
    if (!nombre) return { sePuede: false, problema: 'Escribí el nombre del cliente.' };

    const n = Number(cantidad);
    if (!Number.isFinite(n) || n < 1) {
        return { sePuede: false, problema: 'La cantidad de packs tiene que ser 1 o más.' };
    }
    return { sePuede: true, problema: null };
};

/**
 * Un id legible, para reconocerlo en Firestore sin abrir el documento.
 *
 * Se arma con la fecha y el nombre porque los ids automaticos no dicen nada, y
 * cuando algo sale mal hay que poder encontrarlo rapido.
 */
export const idParaPedidoNuevo = (fecha, cliente) => {
    const dia = String(fecha || '').replace(/-/g, '');
    const nombre = String(cliente || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase().replace(/[^A-Z0-9]/g, '')
        .slice(0, 14) || 'SINNOMBRE';
    return `ORD-${dia}-${nombre}`;
};

/**
 * El documento del pedido nuevo.
 *
 * `noFusionar` va en true a proposito: la hoja une pedidos que se parecen del
 * mismo cliente y se queda con uno solo. Un pedido metido a mano porque FALTABA
 * es exactamente el que no hay que fusionar — desapareceria otra vez, y esta vez
 * sin que nadie lo note.
 */
export const pedidoNuevo = ({ cliente, plan, zona, telefono, cantidad, fecha, nota, quien }) => ({
    numeroOrden: `#${idParaPedidoNuevo(fecha, cliente)}`,
    cliente: String(cliente || '').trim(),
    plan: String(plan || '').trim(),
    telefono: String(telefono || '').replace(/\D/g, '').replace(/^506/, ''),
    zona_envio: String(zona || '').trim(),
    direccion: String(zona || '').trim(),
    fecha_entrega: fecha,
    fechas_entrega: [fecha],
    status: 'confirmed',
    items: [{
        nombre: String(plan || '').trim(),
        cantidad: Number(cantidad) || 1,
        proteinas: []
    }],
    cantidad: Number(cantidad) || 1,
    observaciones: String(nota || '').trim(),
    noFusionar: true,
    source: 'hoja-produccion',
    fuente: 'Agregado a mano desde la hoja',
    createdBy: quien || 'hoja-produccion',
    createdAt: new Date().toISOString()
});
