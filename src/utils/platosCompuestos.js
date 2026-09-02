/**
 * Un renglón que en realidad son varias preparaciones, y platos que son el
 * mismo aunque se escriban distinto.
 *
 * Los dos casos vienen de la hoja del 29 de agosto:
 *
 *   · "Arroz, frijoles y maduros — 4 TAZA(S)" es un renglón, pero son tres
 *     ollas. Van 4 tazas de cada cosa, no 4 repartidas entre las tres.
 *   · "Carne mechada de res en salsa", "Carne mechada en salsa" y "Carne
 *     mechada en salsa criolla" son la misma carne en tres renglones.
 */

import { NUCLEOS_MISMO_PLATO, MAXIMO_PALABRAS_POR_COMPONENTE } from '../data/platosEquivalentes';
import { palabrasClave } from './mismoPlato';

const sinTildes = (texto) => String(texto || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Primera letra en mayúscula, como se escriben los platos en la hoja. */
const conMayuscula = (texto) => {
    const t = String(texto || '').trim();
    return t.length > 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

/**
 * Si el plato pertenece a un núcleo, devuelve el nombre del núcleo.
 *
 * Todo lo que empiece con esas palabras es la misma olla, así que se le pone a
 * todos el mismo nombre y el acumulador los suma solo.
 *
 * @returns {string|null} "Carne mechada", o null si no calza con ninguno
 */
export const nucleoDelPlato = (nombre) => {
    const t = sinTildes(nombre);
    if (!t) return null;

    const nucleo = NUCLEOS_MISMO_PLATO.find(n => {
        const limpio = sinTildes(n);
        // Tiene que EMPEZAR con el núcleo, y terminar ahí o seguir con otra
        // palabra: "carne mechada" agarra "Carne mechada criolla" pero no
        // agarraría un hipotético "Carne mechadada".
        return t === limpio || t.startsWith(limpio + ' ');
    });

    return nucleo ? conMayuscula(nucleo) : null;
};

/**
 * Parte un nombre que es una lista de preparaciones.
 *
 * "Arroz, frijoles y maduros" -> ['Arroz', 'Frijoles', 'Maduros']
 *
 * Se pide COMA para partir. Es la señal de que alguien escribió una lista, y
 * deja afuera los nombres que solo llevan "y" dentro de una descripción, como
 * "Canelones rellenos con queso y envueltos en huevo". Además cada parte tiene
 * que ser corta: si una parte es larga, es una descripción y no un ingrediente,
 * y partir ahí rompería el plato.
 *
 * @returns {Array<string>} las partes, o [nombre] si no es una lista
 */
export const separarComponentes = (nombre) => {
    const original = String(nombre || '').trim();
    if (!original.includes(',')) return [original];

    // "Arroz, frijoles y maduros" -> ['Arroz', 'frijoles', 'maduros']
    const partes = original
        .split(',')
        .flatMap(p => p.split(/\s+y\s+/i))
        .map(p => p.trim())
        .filter(Boolean);

    if (partes.length < 2) return [original];

    // Si alguna parte es larga, no era una lista de ingredientes
    const todasCortas = partes.every(p => {
        const n = palabrasClave(p).length;
        return n >= 1 && n <= MAXIMO_PALABRAS_POR_COMPONENTE;
    });
    if (!todasCortas) return [original];

    return partes.map(conMayuscula);
};

/**
 * El nombre con el que un plato tiene que entrar al acumulador.
 *
 * Junta las dos reglas: primero lo que una persona marcó como el mismo plato,
 * después el núcleo. Lo manual manda porque lo decidió quien cocina.
 *
 * @param {string} nombre
 * @param {Map<string,string>} [destinosManuales] - de `destinosDeUnion()`
 */
export const nombreParaAcumular = (nombre, destinosManuales) => {
    const clave = String(nombre || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const manual = destinosManuales?.get(clave);
    if (manual) return manual;
    return nucleoDelPlato(nombre) || nombre;
};
