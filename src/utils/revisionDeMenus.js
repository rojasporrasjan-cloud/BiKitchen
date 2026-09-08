/**
 * Revisar EL MENU, no solo los pedidos.
 *
 * El 8 de setiembre de 2026 la hoja salio con los pedidos perfectos y el menu
 * equivocado, y eso es igual de caro: se cocina lo que no era. Gina lo encontro
 * a mano y tuvo que rehacer la hoja con su prima.
 *
 *   "El segundo menu me puso el menu de la semana pasada, no puso el de esta
 *    semana. En el menu sin carbos puso las proteinas del pack vegetariano."
 *
 * Las dos cosas estaban a la vista en la hoja y nadie —ni el sistema ni yo— las
 * cuestiono: el Sin Carbos salio con cinco "Carne de soya" y las cenas con un
 * menu que ya nadie iba a comer.
 *
 * Igual que el resto del revisor: NO TOCA NADA, solo mira y avisa.
 */

/** El nombre del plato, venga como objeto o como texto. */
const nombreDe = (x) => String(x?.nombre ?? x ?? '').trim();

const limpio = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Las proteinas de un menu, en orden. */
export const proteinasDe = (platos = []) => (platos || [])
    .map(p => nombreDe(p?.proteina))
    .filter(Boolean);

/** Soya, tofu, garbanzo: proteina vegetariana. */
export const esProteinaVegetariana = (nombre) =>
    /\b(soya|soja|tofu|garbanzo|lentejas?|seitan|vegetariana?)\b/i.test(limpio(nombre));

/**
 * Un pack que NO es vegetariano pero trae solo proteina vegetariana.
 *
 * Es lo que paso con el Sin Carbos: alguien le copio encima el menu del pack
 * vegetariano y salieron cinco carnes de soya. Quien lo pago esperaba pollo.
 */
export const packsConProteinaEquivocada = (menus = {}, vegetarianos = ['vegetariano', 'desayunoVegetariano']) => {
    const avisos = [];
    Object.keys(menus || {}).forEach(clave => {
        if (vegetarianos.includes(clave)) return;
        const platos = menus[clave];
        if (!Array.isArray(platos) || platos.length === 0) return;

        const prots = proteinasDe(platos);
        if (prots.length === 0) return;
        if (!prots.every(esProteinaVegetariana)) return;

        avisos.push({
            tipo: 'proteina-vegetariana',
            gravedad: 'alta',
            cliente: `Menú ${clave}`,
            que: `Todas las proteínas de "${clave}" son vegetarianas (${prots[0]}…), `
                + 'y ese pack no es vegetariano. Parece que le copiaron encima el menú del pack vegetariano.',
            comoSeArregla: `Corregí el menú de ${clave} en Menús antes de cocinar.`
        });
    });
    return avisos;
};

/**
 * Un menu que no se toco esta semana.
 *
 * "El segundo menu me puso el de la semana pasada". No hay historial de menus
 * para comparar contra el anterior, pero si hay fecha de ultima modificacion:
 * si el menu es mas viejo que la entrega que se va a cocinar, o nadie lo
 * actualizo, o se actualizo solo una parte.
 *
 * @param {object} meta  el `meta` del documento de menus
 * @param {string} fecha  la fecha de entrega de la hoja (ISO)
 * @param {number} dias  cuantos dias de antiguedad ya son sospechosos
 */
export const menuSinActualizar = (meta, fecha, dias = 7) => {
    if (!fecha) return [];
    const ms = Number(meta?.lastModifiedTimestamp)
        || (Number(meta?.lastModifiedAt?.seconds) * 1000)
        || 0;
    if (!ms) return [];

    const entrega = new Date(`${fecha}T12:00:00`);
    if (Number.isNaN(entrega.getTime())) return [];

    const antiguedad = Math.floor((entrega - ms) / 86400000);
    if (antiguedad < dias) return [];

    const cuando = new Date(ms).toISOString().slice(0, 10);
    return [{
        tipo: 'menu-viejo',
        gravedad: 'alta',
        cliente: 'Menú de la semana',
        que: `El menú no se toca desde el ${cuando} — ${antiguedad} días antes de esta entrega. `
            + 'Puede estar saliendo el menú de la semana pasada.',
        comoSeArregla: 'Revisá en Menús que estén cargados el menú de almuerzo Y el de cena de esta semana.'
    }];
};

/**
 * Todas las revisiones del menu, con la forma que ya usa el panel de la hoja.
 *
 * @param {object} datos
 * @param {object} datos.menus  el documento menus_oficial/current
 * @param {string} datos.fecha  la fecha de entrega de la hoja
 */
export const problemasDelMenu = ({ menus = null, fecha = null } = {}) => {
    if (!menus) return [];
    return [
        ...packsConProteinaEquivocada(menus),
        ...menuSinActualizar(menus.meta, fecha)
    ];
};
