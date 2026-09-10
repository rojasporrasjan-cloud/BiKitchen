/**
 * Los cambios que quedaron ESCRITOS en la nota, no cargados como sustitucion.
 *
 * La hoja ya separa los packs con cambio de los que van tal cual, pero solo
 * reconoce los cambios ESTRUCTURADOS —"plato 4, cambiar el carbo por arroz"—.
 * Cuando el cambio se escribio como texto libre en las especificaciones, el
 * pack se queda en la hoja blanca, entre los que van tal cual.
 *
 * Medido en la hoja del viernes 11 de setiembre de 2026: de 32 clientes en la
 * hoja blanca de bajo calorias, SIETE tenian un cambio escrito. Mauricio Vargas
 * ("cambiar burrito por pinto con huevos revueltos"), Karla Juarez ("cambiar
 * cochinita por fajitas de lomo"), Daniel Milanes ("no puede comer mariscos")…
 *
 * Eso es justo lo que la separacion venia a evitar:
 *
 *   "Si son treinta y cuatro packs y treinta no tienen ningun cambio, y cuatro
 *    si, se nos pueden enredar y perder esos cuatro. En cambio, si tenemos dos
 *    hojas separadas, no se nos van a perder" — Jan, 9 de setiembre de 2026.
 *
 * El error caro no es cargar mal el pedido —eso se revisa antes— sino empacar
 * treinta packs iguales sin ver que siete llevaban algo distinto. Eso pasa en la
 * mesa, el viernes, cuando ya nadie esta revisando datos.
 */

/**
 * Frases que anuncian un cambio de comida.
 *
 * Van ancladas a como escribe Gina en los pedidos de verdad. Se buscan en
 * cualquier parte de la nota porque suelen venir a media frase, despues de un
 * punto o de un "·".
 */
const ANUNCIA_CAMBIO = new RegExp([
    // Sustituir una cosa por otra
    'cambiar\\b', 'cambio de\\b', 'en vez de\\b', 'en lugar de\\b',
    'sustitu', 'reemplaz', '\\bpor\\b.*\\ben vez\\b',
    // Poner un PLATO distinto del que trae el menu. Anclado a "platos" a
    // proposito: 'poner los packs en bolsa' es empaque, no comida.
    'poner platos?\\b',
    // Restricciones: no es un reemplazo pero cambia lo que va en la bolsa
    'no puede comer\\b', 'no come\\b', 'es alerg', 'alergi[ao]\\b',
    'no lleva\\b', 'no le pong', 'quitar\\b',
    // "NO VAINICAS", "SIN RES NI CERDO" — la negacion de un ingrediente
    '\\bno\\s+[a-záéíóúñ]{4,}s\\b'
].join('|'), 'i');

/**
 * Frases que NO son un cambio de comida.
 *
 * Se revisan ANTES: "Lleva cena" o "TWO PACK" no cambian ni un ingrediente, y
 * mandarlos a la hoja de cambios llenaria esa hoja de packs que van tal cual —
 * que es exactamente el problema al reves.
 */
const NO_ES_CAMBIO = new RegExp([
    '^lleva (?:cena|desayunos?|tambi[ée]n)',
    '^two pack', '^un pack por entrega', '^pack \\d de \\d',
    '^entrega', '^semana \\d',
    // Instrucciones de EMPAQUE: dicen como va la bolsa, no que lleva adentro
    'en bolsa', 'bolsas? aparte', '\\betiquet', '\\bempacar\\b', '\\bcaja\\b',
    // Notas de FECHAS: dicen en que dias entrega, no que come.
    // 'No lleva el 19 ni el 26' es un calendario, no un cambio de plato.
    'no lleva (?:el|los|la|las)?\\s*\\d', 'entregas? del\\b', 'no va (?:el|los)\\b',
    // Rastro de nuestras propias correcciones al cargar el pedido
    'reemplaza (?:la|el)\\b[^.]*anterior', 'vale lo que dice',
    // Quitar la cena o el desayuno cambia el TAMANO del pack, no un
    // ingrediente. Marlon Camacho ('NO lleva cena') se empaca igual que
    // los demas: sus platos son los del menu, solo van menos.
    'no lleva (?:cenas?|desayunos?)'
].join('|'), 'i');

/** Las frases de una nota, separadas como las escribe Gina. */
const frasesDe = (nota) => String(nota || '')
    .split(/\s*[·|—]\s*|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
    .map(f => f.trim())
    .filter(Boolean);

/**
 * Si la nota de este cliente anuncia un cambio de comida.
 *
 * @param {string} nota  las observaciones del pedido
 * @returns {boolean}
 */
export const tieneCambioEscrito = (nota) => frasesDe(nota)
    .some(f => !NO_ES_CAMBIO.test(f) && ANUNCIA_CAMBIO.test(f));

/** La primera frase que anuncia el cambio, para mostrarla en la hoja. */
export const elCambioEscrito = (nota) => frasesDe(nota)
    .find(f => !NO_ES_CAMBIO.test(f) && ANUNCIA_CAMBIO.test(f)) || '';

/**
 * Aparta de la hoja blanca los que llevan un cambio escrito.
 *
 * @param {Array} clientes  los que la hoja da por estandar
 * @param {Function} leerNota  como sacar la nota de un cliente
 * @returns {{ sinCambio: Array, conCambioEscrito: Array }}
 */
export const apartarCambiosEscritos = (clientes = [], leerNota = (c) => c?.observaciones) => {
    const sinCambio = [];
    const conCambioEscrito = [];
    (clientes || []).forEach((c) => {
        if (tieneCambioEscrito(leerNota(c))) conCambioEscrito.push(c);
        else sinCambio.push(c);
    });
    return { sinCambio, conCambioEscrito };
};

/** Cuantos packs suma una lista de clientes. */
export const packsDe = (clientes = []) => (clientes || [])
    .reduce((n, c) => n + (Number(c?.cantidad) > 0 ? Number(c.cantidad) : 1), 0);
