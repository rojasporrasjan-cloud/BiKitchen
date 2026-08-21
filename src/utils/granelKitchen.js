/**
 * Acumula las cantidades a cocinar a granel para la hoja de cocina.
 *
 * Existe por un error real encontrado en la hoja del 19 de agosto de 2026:
 *
 *   Picadillo de vainica y zanahoria ....... 207 TAZA(S)
 *
 * cuando los demás vegetales iban en 12. El mismo plato es VEGETAL en un menú
 * (12 tazas) y PROTEÍNA en otro (195 g), y como el acumulador se indexaba solo
 * por el nombre, los gramos caían en la casilla de las tazas: 12 + 195 = 207.
 *
 * La cocina habría leído "207 tazas de picadillo".
 *
 * Se arregla indexando por nombre + unidad, para que gramos y tazas nunca
 * terminen en el mismo número. Un plato que sea las dos cosas sale en dos
 * líneas, cada una con su unidad, que es lo correcto: son dos preparaciones
 * distintas.
 */

/**
 * Normaliza el nombre para que no se dupliquen líneas por espacios de más.
 *
 * "Yuca al ajillo" y "Yuca al ajillo " salían como dos renglones distintos en
 * la hoja, y en cocina no hay forma de saber si son lo mismo o no.
 */
export const normalizarNombrePlato = (nombre) =>
    String(nombre || '').replace(/\s+/g, ' ').trim();

/** Clave del acumulador: el nombre NO alcanza, hace falta también la unidad. */
export const claveGranel = (nombre, unidad) =>
    `${normalizarNombrePlato(nombre).toLowerCase()}|${unidad}`;

/**
 * Suma una cantidad al acumulador.
 *
 * @param {object} mapa - acumulador (se modifica)
 * @param {string} nombre - nombre del plato
 * @param {number} cantidad - cuánto sumar
 * @param {string} unidad - 'g' o 'taza(s)'
 * @param {(n: string) => string} [categoria] - para agrupar por estación
 */
export const sumarAGranel = (mapa, nombre, cantidad, unidad, categoria) => {
    const limpio = normalizarNombrePlato(nombre);
    if (!limpio || limpio === '—') return mapa;

    const clave = claveGranel(limpio, unidad);
    if (!mapa[clave]) {
        mapa[clave] = {
            name: limpio,
            category: categoria ? categoria(limpio) : 'Otros',
            totalQty: 0,
            unit: unidad,
            isBulk: true
        };
    }
    mapa[clave].totalQty += Number(cantidad) || 0;
    return mapa;
};

/**
 * Limpia el nombre del platillo individual para exhibición.
 * Ej: "4 tazas Gallo pinto (en dos tazas frijoles mas suaves)" -> "Gallo pinto"
 */
export const cleanIndividualDishName = (rawName) => {
    let name = String(rawName || '');
    // Strip leading "Plato 1 | ", "Plato 2 ", etc.
    name = name.replace(/^plato\s*\d+\s*\|\s*/i, '');
    name = name.replace(/^plato\s*\d+\s*/i, '');
    // Remover cantidades al inicio como "4 tazas ", "tazas ", "1 de 250 ", "2 de 500 "
    name = name.replace(/^(?:\d+\s*)?tazas?\s*/i, '');
    name = name.replace(/^\d+\s*de\s*\d+\s*/i, '');
    // Remover notas entre paréntesis como "(en dos tazas...)", "(Individuales)"
    name = name.replace(/\s*\([^)]*\)/g, '');
    // Remover etiquetas de cierre
    name = name.replace(/\s+-\s+(?:Individuales|Semanal).*$/i, '');
    name = name.replace(/\s+\d+\s*unidades\b/i, '');
    name = name.replace(/^[-—*]+\s*/, '').trim();
    if (name.length > 0) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    return name || rawName;
};

/**
 * Determina si un plato es un molde/especial que se empaca entero en cocina (Sección 2).
 * ATENCIÓN: "torta" solo aplica si es repostería/molde ("torta chilena", "torta tres leches").
 * NO aplica si es un platillo caliente como "torta de carne" o "torta de espinaca".
 */
export const isMoldOrSpecialDish = (nameLower) => {
    if (/molde|canelones|burrito|omelet|pancake|enyucado/i.test(nameLower)) return true;
    if (nameLower.includes('torta') && !nameLower.includes('carne') && !nameLower.includes('espinaca') && !nameLower.includes('huevo') && !nameLower.includes('pollo')) {
        return true;
    }
    return false;
};

/**
 * Determina si un plato es candidato para cocinarse a granel en olla (Sección 1).
 * Excluye ensaladas frías como coleslaw o ensalada verde.
 */
export const isBulkDishCandidate = (nameLower, existsInBulkMap = false) => {
    if (isMoldOrSpecialDish(nameLower)) return false;

    // Excluir ensaladas frías que no van a la olla caliente
    if (/coleslaw|ensalada verde|ensalada mixta|ensalada de lechuga/i.test(nameLower)) return false;

    if (existsInBulkMap) return true;

    return /pollo|lomo|cerdo|carne|pibil|pork|bistec|fajitas|pescado|tilapia|salmón|salmon|atun|corvina|prote[íi]na|arroz|picadillo|vegetal|papa|yuca|camote|frijol|maduro|pinto|spaguetti|pasta/i.test(nameLower);
};

/**
 * Cuánto hay que preparar de un platillo individual, y en qué unidad.
 *
 * QUIÉN LE GANA A QUIÉN, y por qué:
 *
 *   1º  Lo que dice el NOMBRE DEL PLATO. Es lo más específico que hay: si el
 *       pedido dice "2 de 250 Fajitas de lomo", son dos porciones de 250 g.
 *   2º  `explicitGrams`, el gramaje del catálogo. Es el valor por defecto del
 *       plato cuando su nombre no dice nada.
 *   3º  `specStr`, que es el texto del PLAN del cliente. Va de último a
 *       propósito.
 *
 * El orden importa y las dos veces que se equivocó costó comida:
 *
 *   · Cuando el plan ganaba, un cliente con plan "Pack 5 Proteínas (250g)" y un
 *     plato de 500 g recibía 250 g: la olla quedaba a la mitad de la nota de
 *     empaque.
 *   · Cuando el catálogo ganaba sobre TODO, el pedido de Zujeily González
 *     ("2 de 250 Fajitas de lomo en salsa gravy", catálogo 250 g) se cocinaba
 *     como 250 g en vez de 500 g. Le faltaban 500 g entre dos platos.
 *
 * Poniendo el nombre primero y el plan de último, los dos quedan bien.
 */

/** Busca una cantidad escrita en un texto. Devuelve null si no dice nada. */
const leerCantidadEscrita = (texto, itemQty) => {
    const t = String(texto || '');
    if (!t.trim()) return null;

    // "4 tazas Gallo pinto" / "Gallo pinto (4 tazas)"
    const tazas = t.match(/(\d+)\s*tazas?\b/i);
    if (tazas) {
        const total = parseInt(tazas[1], 10) * itemQty;
        return { totalQty: total, unit: 'taza(s)', portionGrams: null, numPorciones: total };
    }

    // "2 de 250" = dos porciones de 250 g
    const xDeY = t.match(/(\d+)\s*de\s*(\d+)/i);
    if (xDeY) {
        const porciones = parseInt(xDeY[1], 10) * itemQty;
        const gramos = parseInt(xDeY[2], 10);
        return { totalQty: porciones * gramos, unit: 'g', portionGrams: gramos, numPorciones: porciones };
    }

    // "500g", "250 g"
    const g = t.match(/(\d+)\s*g\b/i);
    if (g) {
        const gramos = parseInt(g[1], 10);
        return { totalQty: gramos * itemQty, unit: 'g', portionGrams: gramos, numPorciones: itemQty };
    }

    // "1 kg"
    const kg = t.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
    if (kg) {
        return { totalQty: parseFloat(kg[1]) * itemQty, unit: 'kg', portionGrams: null, numPorciones: itemQty };
    }

    // "6 unidades"
    const un = t.match(/(\d+)\s*unidades\b/i);
    if (un) {
        return { totalQty: parseInt(un[1], 10) * itemQty, unit: 'unidades', portionGrams: null, numPorciones: itemQty };
    }

    return null;
};

export const parseQuantityAndUnit = (rawName, specStr = '', itemCount = 1, explicitGrams = null) => {
    const rawStr = String(rawName || '');
    const spec = String(specStr || '');
    const itemQty = Number(itemCount) || 1;

    // 1º El nombre del plato: lo más específico que existe.
    const delNombre = leerCantidadEscrita(rawStr, itemQty);
    if (delNombre) return delNombre;

    // 2º El gramaje del catálogo, cuando el nombre no dice nada.
    if (explicitGrams && typeof explicitGrams === 'number' && explicitGrams > 0) {
        return { totalQty: explicitGrams * itemQty, unit: 'g', portionGrams: explicitGrams, numPorciones: itemQty };
    }

    // 3º El plan del cliente. De último: habla del pack entero, no de este plato.
    const delPlan = leerCantidadEscrita(spec, itemQty);
    if (delPlan) return delPlan;

    // Sin nada escrito: se asume por el tipo de plato.
    const combined = `${rawStr} ${spec}`.toLowerCase();

    const isProtein = /pollo|lomo|cerdo|carne|pibil|pork|bistec|fajitas|pescado|tilapia|salmón|salmon|atun|corvina|prote[íi]na/i.test(combined);
    if (isProtein) {
        return { totalQty: 250 * itemQty, unit: 'g', portionGrams: 250, numPorciones: itemQty };
    }

    const isSideDish = /pinto|arroz|frijol|picadillo|papa|yuca|camote|maduro|vegetal|puré/i.test(combined);
    if (isSideDish) {
        return { totalQty: 1 * itemQty, unit: 'taza(s)', portionGrams: null, numPorciones: itemQty };
    }

    return { totalQty: itemQty, unit: 'unidades', portionGrams: null, numPorciones: itemQty };
};
