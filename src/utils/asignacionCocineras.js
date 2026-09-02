/**
 * A quién le toca cada plato.
 *
 * Gina reparte la cocina por especialidad: Rosa el pollo, Fernanda el cerdo y la
 * res, doña Carmen los vegetales y las sopas, Osmany los purés y las harinas.
 * Eso se repite todas las semanas, así que la hoja lo puede proponer sola y
 * ahorrarse escribir el nombre plato por plato.
 *
 * Es una PROPUESTA, no una orden. Se puede cambiar en pantalla y nunca pisa una
 * asignación hecha a mano: el que reparte de verdad es quien está en la cocina.
 *
 * Las reglas están en `src/data/cocineras.js` porque son datos del negocio, no
 * lógica: cambian cuando entra o sale alguien del equipo.
 */

import {
    COCINERAS,
    REGLAS_ASIGNACION,
    POR_TIPO_COMPONENTE
} from '../data/cocineras';

/** Sin tildes y en minúscula, para que "brócoli" y "brocoli" sean lo mismo. */
const normalizar = (texto) => String(texto || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Calza la palabra completa y su plural.
 * "picadillo" agarra "picadillos"; "res" NO agarra "fresas" ni "arroz".
 */
const calza = (textoNormalizado, palabra) => {
    const patron = new RegExp(`\\b${escaparRegex(normalizar(palabra))}(es|s)?\\b`);
    return patron.test(textoNormalizado);
};

/**
 * Lo que de verdad se cocina.
 *
 * Una sustitución llega como "Pollo caribeño → Carne mechada". Lo que va a la
 * olla es la carne, no el pollo, así que la asignación se decide por el lado
 * derecho de la flecha. Si se mirara el izquierdo, el plato le caería a Rosa y
 * lo terminaría cocinando Fernanda.
 */
export const loQueSeCocina = (nombre) => {
    const partes = String(nombre || '').split(/→|->/);
    return partes[partes.length - 1].trim();
};

/**
 * @param {string} nombre - nombre del platillo
 * @param {string} [tipoComponente] - 'Proteína' | 'Vegetal' | 'Harina'
 * @returns {{cocinera: string|null, motivo: string, seguro: boolean}}
 *          `cocinera` en null = nadie lo tiene de fijo, lo decide Gina.
 *          `seguro` en false = calzó por tipo, no por nombre; conviene revisarlo.
 */
export const sugerirCocinera = (nombre, tipoComponente) => {
    const texto = normalizar(loQueSeCocina(nombre));
    if (!texto) return { cocinera: null, motivo: 'Sin nombre', seguro: false };

    // Primera regla que calce, de arriba hacia abajo. Una regla sin cocinera
    // (el pescado) corta la busqueda: es mejor preguntar que adivinar.
    for (const regla of REGLAS_ASIGNACION) {
        if (regla.palabras.some(p => calza(texto, p))) {
            return {
                cocinera: regla.cocinera,
                motivo: regla.motivo,
                seguro: regla.cocinera !== null
            };
        }
    }

    // El nombre no dijo nada: se cae al tipo de componente
    const porTipo = POR_TIPO_COMPONENTE[tipoComponente];
    if (porTipo) return { ...porTipo, seguro: false };

    return { cocinera: null, motivo: 'No calzó con nadie', seguro: false };
};

/**
 * Reparte una lista de platillos.
 *
 * Lo ya asignado a mano NO se toca: alguien lo decidió y la máquina no tiene por
 * qué corregirlo. Solo se llenan los que están en blanco.
 *
 * @param {Array<{name: string, tipo?: string}>} platillos
 * @param {Object} asignadas - lo que ya está puesto, { nombrePlato: 'ROSA' }
 * @returns {{asignaciones: Object, nuevas: number, sinAsignar: Array}}
 */
export const repartirPlatillos = (platillos, asignadas = {}) => {
    const asignaciones = {};
    const sinAsignar = [];
    let nuevas = 0;

    (platillos || []).forEach(platillo => {
        const nombre = platillo?.name ?? platillo?.nombre;
        if (!nombre) return;

        // Respetar lo hecho a mano
        if (String(asignadas[nombre] || '').trim()) return;

        const { cocinera, motivo } = sugerirCocinera(nombre, platillo.tipo);
        if (cocinera) {
            asignaciones[nombre] = cocinera;
            nuevas += 1;
        } else {
            sinAsignar.push({ nombre, motivo });
        }
    });

    return { asignaciones, nuevas, sinAsignar };
};

/** Los nombres tal como se escriben en la hoja. */
export const NOMBRES_COCINERAS = COCINERAS.map(c => c.nombre);

/**
 * Puente con las categorías que ya usa la hoja de cocina (`guessCategory`), para
 * poder caer al tipo de componente cuando el nombre del plato no dice nada.
 */
export const TIPO_POR_CATEGORIA = {
    'Aves y Pescados': 'Proteína',
    'Res y Cerdo': 'Proteína',
    'Arroces y Vegetales': 'Vegetal',
    'Guarniciones y Tubérculos': 'Harina'
};
