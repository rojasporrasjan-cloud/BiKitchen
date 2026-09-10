/**
 * Cortar la tira de etiquetas en ROLLOS.
 *
 * Un rollo trae ~220 etiquetas y no avisa cuando se acaba: simplemente deja de
 * salir papel a la mitad de un nombre. En un dia de cuarenta packs la tira pasa
 * de las seiscientas, asi que hay que sacarlas de rollo en rollo y saber
 * exactamente donde se quedo uno para seguir con el siguiente.
 *
 * "Cada rollo trae doscientos veinte etiquetas, entonces tengo que sacar de
 * doscientos veinte en doscientos veinte... y que se acuerde en el sistema para
 * sacar las que me quedan" — Jan, 7 de setiembre de 2026.
 *
 * LO QUE SE CUENTA ES PAPEL, NO COMIDA. Los divisores tambien salen impresos y
 * tambien gastan etiqueta, asi que cuentan para el corte. Para anotar lo hecho
 * existe `contarPorGrupo`, que si los ignora porque no son platos.
 *
 * Esto NO lleva la cuenta de lo impreso: de eso se encarga `etiquetasImpresas`.
 * Aqui solo se parte lo que ya se decidio imprimir.
 */

/** Lo que trae un rollo. Se puede cambiar en pantalla: no todos vienen iguales. */
export const ETIQUETAS_POR_ROLLO = 220;

/** Un tamano de rollo utilizable, aunque venga vacio o en texto. */
export const tamanoValido = (valor) => {
    const n = Math.floor(Number(valor));
    if (!Number.isFinite(n) || n < 1) return ETIQUETAS_POR_ROLLO;
    return Math.min(n, 5000);
};

/**
 * La tira partida en rollos.
 *
 * @param {Array} labels  la tira completa, divisores incluidos
 * @param {number} tamano  cuantas caben en un rollo
 * @returns {Array<Array>} un arreglo por rollo, en orden
 */
export const cortarPorRollo = (labels, tamano = ETIQUETAS_POR_ROLLO) => {
    const lista = Array.isArray(labels) ? labels : [];
    const paso = tamanoValido(tamano);
    const rollos = [];
    for (let i = 0; i < lista.length; i += paso) rollos.push(lista.slice(i, i + paso));
    return rollos;
};

/**
 * El plan completo: cuantos rollos y de cuanto cada uno.
 *
 * Sirve para decirlo ANTES de mandar nada. Ver "3 rollos: 220 + 220 + 200"
 * evita la sorpresa de quedarse sin papel a la mitad del segundo.
 *
 * @returns {{total, tamano, rollos, cortes: number[], ultimoParcial: boolean}}
 */
export const planDeRollos = (total, tamano = ETIQUETAS_POR_ROLLO) => {
    const n = Math.max(0, Math.floor(Number(total)) || 0);
    const paso = tamanoValido(tamano);
    const rollos = Math.ceil(n / paso);

    const cortes = [];
    for (let i = 0; i < rollos; i += 1) cortes.push(Math.min(paso, n - i * paso));

    return {
        total: n,
        tamano: paso,
        rollos,
        cortes,
        ultimoParcial: rollos > 0 && cortes[rollos - 1] < paso
    };
};

/**
 * El proximo rollo a imprimir, ya recortado.
 *
 * Se le pasa la tira de lo que FALTA —la que sale de `gruposQueFaltan`— asi que
 * el "proximo" siempre son las primeras del pendiente. No hay que llevar un
 * numero de rollo aparte: lo que ya salio esta anotado y no vuelve a aparecer.
 */
export const proximoRollo = (labels, tamano = ETIQUETAS_POR_ROLLO) =>
    (Array.isArray(labels) ? labels : []).slice(0, tamanoValido(tamano));
