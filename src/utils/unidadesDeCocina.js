/**
 * Ver cada renglón de la hoja en la unidad que le sirva a quien lo lee.
 *
 * La hoja calcula en gramos o en tazas, según de dónde salga el número. Pero
 * Gina no piensa así: la lasaña la manda en PORCIONES, los maduros en LONJAS y
 * la carne en KILOS. Comparar su lista con la hoja obligaba a hacer la división
 * a mano, y ahí se pierden cosas: la hoja pedía 7670 g de lasaña y ella cocinó
 * 40 porciones — faltaban 9 y nadie lo vio, porque nadie dividió.
 *
 * La unidad es una decisión de quien lee, no del cálculo.
 *
 * LO QUE SE PUEDE CONVERTIR Y LO QUE NO
 *
 * Cada renglón lleva dos datos independientes: cuánto (`totalQty`, en su unidad)
 * y a cuántos platos va (`porciones`). Con eso:
 *
 *   gramos  <-> kilos       siempre, es la misma cosa
 *   gramos  <-> porciones   se sabe, porque el renglón trae los platos
 *   tazas   <-> porciones   igual
 *   unidades <-> porciones  igual
 *
 * Lo que NO se puede: **gramos <-> tazas**. Una taza de arroz y una de carne no
 * pesan lo mismo, y sin saber de qué es, cualquier número sería inventado. La
 * hoja de cocina no es lugar para eso: mejor que la opción no aparezca a que
 * aparezca dando un número falso.
 */

/** Las unidades que la hoja sabe manejar. */
export const UNIDADES = {
    g: { etiqueta: 'gramos', corta: 'g' },
    kg: { etiqueta: 'kilos', corta: 'kg' },
    'taza(s)': { etiqueta: 'tazas', corta: 'taza(s)' },
    unidades: { etiqueta: 'unidades', corta: 'unidad(es)' },
    porciones: { etiqueta: 'porciones', corta: 'porción(es)' }
};

/** Cómo viene escrita la unidad en el renglón, normalizada. */
const normalizar = (u) => {
    const t = String(u || '').toLowerCase().trim();
    if (/^kg|kilo/.test(t)) return 'kg';
    if (/^g$|gramo/.test(t)) return 'g';
    if (/taza/.test(t)) return 'taza(s)';
    if (/porcion|porción/.test(t)) return 'porciones';
    if (/unidad|lonja/.test(t)) return 'unidades';
    return 'g';
};

/**
 * En qué unidades se puede mostrar este renglón, sin inventar nada.
 *
 * @param {{unit:string, porciones?:number}} renglon
 * @returns {string[]}
 */
export const unidadesPosibles = (renglon) => {
    const base = normalizar(renglon?.unit);
    const hayPorciones = Number(renglon?.porciones) > 0;

    if (base === 'g' || base === 'kg') {
        return hayPorciones ? ['g', 'kg', 'porciones'] : ['g', 'kg'];
    }
    if (base === 'taza(s)') {
        return hayPorciones ? ['taza(s)', 'porciones'] : ['taza(s)'];
    }
    // unidades y porciones son la misma cosa contada: una unidad va a un plato
    if (base === 'unidades' || base === 'porciones') {
        return hayPorciones ? ['unidades', 'porciones'] : ['unidades'];
    }
    return [base];
};

/**
 * El número de este renglón, visto en otra unidad.
 *
 * Devuelve `null` cuando la conversión no se puede hacer con lo que hay: es a
 * propósito, para que quien llame muestre el número original en vez de uno
 * inventado.
 *
 * @param {{unit:string, totalQty:number, porciones?:number}} renglon
 * @param {string} destino
 * @returns {number|null}
 */
export const convertir = (renglon, destino) => {
    const cantidad = Number(renglon?.totalQty);
    if (!Number.isFinite(cantidad)) return null;

    const base = normalizar(renglon?.unit);
    const a = normalizar(destino);
    if (base === a) return cantidad;

    const porciones = Number(renglon?.porciones) || 0;

    // gramos y kilos son la misma cosa
    if (base === 'g' && a === 'kg') return cantidad / 1000;
    if (base === 'kg' && a === 'g') return cantidad * 1000;

    // hacia porciones: el renglón ya sabe a cuántos platos va
    if (a === 'porciones') return porciones > 0 ? porciones : null;

    // desde porciones hacia la unidad del renglón
    if (base === 'porciones') {
        if (a === 'unidades') return cantidad;
        return null;
    }

    // unidades y porciones se cuentan igual
    if (base === 'unidades' && a === 'porciones') return porciones > 0 ? porciones : null;
    if (base === 'porciones' && a === 'unidades') return cantidad;

    // gramos <-> tazas no tiene conversión honesta
    return null;
};

/**
 * El camino de vuelta: un número escrito en otra unidad, traído a la del renglón.
 *
 * Hace falta porque la corrección de Gina se guarda SIEMPRE en la unidad base
 * del renglón. Si ella está viendo porciones y escribe 60, lo que se guarda son
 * los gramos que equivalen a esas 60 porciones. Asi el resto de la hoja —el
 * granel, el Excel, la tanda— sigue leyendo una sola unidad y no hay que
 * acordarse de en cuál estaba mirando cada quien.
 *
 * @returns {number|null} null si la conversión no se puede hacer
 */
export const desdeUnidad = (renglon, valor, unidad) => {
    if (!renglon) return null;
    // El vacío no es cero: significa "no lo he escrito", y ahí manda el cálculo.
    if (valor === '' || valor === null || valor === undefined) return null;
    const v = Number(valor);
    if (!Number.isFinite(v)) return null;

    const base = normalizar(renglon?.unit);
    const de = normalizar(unidad);
    if (base === de) return v;

    if (de === 'kg' && base === 'g') return v * 1000;
    if (de === 'g' && base === 'kg') return v / 1000;

    if (de === 'porciones') {
        const porciones = Number(renglon?.porciones) || 0;
        const cantidad = Number(renglon?.totalQty) || 0;
        if (porciones <= 0) return null;
        if (base === 'unidades') {
            // Los maduros van de a dos por plato: la proporción la da el renglón.
            return v * (cantidad / porciones);
        }
        // Cuanto pesa —o cuantas tazas son— cada plato, segun lo ya acumulado.
        return v * (cantidad / porciones);
    }

    if (base === 'porciones' && de === 'unidades') return v;
    return null;
};

/** El número ya redondeado como se escribe en la hoja. */
export const textoEnUnidad = (renglon, destino) => {
    const v = convertir(renglon, destino);
    if (v === null) return null;
    const u = normalizar(destino);
    // Los kilos llevan un decimal; lo demás va entero, que es como se cocina.
    const n = u === 'kg' ? Math.round(v * 10) / 10 : Math.ceil(v - 0.0001);
    return `${n} ${UNIDADES[u]?.corta || u}`;
};
