/**
 * Confirmar el pago de un pedido cuando Firestore no acepta transacciones.
 *
 * Los puntos se otorgan dentro de una transaccion para que dos admins que
 * confirmen el mismo pedido a la vez no se los den dos veces. El problema es
 * que Firestore rechaza las TRANSACCIONES mucho antes que las escrituras
 * normales: la noche del 1 de setiembre de 2026 las lecturas, las escrituras
 * sueltas y los writeBatch pasaban sin problema, y toda transaccion contestaba
 * `resource-exhausted`. El boton "Confirmar Pago" quedo muerto —el pedido de
 * Silvia Vargas no se podia meter a la hoja del miercoles— mientras el resto
 * del panel funcionaba normal.
 *
 * Asi que si la transaccion cae por cuota, se confirma igual: se relee el
 * pedido y solo se escribe si los puntos siguen sin otorgarse. La ventana de
 * carrera es de milisegundos y hace falta que dos personas confirmen el MISMO
 * pedido dentro de ella; quedarse sin poder cobrar es peor.
 *
 * @param {object} ops
 * @param {() => Promise<boolean>} ops.conTransaccion  intento normal; devuelve
 *        si le toco otorgar los puntos.
 * @param {() => Promise<object|null>} ops.releerPedido  datos frescos del pedido.
 * @param {() => Promise<void>} ops.escribirDirecto  confirma sin transaccion.
 * @returns {Promise<boolean>} si hay que otorgar los puntos.
 */
export const confirmarPagoConRespaldo = async ({ conTransaccion, releerPedido, escribirDirecto }) => {
    try {
        return await conTransaccion();
    } catch (error) {
        // Cualquier otro error es un problema de verdad y tiene que verse.
        if (error?.code !== 'resource-exhausted') throw error;

        const actual = await releerPedido();
        if (!actual) return false;
        // Alguien se adelanto: los puntos ya estan dados, no se repiten.
        if (actual.pointsAwarded) return false;

        await escribirDirecto();
        return true;
    }
};
