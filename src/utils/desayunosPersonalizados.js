/**
 * Desayunos que no son los del menu de la semana.
 *
 * La tabla de desayunos pone los 5 platos oficiales a la izquierda con UN solo
 * total, y la lista de clientes a la derecha. Las dos columnas son
 * independientes: dan por hecho que todos comen lo mismo.
 *
 * Eso se rompe apenas alguien cambia un plato. El menu de esta semana es:
 *
 *   1. Gallo pinto con huevos revueltos
 *   2. Burritos con queso, jamon y frijoles
 *   3. Prensadas con queso
 *   4. Gallo pinto con huevos con tomate
 *   5. Gallo pinto con queso
 *
 * TRES de los cinco son gallo pinto. Cuando Allan Quesada pide "cambiar gallo
 * pinto por burritos" no esta cambiando un plato: son tres. Y Alexa Astua pide
 * lo contrario, "solo gallo pinto", que son esos mismos tres. Ninguno de los dos
 * come el menu de la semana.
 *
 * Con la tabla vieja la cocina preparaba gallo pinto para todos —ellos
 * incluidos— y los burritos de Allan no los hacia nadie. Solo funcionaba porque
 * Gina leia la nota.
 *
 * Aca se separan: quien come el menu tal cual se queda en la tabla normal y
 * cuenta para su total; quien lo cambio sale a su propio bloque con SUS platos.
 */

import { PACKS_DATA } from '../data/packsData';
import { mapPackNameToMenuKey } from './packClassification';

/** Un plato del menu puede venir como texto o como objeto. */
export const nombreDePlato = (plato) => {
    if (!plato) return '';
    if (typeof plato === 'string') return plato;
    if (typeof plato.proteina === 'string') return plato.proteina;
    return plato.proteina?.nombre || plato.nombre || '';
};

const sinTildes = (t) => String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Palabras que no distinguen un plato de otro.
 *
 * "salsa" y "plato" salen en medio menu; si contaran, "cambiar la tilapia del
 * primer plato" agarraria cualquier cosa que llevara salsa.
 */
const PALABRAS_VACIAS = new Set([
    'salsa', 'plato', 'platos', 'primer', 'primero', 'segundo', 'tercer', 'tercero',
    'cuarto', 'quinto', 'para', 'todos', 'todas', 'todo', 'este', 'esta', 'esos',
    'solo', 'solos', 'porfavor', 'favor', 'cambiar', 'cambio', 'poner',
    // De tres letras, que entran desde que se bajo el umbral
    'con', 'por', 'del', 'las', 'los', 'una', 'uno', 'sin', 'que', 'mas', 'dos'
]);

/**
 * Las palabras con las que un plato se reconoce, ya singularizadas.
 *
 * Cuentan desde tres letras: "Mix de vegetales estilo Mediterraneo" se
 * distingue de "Crema de vegetales" justamente por "Mix", y con el umbral en
 * cuatro esa palabra se perdia y los dos platos empataban.
 */
const palabrasClave = (texto) => new Set(
    sinTildes(texto)
        .split(/[^a-z0-9]+/)
        .filter(w => w.length >= 3 && !PALABRAS_VACIAS.has(w))
        .map(w => w.replace(/s$/, ''))
);

/**
 * Si el texto del cliente nombra un plato, cual de los del menu es.
 *
 * Se comparan las palabras y no el principio del nombre: la palabra que
 * identifica el plato no siempre va adelante. "Filet de tilapia con perejil y
 * ajo" se reconoce por "tilapia", que va en el medio, y buscando por el
 * principio no calzaba con "cambiar la TILAPIA del primer plato".
 */
/** Cuantas palabras clave comparten el texto del cliente y el nombre del plato. */
const puntaje = (pedidas, nombre) => {
    const suyas = palabrasClave(nombre);
    let n = 0;
    for (const w of pedidas) if (suyas.has(w)) n++;
    return n;
};

export const platosQueMenciona = (texto, platos) => {
    const pedidas = palabrasClave(texto);
    if (pedidas.size === 0) return [];

    const puntajes = platos.map((p) => puntaje(pedidas, nombreDePlato(p)));

    // Gana el que comparte MAS palabras, no cualquiera que comparta una.
    //
    // "Relish de vegetales y Mix de vainica" tocaba tres platos porque
    // "vegetales" sale en medio menu: se le cambiaban tambien la crema de
    // vegetales y los vegetales mixtos, que el cliente no pidio. Contando,
    // "Mix de vegetales estilo Mediterraneo" comparte dos palabras y los otros
    // una, asi que solo ese cambia.
    //
    // Y sigue sirviendo cuando el cliente si quiere varios: "gallo pinto"
    // comparte dos palabras con los TRES gallo pintos del menu de desayunos.
    const mejor = Math.max(...puntajes);
    if (mejor === 0) return [];
    return puntajes.map((n, i) => (n === mejor ? i : -1)).filter(i => i >= 0);
};

const FRASES = [
    // "cambiar gallo pintos por burritos"
    { tipo: 'cambio', re: /cambiar\s+(?:los?\s+|las?\s+)?(.+?)\s+por\s+(.+?)(?:\s*[.;·(]|$)/i },
    // "gallo pinto en vez de burritos"  ->  quiere gallo pinto
    { tipo: 'cambioInverso', re: /(.+?)\s+en\s+vez\s+de\s+(.+?)(?:\s*[.;·(]|$)/i },
    // "solo gallo pinto"
    { tipo: 'solo', re: /\bsolo\s+(.+?)(?:\s*[.;·(]|$)/i },
    // "no gallo pinto" / "sin gallo pinto"
    { tipo: 'quitar', re: /\b(?:no|sin)\s+(?:mandar\s+|incluir\s+)?(.+?)(?:\s*[.;·(]|$)/i }
];

/**
 * Lee la instruccion de desayuno escrita en las observaciones.
 *
 * Solo mira la parte del texto que habla de desayunos: un pedido puede traer un
 * cambio de almuerzo y otro de desayuno en la misma nota, y confundirlos
 * cambiaria el plato equivocado.
 *
 * @returns {null | {tipo, quita:number[], pone:string|null, texto:string}}
 */
export const leerCambioDeDesayuno = (observaciones, platos) => {
    const obs = String(observaciones || '');
    if (!obs) return null;

    // Cortar a la clausula que menciona desayuno. Las notas vienen separadas por
    // " · " o por punto.
    const clausulas = obs.split(/\s*[·|]\s*|(?<=\.)\s+/).filter(Boolean);
    const deDesayuno = clausulas.filter(c => /desayun/i.test(c));
    if (deDesayuno.length === 0) return null;

    for (const clausula of deDesayuno) {
        // Quitar la etiqueta "DESAYUNOS:" para no confundirla con un plato.
        const cuerpo = clausula.replace(/desayunos?\s*(gratis|de regalia|:)?/gi, ' ');

        for (const { tipo, re } of FRASES) {
            const m = cuerpo.match(re);
            if (!m) continue;

            if (tipo === 'cambio') {
                const quita = platosQueMenciona(m[1], platos);
                if (!quita.length) continue;
                return { tipo: 'cambio', quita, pone: m[2].trim(), texto: clausula.trim() };
            }
            if (tipo === 'cambioInverso') {
                const quita = platosQueMenciona(m[2], platos);
                if (!quita.length) continue;
                return { tipo: 'cambio', quita, pone: m[1].trim(), texto: clausula.trim() };
            }
            if (tipo === 'solo') {
                const deja = platosQueMenciona(m[1], platos);
                if (!deja.length) continue;
                const quita = platos.map((_, i) => i).filter(i => !deja.includes(i));
                if (!quita.length) continue;   // pidio "solo" lo que ya es todo
                return { tipo: 'solo', quita, pone: null, texto: clausula.trim() };
            }
            if (tipo === 'quitar') {
                const quita = platosQueMenciona(m[1], platos);
                if (!quita.length) continue;
                return { tipo: 'quitar', quita, pone: null, texto: clausula.trim() };
            }
        }
    }
    return null;
};

/**
 * Los platos que le tocan a este cliente, ya con su cambio aplicado.
 * Cada fila dice si quedo igual, si se sustituyo o si se quito.
 */
export const platosDeDesayunoDelCliente = (platos, cambio) => {
    const base = platos.map((p, i) => ({
        numero: i + 1,
        nombre: nombreDePlato(p),
        estado: 'igual'
    }));
    if (!cambio) return base;

    return base.map((fila, i) => {
        if (!cambio.quita.includes(i)) return fila;
        if (cambio.pone) {
            return { ...fila, nombre: cambio.pone, original: fila.nombre, estado: 'cambiado' };
        }
        return { ...fila, original: fila.nombre, estado: 'quitado' };
    });
};

// ---------------------------------------------------------------------------
// Lo mismo, pero para los packs de almuerzo
// ---------------------------------------------------------------------------

/**
 * Un plato de pack tiene tres partes; el cambio puede caer en cualquiera.
 * "cambiar la TILAPIA del primer plato" toca la proteina, "cambiar picadillo
 * con chayote por papitas" toca el vegetal.
 */
export const partesDelPlato = (plato) => ({
    proteina: plato?.proteina?.nombre ?? (typeof plato?.proteina === 'string' ? plato.proteina : ''),
    vegetal: plato?.vegetal?.nombre ?? (typeof plato?.vegetal === 'string' ? plato.vegetal : ''),
    carbo: plato?.carbo?.nombre ?? (typeof plato?.carbo === 'string' ? plato.carbo : '')
});

/**
 * Que platos del pack menciona el texto, y en que parte de cada uno.
 *
 * Se puntua contra TODO el menu de una vez y gana el puntaje mas alto. Mirar
 * plato por plato no sirve: "Relish de vegetales y Mix de vainica" comparte una
 * palabra con la crema de vegetales y otra con los vegetales mixtos, y asi se
 * le cambiaban tres platos cuando el cliente pidio uno.
 */
export const platosDePackQueMenciona = (texto, platos) => {
    const pedidas = palabrasClave(texto);
    if (pedidas.size === 0) return [];

    // El mejor calce de cada plato, mirando sus tres partes.
    const porPlato = platos.map((p, i) => {
        const partes = partesDelPlato(p);
        let mejor = { indice: i, parte: null, nombre: '', n: 0 };
        for (const parte of ['proteina', 'vegetal', 'carbo']) {
            const nombre = partes[parte];
            if (!nombre) continue;
            const n = puntaje(pedidas, nombre);
            if (n > mejor.n) mejor = { indice: i, parte, nombre, n };
        }
        return mejor;
    });

    const mejorPuntaje = Math.max(...porPlato.map(x => x.n), 0);
    if (mejorPuntaje === 0) return [];
    return porPlato.filter(x => x.n === mejorPuntaje)
        .map(({ indice, parte, nombre }) => ({ indice, parte, nombre }));
};

/**
 * Lo que lleva un envase, leido de un texto.
 *
 * "150g proteina + 3 carbos + 2 vegetales" -> { proteina: 150, carbo: 3, vegetal: 2 }
 *
 * Hacen falta al menos DOS cifras para darlo por bueno: un "2 vegetales" suelto
 * en medio de una nota puede ser cualquier apunte, y de ahi no se puede concluir
 * como se arma el plato.
 */
const CIFRAS_DEL_ENVASE = {
    proteina: /(\d{2,4})\s*g(?:r|rs|ramos)?\.?\s*(?:de\s+)?prote[ií]na/i,
    vegetal: /(\d+)\s*(?:taza[s]?\s+(?:de\s+)?)?(?:vegetal(?:es)?|ensalada[s]?)\b/i,
    carbo: /(\d+)\s*(?:taza[s]?\s+(?:de\s+)?)?(?:carbo(?:s|hidratos?)?|harina[s]?)\b/i
};

export const leerComposicion = (texto) => {
    const t = String(texto || '');
    if (!t) return null;
    const partes = {};
    Object.entries(CIFRAS_DEL_ENVASE).forEach(([parte, re]) => {
        const m = t.match(re);
        if (m) partes[parte] = Number(m[1]);
    });
    return Object.keys(partes).length >= 2 ? partes : null;
};

/** Lo que lleva ese pack segun el catalogo, para saber contra que comparar. */
export const composicionDelCatalogo = (packName) => {
    // Se busca por FAMILIA, no por el nombre escrito.
    //
    // Antes se comparaba con `includes` contra el nombre del catalogo, y una
    // palabra de mas rompia todo: la hoja titula el grupo "PACK BAJO EN
    // CALORIAS" y el catalogo dice "Pack Bajo Calorias" —sobra el "en"— asi que
    // no calzaba y Jason Barrantes salia como si comiera la porcion estandar,
    // con sus 100 g escondidos en una nota al lado.
    //
    // `mapPackNameToMenuKey` es la misma funcion que usa la hoja para decidir
    // que menu le toca a cada pack, asi que las dos cosas no se pueden separar.
    const clave = mapPackNameToMenuKey(packName);
    if (!clave) return null;

    let desc = null;
    Object.values(PACKS_DATA).forEach((categoria) => {
        (categoria?.packs || []).forEach((pack) => {
            if (!desc && mapPackNameToMenuKey(pack?.name) === clave) desc = pack.desc;
        });
    });
    return desc ? leerComposicion(desc) : null;
};

const PARTES = ['proteina', 'vegetal', 'carbo'];

/** Solo se comparan las partes que AMBAS mencionan. */
const difierenLasComposiciones = (suya, estandar) =>
    PARTES.some(k => suya[k] !== undefined && estandar[k] !== undefined && suya[k] !== estandar[k]);

/**
 * Solo las partes que DE VERDAD cambian, de las dos composiciones a la vez.
 *
 * Jason Barrantes lleva 100 g de proteina y 1 vegetal, igual que el Pack
 * Regular; lo unico distinto es que pidio 1 carbo en vez de 2. Nombrar las tres
 * partes obligaria a quien empaca a comparar dos listas casi iguales para
 * encontrar la unica que importa.
 */
const soloLoQueCambia = (suya, estandar) => PARTES.reduce((acc, k) => {
    if (suya[k] !== undefined && estandar[k] !== undefined && suya[k] !== estandar[k]) {
        acc.suya[k] = suya[k];
        acc.estandar[k] = estandar[k];
    }
    return acc;
}, { suya: {}, estandar: {} });

const enPalabras = (comp) => PARTES
    .filter(k => comp[k] !== undefined)
    .map(k => {
        if (k === 'proteina') return `${comp[k]} g de proteina`;
        const n = comp[k];
        if (k === 'vegetal') return `${n} ${n === 1 ? 'vegetal' : 'vegetales'}`;
        return `${n} ${n === 1 ? 'carbo' : 'carbos'}`;
    })
    .join(', ');

/**
 * El cambio que pidio el cliente sobre su pack.
 *
 * Se ignoran las clausulas que hablan de desayunos: esas ya las lee
 * leerCambioDeDesayuno y su tabla es otra.
 */
export const leerCambioDePack = (observaciones, platos, packName = '') => {
    const obs = String(observaciones || '');
    if (!obs || !platos?.length) return null;

    const clausulas = obs
        .split(/\s*[·|]\s*|(?<=\.)\s+/)
        .filter(c => c.trim() && !/desayun/i.test(c));

    for (const clausula of clausulas) {
        const m = clausula.match(/cambiar\s+(?:la\s+|el\s+|los\s+|las\s+)?(.+?)\s+por\s+(.+?)(?:\s*[.;(]|$)/i);
        if (!m) continue;
        const toca = platosDePackQueMenciona(m[1], platos);
        if (!toca.length) continue;
        return { toca, pone: m[2].trim(), texto: clausula.trim() };
    }

    // No todo cambio es de PLATO. Marianela Alfaro lleva el Full Pack de la
    // semana —los mismos cinco platos— pero su envase se arma con 3 vegetales y
    // 1 carbo, cuando el Full Pack del catalogo trae 3 carbos y 2 vegetales.
    // Quien empaca no tiene como adivinarlo mirando la fila, asi que va al
    // bloque de personalizados igual que un cambio de plato.
    //
    // Se compara contra el catalogo a proposito: cuando la nota REPITE la
    // composicion estandar no es una personalizacion, es la descripcion del
    // pack escrita de nuevo, y ahi no hay nada que separar.
    const estandar = composicionDelCatalogo(packName);
    const suya = leerComposicion(obs);
    if (estandar && suya && difierenLasComposiciones(suya, estandar)) {
        return {
            toca: [],
            composicion: suya,
            estandar,
            // Solo se nombra lo que de verdad cambia: si la proteina es la misma,
            // meterla en el "en vez de" la haria parecer parte del cambio.
            texto: (({ suya: s, estandar: e }) =>
                `${enPalabras(s)} por plato, en vez de ${enPalabras(e)}`
            )(soloLoQueCambia(suya, estandar))
        };
    }
    return null;
};

/** El pack del cliente con su cambio aplicado, plato por plato. */
export const platosDePackDelCliente = (platos, cambio) =>
    platos.map((p, i) => {
        const partes = partesDelPlato(p);
        const suyo = cambio?.toca.find(t => t.indice === i);
        return {
            numero: p?.numero ?? i + 1,
            ...partes,
            ...(suyo ? { [suyo.parte]: cambio.pone, original: suyo.nombre, cambiada: suyo.parte } : {})
        };
    });

/**
 * Parte los clientes de un pack: quien come el menu tal cual y quien no.
 *
 * Mismo problema que en desayunos. La columna de platos y la de clientes van
 * por su lado, asi que el nombre de Guillermo Vargas caia en la fila del arroz
 * aunque su cambio fuera de la tilapia — y el Plato 1 seguia contando 4
 * tilapias, una de ellas para el que no come tilapia.
 */
export const separarPersonalizadosDePack = (clientes, platos, packName = '') => {
    const lista = Array.isArray(clientes) ? clientes : [];
    const menu = Array.isArray(platos) ? platos : [];
    const estandar = [];
    const personalizados = [];

    lista.forEach((c) => {
        const cambio = menu.length ? leerCambioDePack(textoDeObservaciones(c), menu, packName) : null;
        if (cambio) personalizados.push({ ...c, cambio, platos: platosDePackDelCliente(menu, cambio) });
        else estandar.push(c);
    });

    const packsEstandar = estandar.reduce(
        (n, c) => n + (Number(c?.cantidad) > 0 ? Number(c.cantidad) : 1), 0);

    return { estandar, personalizados, packsEstandar };
};

/**
 * De donde leer la instruccion del cliente.
 *
 * La nota que trae el cliente en esta tabla ya paso por `notaParaEmpaque`, que
 * la parte en las rayas y bota las frases que parecen apuntes internos. Eso esta
 * bien para quien empaca, pero aca se come justo lo que hace falta: la nota de
 * Allan decia "cambiar gallo pinto por BURRITOS (chat 2 set — reemplaza...)" y
 * de ahi solo sobrevivia el pedazo de despues de la raya.
 *
 * Por eso se lee primero la observacion ORIGINAL del pedido.
 */
export const textoDeObservaciones = (cliente) => {
    const fuentes = [
        cliente?.observacionesOriginales,
        cliente?.rawPedido?.observacionesOriginales,
        cliente?.rawPedido?.observaciones,
        cliente?.observaciones
    ].filter(Boolean);
    // Todas, sin repetir: el cambio puede haber quedado escrito en una y no en otra.
    return [...new Set(fuentes)].join(' · ');
};

/**
 * Parte la lista de clientes de la tabla de desayunos en dos.
 *
 * @param {Array} clientes  los del pack de desayunos
 * @param {Array} platos    los 5 del menu de la semana
 * @returns {{ estandar: Array, personalizados: Array, packsEstandar: number }}
 *          `packsEstandar` es el total que va en la columna Cantidad de la tabla
 *          normal: sin los personalizados, que ya no comen de esa olla.
 */
export const separarDesayunos = (clientes, platos) => {
    const lista = Array.isArray(clientes) ? clientes : [];
    const menu = Array.isArray(platos) ? platos : [];
    const estandar = [];
    const personalizados = [];

    lista.forEach((c) => {
        const cambio = menu.length ? leerCambioDeDesayuno(textoDeObservaciones(c), menu) : null;
        if (cambio) {
            personalizados.push({
                ...c,
                cambio,
                platos: platosDeDesayunoDelCliente(menu, cambio)
            });
        } else {
            estandar.push(c);
        }
    });

    const packsEstandar = estandar.reduce(
        (n, c) => n + (Number(c?.cantidad) > 0 ? Number(c.cantidad) : 1), 0);

    return { estandar, personalizados, packsEstandar };
};

/**
 * Los que llevan un cambio, agrupados POR EL CAMBIO que llevan.
 *
 * Quien empaca no arma un pack a la vez: pone los 30 envases del menu tal cual
 * en la mesa y los llena en linea. Los que llevan un cambio rompen esa linea,
 * pero no de a uno: si cinco personas cambiaron el arroz por pure de papa, esos
 * cinco son otra linea de cinco, no cinco excepciones sueltas.
 *
 * "Poner todos los que no tienen ningun cambio en una hoja y poner los que
 * tienen cambios en otra hoja, y los personalizados en otra" — Jan, 7 de
 * setiembre de 2026, despues de empacar 45 packs de un solo el viernes.
 *
 * Se parte en dos:
 *   grupos  -> cambiaron UN ingrediente del menu de la semana. Van juntos los
 *              que pidieron exactamente el mismo cambio, con un solo cuadro de
 *              platos porque a todos les queda igual.
 *   propios -> no es un cambio de plato sino de COMPOSICION —Marianela lleva 3
 *              vegetales y 1 carbo donde el pack trae 2 y 3—. Ese no se puede
 *              juntar con nadie: el envase se arma distinto.
 *
 * @param {Array} personalizados  la salida de separarPersonalizadosDePack
 * @returns {{ grupos: Array, propios: Array }}
 */
export const agruparCambiosDePack = (personalizados) => {
    const lista = Array.isArray(personalizados) ? personalizados : [];
    const porClave = new Map();
    const propios = [];

    lista.forEach((c) => {
        const toca = c?.cambio?.toca || [];
        // Sin plato tocado el cambio es de composicion: va solo.
        if (toca.length === 0) { propios.push(c); return; }

        const clave = toca.map(t => `${t.indice}:${t.parte}`).sort().join(',')
            + '=>' + String(c.cambio.pone || '').trim().toLowerCase();

        if (!porClave.has(clave)) {
            porClave.set(clave, {
                clave,
                texto: c.cambio.texto,
                pone: c.cambio.pone,
                // Todos los del grupo comen lo mismo, asi que el cuadro de
                // platos se dibuja UNA vez.
                platos: c.platos,
                clientes: []
            });
        }
        porClave.get(clave).clientes.push(c);
    });

    const grupos = [...porClave.values()].map(g => ({
        ...g,
        total: g.clientes.reduce((n, c) => n + (Number(c?.cantidad) > 0 ? Number(c.cantidad) : 1), 0)
    }));

    // El grupo mas grande primero: es el que conviene armar cuando la gente
    // todavia esta fresca.
    grupos.sort((a, b) => b.total - a.total || a.texto.localeCompare(b.texto));

    return { grupos, propios };
};
