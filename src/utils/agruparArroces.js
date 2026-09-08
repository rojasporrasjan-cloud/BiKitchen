/**
 * Preparaciones que se cocinan TODO JUNTO y despues se dividen.
 *
 * "Necesito que por ejemplo el arroz todo se cocine junto y se divida en los
 * arroces" — Jan, sobre la hoja del miercoles 2 de setiembre de 2026.
 *
 * La hoja los listaba sueltos —blanco 6, frito 2, jardinero 5, cantones 5— y
 * quien cocina tenia que sumarlos de cabeza para saber cuanto arroz poner.
 * Ahora va el total arriba y el desglose debajo.
 *
 * Lo mismo pasa con otras cosas. "Los zucchinis son diferentes pero se puede
 * preparar muchos zucchinis de un solo y solo dividirlo, igual con varias
 * cosas" — Jan, 3 de setiembre. Son platos DISTINTOS —unos llevan hongos y
 * cebolla caramelizada, otros van a la parmesana, otros salteados a secas— pero
 * el zuchinni se corta y se saltea una sola vez.
 *
 * Ojo con la diferencia: esto NO es decir que sean el mismo plato. Fusionarlos
 * seria darle hongos a quien no los pidio. Es una sola OLLA con varios destinos,
 * que es justo lo que la cocina necesita saber.
 *
 * Solo se agrupan los que se miden IGUAL: sumar tazas con gramos daria un
 * numero que no significa nada.
 */

/**
 * Las familias que comparten olla.
 *
 * La clave es la primera palabra del plato. Agregar una familia es agregar una
 * linea, pero conviene preguntarle a Gina antes: si dos cosas NO se cocinan
 * juntas, juntarlas en la hoja le pide una olla que no existe.
 */
/**
 * `arroz` y `arros` cuentan igual.
 *
 * En el menu esta escrito de las dos formas —"Arros con maiz dulce" con S es lo
 * que manda Gina cada semana— y por esa sola letra el renglon se quedaba fuera
 * de la olla: 12 tazas del sabado y 36 sumando el lunes cocinandose aparte,
 * cuando todos los arroces salen del mismo arroz blanco.
 */
export const FAMILIAS = [
    { base: /^arro[sz]\b/i, etiqueta: 'ARROZ — cocinar todo junto y dividir' },
    { base: /^zuchinnis?\b/i, etiqueta: 'ZUCHINNI — saltear todo junto y dividir' }
];

/** "Arroz blanco" si, "Arros con maiz dulce" tambien; "Arrocito" no. */
export const esArroz = (nombre) => /^arro[sz]\b/i.test(String(nombre || '').trim());

export const ETIQUETA_GRUPO_ARROZ = FAMILIAS[0].etiqueta;

/** A que familia pertenece un plato, si a alguna. */
export const familiaDe = (nombre) =>
    FAMILIAS.find(f => f.base.test(String(nombre || '').trim())) || null;

/**
 * Arma las filas de la tabla con las familias agrupadas.
 *
 * @param {Array} items       los renglones del granel
 * @param {Function} cantidad como leer la cantidad ya con merma de un renglon
 * @returns {Array} filas: { tipo: 'grupo' | 'hijo' | 'suelto', ... }
 */
export const agruparArroces = (items, cantidad = (i) => Number(i?.qty) || 0) => {
    const lista = Array.isArray(items) ? items : [];

    // Que familias tienen DOS o mas platos en esta hoja. Una sola no necesita
    // cabecera: seria un titulo con una linea debajo.
    const grupos = [];
    FAMILIAS.forEach(familia => {
        const candidatos = lista.filter(i => agrupable(i, familia));
        if (candidatos.length === 0) return;
        // Todos los de una olla tienen que medirse igual
        const unidad = candidatos[0].unit;
        const mismos = candidatos.filter(i => i.unit === unidad);
        if (mismos.length < 2) return;
        grupos.push({
            familia,
            unidad,
            miembros: mismos,
            total: mismos.reduce((acc, i) => acc + cantidad(i), 0)
        });
    });

    if (grupos.length === 0) return lista.map(item => ({ tipo: 'suelto', item }));

    const puestos = new Set();
    const filas = [];

    lista.forEach(item => {
        const grupo = grupos.find(g => g.miembros.includes(item));
        if (!grupo) { filas.push({ tipo: 'suelto', item }); return; }
        if (!puestos.has(grupo)) {
            // El grupo va donde aparecia su primer plato, para no mover la hoja
            // de sitio respecto a lo que ya conoce quien cocina.
            filas.push({
                tipo: 'grupo',
                nombre: grupo.familia.etiqueta,
                unit: grupo.unidad,
                total: Math.round(grupo.total * 100) / 100,
                cuantos: grupo.miembros.length
            });
            puestos.add(grupo);
        }
        filas.push({ tipo: 'hijo', item });
    });

    return filas;
};

/** Se agrupa si es de la familia y no se mide en gramos. */
function agrupable(item, familia) {
    return !!item?.name && familia.base.test(String(item.name).trim()) && item?.unit !== 'g';
}
