/**
 * El arroz se cocina TODO JUNTO y despues se divide en los distintos arroces.
 *
 * "Necesito que por ejemplo el arroz todo se cocine junto y se divida en los
 * arroces" — Jan, sobre la hoja del miercoles 2 de setiembre de 2026.
 *
 * La hoja los listaba sueltos —blanco 6, frito 2, jardinero 5, cantones 5— y
 * quien cocina tenia que sumarlos de cabeza para saber cuanto arroz poner.
 * Ahora va el total arriba y el desglose debajo.
 *
 * Solo se agrupan los que se miden IGUAL: sumar tazas con gramos daria un
 * numero que no significa nada.
 */

/** "Arroz blanco" si, "Arroz con pollo" tambien; "Arrocito" no. */
export const esArroz = (nombre) => /^arroz\b/i.test(String(nombre || '').trim());

export const ETIQUETA_GRUPO_ARROZ = 'ARROZ — cocinar todo junto y dividir';

/**
 * Arma las filas de la tabla con el arroz agrupado.
 *
 * @param {Array} items       los renglones del granel
 * @param {Function} cantidad como leer la cantidad ya con merma de un renglon
 * @returns {Array} filas: { tipo: 'grupo' | 'hijo' | 'suelto', ... }
 */
export const agruparArroces = (items, cantidad = (i) => Number(i?.qty) || 0) => {
    const lista = Array.isArray(items) ? items : [];

    // Un solo arroz no necesita cabecera: seria un titulo con una linea debajo.
    const unidadDelGrupo = lista.find(esArrozAgrupable)?.unit;
    const arroces = lista.filter(i => esArrozAgrupable(i) && i.unit === unidadDelGrupo);
    if (arroces.length < 2) return lista.map(item => ({ tipo: 'suelto', item }));

    const total = arroces.reduce((acc, i) => acc + cantidad(i), 0);
    const filas = [];
    let yaPuesto = false;

    lista.forEach(item => {
        const enElGrupo = arroces.includes(item);
        if (!enElGrupo) { filas.push({ tipo: 'suelto', item }); return; }
        if (!yaPuesto) {
            // El grupo va donde aparecia el primer arroz, para no mover la hoja
            // de sitio respecto a lo que ya conoce quien cocina.
            filas.push({
                tipo: 'grupo',
                nombre: ETIQUETA_GRUPO_ARROZ,
                unit: unidadDelGrupo,
                total: Math.round(total * 100) / 100,
                cuantos: arroces.length
            });
            yaPuesto = true;
        }
        filas.push({ tipo: 'hijo', item });
    });

    return filas;
};

/** Se agrupa si es arroz y no se mide en gramos. */
function esArrozAgrupable(item) {
    return esArroz(item?.name) && item?.unit !== 'g';
}
