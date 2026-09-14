/**
 * Los cambios de plato escritos a mano, para que lleguen a la cocina.
 *
 * `listarSustituciones` lee solo lo que guarda el checkout en
 * `items[].customizations`. Pero Gina y Jan escriben los cambios en la
 * especificación —"cambiar la tilapia por fajitas de lomo"— y eso NUNCA movía
 * el granel: se veía en la hoja de empaque, y la cocina seguía haciendo el
 * plato original. Es lo que le pasó a José David Alpízar con su tilapia por
 * pollo (Gina, 11 de setiembre de 2026).
 *
 * ES UN LECTOR CONSERVADOR A PROPÓSITO. Sacar de acá un cambio equivocado es
 * peor que no sacarlo: al granel se le RESTA el original y se le SUMA el
 * sustituto, así que un error mueve comida de verdad. Por eso solo se lee lo
 * que no deja dudas:
 *
 *   · una sola pareja por frase — "cambiar A y B por C y D" no se toca, porque
 *     no hay forma de saber cuál va con cuál
 *   · los dos lados tienen que tener nombre
 *   · se marca `deTexto` para que quien lo aplique pueda exigir que el original
 *     exista de verdad antes de mover nada
 */

/** Las frases que separan un cambio del siguiente. */
const SEPARADORES = /[·|;\n]|\s+\/\s+/;

/** Ruido que Gina pone alrededor del nombre y no es parte del plato. */
const limpiarNombre = (texto) => String(texto || '')
    .replace(/^(el|la|los|las|un|una)\s+/i, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[.,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Si la frase nombra VARIAS cosas de un lado.
 *
 * "cambiar lentejas y pollo teriyaki por albóndigas y el estofado" son dos
 * cambios entrelazados y no hay forma de saber cuál va con cuál. Se deja pasar
 * para que lo resuelva una persona.
 */
const nombraVarios = (texto) => /\s+y\s+/i.test(String(texto || ''));

/**
 * Lee los cambios escritos en una especificación.
 *
 * @param {string} texto
 * @returns {{cambios: Array<{tipo, de, a, deTexto}>, ambiguos: Array<string>}}
 */
export const sustitucionesEscritas = (texto) => {
    const cambios = [];
    const ambiguos = [];

    String(texto || '').split(SEPARADORES).forEach(frase => {
        const t = frase.trim();
        if (!t) return;

        // "cambiar X por Y" / "cambiame X por Y" / "cambio X por Y"
        const m = t.match(/\bcambi(?:ar|ame|e|o|en)?\s+(.+?)\s+por\s+(.+)$/i);
        if (!m) return;

        const de = limpiarNombre(m[1]);
        const a = limpiarNombre(m[2]);
        if (!de || !a) return;

        if (nombraVarios(m[1]) || nombraVarios(m[2])) {
            ambiguos.push(t);
            return;
        }

        cambios.push({ tipo: 'proteina', plato: null, de, a, deTexto: true });
    });

    return { cambios, ambiguos };
};
