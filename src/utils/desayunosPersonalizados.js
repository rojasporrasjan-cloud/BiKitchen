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
 * Si el texto del cliente nombra un plato, cual de los del menu es.
 * Compara por palabras clave para que "gallo pintos" agarre "Gallo pinto con
 * queso" y "burritos" agarre "Burritos con queso, jamon y frijoles".
 */
export const platosQueMenciona = (texto, platos) => {
    const t = sinTildes(texto);
    if (!t) return [];
    return platos
        .map((p, i) => ({ i, nombre: nombreDePlato(p) }))
        .filter(({ nombre }) => {
            const n = sinTildes(nombre);
            if (!n) return false;
            // La primera palabra fuerte del plato: "gallo pinto", "burritos",
            // "prensadas". Se singulariza para que "pintos" calce con "pinto".
            const clave = n.split(/\s+(?:con|de|y|en|al|a la)\s+/)[0];
            if (!clave) return false;
            const suelto = clave.replace(/s\b/g, '');
            return t.includes(clave) || t.includes(suelto);
        })
        .map(({ i }) => i);
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
