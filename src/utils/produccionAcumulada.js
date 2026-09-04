/**
 * Lo que YA se cocinó, para no cocinarlo dos veces.
 *
 * Las tandas descuentan por PEDIDO: "estos 54 ya se mandaron, no van otra vez".
 * Eso no alcanza cuando se cocina de más a propósito. Gina lo hace todas las
 * semanas —"dejar carne cocinada para el sábado, unos 5 kg más"— porque las
 * proteínas se congelan y prender la olla tres veces por lo mismo es perder el
 * día. Pero el viernes la hoja se lo vuelve a pedir, porque esos kilos de más
 * no estaban atados a ningún pedido.
 *
 * Así que hace falta un segundo registro, en paralelo al de pedidos: cuánto se
 * cocinó de cada preparación. La cuenta es acumulada de los dos lados:
 *
 *     por cocinar = lo que piden TODOS los pedidos mandados hasta hoy
 *                 − lo que ya se cocinó en las hojas anteriores
 *
 * Acumulado y no "lo de esta tanda" a propósito: el jueves se piden 3,2 kg de
 * carne mechada y se cocinan 5. El viernes entran pedidos que piden 0,8 más, o
 * sea 4 kg en total, y ya hay 5 hechos. La hoja del viernes tiene que decir
 * CERO, no 0,8.
 *
 * LO QUE ESTE REGISTRO NO HACE
 *
 * No cruza semanas. Lo que sobre del sábado y el lunes no se le descuenta a la
 * hornada siguiente: eso ya es llevar inventario de congelador, que es otro
 * problema y necesita saber qué se venció. Cada hornada arranca en cero.
 */

/** Colección de Firestore. Un documento por hornada. */
export const COLECCION_PRODUCCION = 'produccion_cocina';

/** La llave de una preparación. La misma que usan los ajustes de Gina. */
export const claveDeProduccion = (nombre, unidad) =>
    `${String(nombre || '').trim().toLowerCase()}|${String(unidad || '').trim().toLowerCase()}`;

/**
 * Cuánto se cocinó de cada preparación, sumando todas las hojas que ya salieron.
 *
 * @param {Array<{cocinado?: object}>} tandas  lo guardado de cada hoja
 * @returns {object} { clave: cantidad }
 */
export const acumularCocinado = (tandas) => {
    const total = {};
    (tandas || []).forEach(t => {
        Object.entries(t?.cocinado || {}).forEach(([clave, cantidad]) => {
            const n = Number(cantidad);
            if (!Number.isFinite(n) || n <= 0) return;
            total[clave] = (total[clave] || 0) + n;
        });
    });
    return total;
};

/**
 * Cuánto falta cocinar de un renglón.
 *
 * @param {{name:string, unit:string, necesita:number}} renglon
 *        `necesita` es lo que piden TODOS los pedidos mandados hasta ahora,
 *        ya con su merma.
 * @param {object} yaCocinado  lo que devuelve acumularCocinado
 * @returns {number} nunca negativo: si sobra, falta cero
 */
export const porCocinar = (renglon, yaCocinado) => {
    const necesita = Number(renglon?.necesita);
    if (!Number.isFinite(necesita) || necesita <= 0) return 0;
    const hecho = Number((yaCocinado || {})[claveDeProduccion(renglon?.name, renglon?.unit)]) || 0;
    return Math.max(0, necesita - hecho);
};

/**
 * Cuánto sobra de un renglón: lo cocinado de más, que ya está en el congelador.
 *
 * Se muestra aparte de lo que falta porque son dos cosas distintas que hacer:
 * lo que falta se cocina, lo que sobra se saca y se empaca.
 */
export const sobrante = (renglon, yaCocinado) => {
    const necesita = Number(renglon?.necesita) || 0;
    const hecho = Number((yaCocinado || {})[claveDeProduccion(renglon?.name, renglon?.unit)]) || 0;
    return Math.max(0, hecho - necesita);
};

/**
 * Lo que hay que guardar al mandar una hoja: cuánto se va a cocinar de cada cosa.
 *
 * Se guarda lo que dice la hoja AL MANDARLA, con las correcciones de Gina ya
 * puestas — no lo calculado. Si ella cambió 3,2 kg por 5, lo que se va a cocinar
 * son 5 y eso es lo que hay que descontar después.
 *
 * @param {Array<{name, unit, aCocinar:number}>} renglones
 * @returns {object} { clave: cantidad }
 */
export const cocinadoDeLaHoja = (renglones) => {
    const salida = {};
    (renglones || []).forEach(r => {
        const n = Number(r?.aCocinar);
        if (!Number.isFinite(n) || n <= 0) return;
        const clave = claveDeProduccion(r?.name, r?.unit);
        salida[clave] = (salida[clave] || 0) + n;
    });
    return salida;
};

/**
 * El resumen de un renglón para la hoja.
 *
 * @param {{name, unit, estaTanda:number, semanaCompleta:number}} renglon
 * @param {object} yaCocinado
 */
export const resumenDeRenglon = (renglon, yaCocinado) => {
    const hecho = Number((yaCocinado || {})[claveDeProduccion(renglon?.name, renglon?.unit)]) || 0;
    const pide = Number(renglon?.estaTanda) || 0;
    const semana = Number(renglon?.semanaCompleta) || 0;
    return {
        pide,
        semana,
        yaCocinado: hecho,
        // Lo que falta para cubrir lo pedido hasta ahora
        falta: Math.max(0, pide - hecho),
        // Lo cocinado de más, que ya está hecho y hay que empacar
        sobra: Math.max(0, hecho - pide),
        // Si se cocinara toda la semana de una vez, cuánto seria hoy
        siSeAdelantaTodo: Math.max(0, semana - hecho)
    };
};
