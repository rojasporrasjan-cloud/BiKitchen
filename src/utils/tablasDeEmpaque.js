/**
 * Las tablas de empaque de la hoja, como filas y nada más.
 *
 * "necesito que la hoja de excel se vea igual a como sale en produccion […]
 *  como se divide nuestra hoja actual por tandas sin cambios con cambios etc"
 *  — Jan, 10 de setiembre de 2026.
 *
 * Hasta hoy la pantalla y el Excel armaban su tabla cada uno por su lado. La
 * pantalla la parte por TANDA, por familia, por día de entrega y por si el pack
 * lleva cambio o no; el Excel sacaba una lista de un cliente por fila, que es
 * otra hoja distinta. Cuando dos salidas calculan lo mismo por separado,
 * terminan diciendo cosas distintas y nadie se da cuenta hasta que la cocina
 * hace de más o de menos: ya pasó con los desayunos (4 en pantalla, 27 en el
 * Excel) y con el orden de las tandas.
 *
 * Por eso acá no se decide NADA de negocio. Este módulo solo acomoda en filas lo
 * que le dan, con las celdas unidas donde van unidas. La pantalla lo dibuja en
 * HTML y el Excel lo escribe en celdas; si algún día cambia el formato, cambia
 * en un solo lugar para los dos.
 */

/** Las columnas, en orden. Las mismas en pantalla y en Excel. */
export const COLUMNAS_DE_EMPAQUE = [
    '# de Plato', 'Descripcion', 'Cantidad', 'Platos', 'Especificaciones', 'Cliente'
];

/**
 * Cuántas filas ocupa un plato.
 *
 * Siempre la proteína; los vegetales y el carbohidrato según el pack. El Paquete
 * Deluxe no lleva vegetales y el Sin Carbos no lleva harina, y si se dibujaran
 * igual quedarían dos renglones vacíos por plato que quien empaca tiene que
 * saltar.
 */
export const filasPorPlato = (conVegetales, conCarbos) =>
    1 + (conVegetales ? 1 : 0) + (conCarbos ? 1 : 0);

/** Texto de una celda que no tiene nada. */
const vacio = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * Las filas de una tabla de empaque.
 *
 * Las dos últimas columnas —Especificaciones y Cliente— se llenan de dos formas
 * distintas según la tabla, y esa es toda la diferencia entre las variantes:
 *
 *   - `celdasPorFila`: un cliente por RENGLÓN, corrido, sin relación con el
 *     plato de al lado. Es la tabla amarilla de los que van tal cual: la lista
 *     de platos y la de clientes son dos columnas independientes que casualmente
 *     comparten la tabla. (Confundir esto fue lo que me hizo ver duplicados y
 *     clientes faltantes que no existían: el `rowSpan` hacía que la columna 6 no
 *     estuviera donde yo la buscaba.)
 *
 *   - `celdasPorPlato`: la celda se une a lo alto de todo el plato. Es la tabla
 *     de un cambio compartido y la de menú propio, donde los clientes van todos
 *     juntos en una sola celda porque el cambio es el mismo para todos.
 *
 * @param {object}  opciones
 * @param {Array}   opciones.platos          [{numero, partes:[{nombre, cantidad, resaltada}], total}]
 * @param {Array}   [opciones.celdasPorFila] [{especificaciones, cliente}] por renglón
 * @param {Array}   [opciones.celdasPorPlato][{especificaciones, cliente}] por plato
 * @param {Array}   [opciones.sobrantes]     clientes que no cupieron: [{especificaciones, cliente}]
 * @returns {Array} filas listas para dibujar
 */
export const filasDeTablaDeEmpaque = ({
    platos = [],
    celdasPorFila = null,
    celdasPorPlato = null,
    sobrantes = []
} = {}) => {
    const filas = [];

    (platos || []).forEach((plato, iPlato) => {
        const partes = (plato?.partes || []).filter(Boolean);
        const alto = partes.length || 1;

        partes.forEach((parte, iParte) => {
            const primera = iParte === 0;
            // El renglón ABSOLUTO dentro de la tabla, que es como se reparten
            // los clientes: el cliente 7 va en el renglón 7 aunque ese renglón
            // sea el vegetal del plato 3.
            const renglon = iPlato * alto + iParte;

            const deFila = celdasPorFila ? (celdasPorFila[renglon] || null) : null;
            const dePlato = celdasPorPlato ? (celdasPorPlato[iPlato] || null) : null;
            const celda = celdasPorPlato ? dePlato : deFila;

            filas.push({
                // `null` quiere decir "esta celda viene de la de arriba": en
                // pantalla es un rowSpan y en Excel una celda combinada.
                plato: primera ? `Plato ${plato.numero}` : null,
                descripcion: vacio(parte.nombre),
                cantidad: vacio(parte.cantidad),
                platos: primera ? vacio(plato.total) : null,
                resaltada: !!parte.resaltada,

                // Cuando van por plato, solo la primera fila las escribe.
                especificaciones: celdasPorPlato
                    ? (primera ? vacio(celda?.especificaciones) : null)
                    : vacio(celda?.especificaciones),
                cliente: celdasPorPlato
                    ? (primera ? vacio(celda?.cliente) : null)
                    : vacio(celda?.cliente),

                alto: primera ? alto : 0
            });
        });
    });

    // Los que no cupieron.
    //
    // Si una familia tiene más clientes que renglones de plato —14 packs contra
    // 5 platos de 3 renglones— los últimos se quedaban fuera de la tabla, y un
    // cliente que no aparece es una bolsa que no se arma. Salen al final con
    // guion en la descripción para que se vea que no son un plato.
    (sobrantes || []).forEach((c) => {
        filas.push({
            plato: '',
            descripcion: '—',
            cantidad: '',
            platos: '',
            resaltada: false,
            especificaciones: vacio(c?.especificaciones),
            cliente: vacio(c?.cliente),
            alto: 1
        });
    });

    return filas;
};

/**
 * Los clientes que no caben en la tabla.
 *
 * @param {Array} clientes
 * @param {number} platos     cuántos platos tiene el pack
 * @param {number} porPlato   cuántas filas ocupa cada plato
 */
export const clientesQueNoCaben = (clientes = [], platos = 0, porPlato = 1) => {
    const caben = (Number(platos) || 0) * (Number(porPlato) || 1);
    return (clientes || []).slice(caben);
};

/**
 * El título de la barra amarilla.
 *
 * Es el mismo texto que se lee en pantalla, y por eso se arma acá: si el Excel
 * lo escribiera a su manera, las pestañas no se podrían cotejar con la hoja
 * impresa aunque los números coincidieran.
 *
 * @param {object} t
 * @param {number} t.tanda     el puesto de la familia, ya en base 1
 * @param {string} t.familia   el nombre del pack
 * @param {string} [t.variante] '' | 'CON CAMBIO' | 'MENÚ PROPIO'
 * @param {string} [t.dia]     'SÁB 12', 'LUN 14'… vacío si la hoja es de un día
 * @param {number} t.packs     los packs de ESTA tabla
 * @param {number} [t.enLaFamilia] el total de la familia, si es distinto
 */
export const tituloDeTablaDeEmpaque = ({
    tanda, familia, variante = '', dia = '', packs = 0, enLaFamilia = null
} = {}) => {
    const partes = [`TANDA ${tanda}`, familia];
    if (variante) partes.push(variante);
    if (dia) partes.push(dia);

    const suyos = `${packs} ${packs === 1 ? 'pack' : 'packs'}`;
    // El número que manda el ORDEN va primero. Con el de la tabla adelante la
    // hoja se lee "4 packs, 3 packs, 4 packs" y parece desordenada; con el de la
    // familia adelante se lee de mayor a menor, que es como se cocina.
    const cuenta = (enLaFamilia !== null && enLaFamilia !== packs)
        ? `(${enLaFamilia} en la familia · aquí van ${suyos})`
        : `(${suyos})`;

    return `${partes.join('  —  ')} ${cuenta}`.toUpperCase();
};
