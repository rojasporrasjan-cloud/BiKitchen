/**
 * Los packs que YA se empacaron, para no empacarlos dos veces.
 *
 * La cocina tiene su registro —`tandas_cocina`— pero el empaque no tenía
 * ninguno. Así que los packs del lunes que se alistan por adelantado el viernes
 * volvían a salir completos en la hoja del sábado, y había que tacharlos a mano.
 *
 * Se descuenta por PEDIDO, no por cantidad, igual que la cocina. Guardar "el
 * pedido de Ana ya se empacó" aguanta lo que pasa de verdad —que se cancele,
 * que cambie de cantidad, que se corrija— sin que quede un número descuadrado
 * arrastrándose de una hoja a la otra. Si un cliente quedó a medias, lo correcto
 * es NO marcarlo y anotar en la nota cuántos le faltan: es preferible empacar de
 * más y devolver, que mandar a alguien sin su comida.
 *
 * Se guarda en el navegador de quien arma la hoja. No toca pedidos ni nada de
 * Firestore: es un apunte de trabajo de esta hornada, no un dato del negocio.
 */

const LLAVE = 'bikitchen.packsYaEmpacados';

/**
 * La llave del navegador, POR CICLO de producción.
 *
 * Antes era una sola llave para siempre, y un pack MENSUAL tiene el mismo
 * número de orden las cuatro semanas: marcado como empacado el viernes 11 de
 * setiembre, seguía marcado el viernes 18 y ese cliente desaparecía de la hoja
 * —del empaque y de la cocina— sin ningún aviso. Con el ciclo en la llave, cada
 * sábado + lunes arranca limpio.
 */
const llaveDelCiclo = (ciclo) => (ciclo ? `${LLAVE}::${ciclo}` : LLAVE);

/** La llave de un pedido. La MISMA que usa la tanda de cocina. */
export const claveDeEmpacado = (pedido) =>
    String(pedido?.rawPedido?.numeroOrden || pedido?.numeroOrden || pedido?.id || '').trim();

/**
 * Quita de la lista los pedidos que ya se empacaron.
 *
 * @param {Array} pedidos
 * @param {Array<string>} empacados  claves de pedido
 */
export const sinLosYaEmpacados = (pedidos, empacados) => {
    const marcados = new Set((empacados || []).map(x => String(x).trim()).filter(Boolean));
    if (marcados.size === 0) return pedidos || [];
    return (pedidos || []).filter(p => !marcados.has(claveDeEmpacado(p)));
};

/** Los que sí se empacaron, para poder mostrarlos aparte. */
export const losYaEmpacados = (pedidos, empacados) => {
    const marcados = new Set((empacados || []).map(x => String(x).trim()).filter(Boolean));
    if (marcados.size === 0) return [];
    return (pedidos || []).filter(p => marcados.has(claveDeEmpacado(p)));
};

/** Marca o desmarca un pedido. */
export const alternarEmpacado = (empacados, clave) => {
    const limpia = String(clave || '').trim();
    if (!limpia) return empacados || [];
    const lista = empacados || [];
    return lista.includes(limpia)
        ? lista.filter(x => x !== limpia)
        : [...lista, limpia];
};

/**
 * Si en este ciclo alguien ya marco o desmarco algo.
 *
 * Mientras no, la hoja del sabado da por empacados los bajo calorias del lunes
 * —que es lo que se hace todos los viernes— en vez de ninguno. Una lista vacia
 * GUARDADA si cuenta como decision: quiere decir que el viernes no se adelanto.
 */
export const hayEmpacadosGuardados = (ciclo = '') => {
    try {
        return window.localStorage.getItem(llaveDelCiclo(ciclo)) !== null;
    } catch {
        return false;
    }
};

/** Lee lo guardado. Si está corrupto se arranca de cero sin tumbar la hoja. */
export const leerEmpacados = (ciclo = '') => {
    try {
        const crudo = window.localStorage.getItem(llaveDelCiclo(ciclo));
        if (!crudo) return [];
        const datos = JSON.parse(crudo);
        return Array.isArray(datos) ? datos.filter(x => typeof x === 'string' && x.trim()) : [];
    } catch {
        return [];
    }
};

/** Guarda. Si el navegador no deja, la hoja sigue funcionando. */
export const guardarEmpacados = (empacados, ciclo = '') => {
    try {
        window.localStorage.setItem(llaveDelCiclo(ciclo), JSON.stringify(empacados || []));
    } catch {
        // Sin guardar: vale para esta sesión y ya
    }
};
