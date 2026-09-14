/**
 * Los pedidos cuya comida YA está hecha.
 *
 * Se marcaba por FAMILIA —"hicieron todo el pack bajo calorías"— y eso se rompe
 * apenas entra un pedido nuevo. El 12 de setiembre de 2026 pasó justo eso: Gina
 * reportó lo cocinado, Jan metió los pedidos que faltaban DESPUÉS, y marcar la
 * familia entera habría sacado también a los nuevos. Esos clientes se quedaban
 * sin comida y la hoja no decía nada.
 *
 * Por eso se marca por PEDIDO. La familia sigue estando, pero solo como atajo:
 * marca de una vez todos los que hay en ese momento, y después se destildan los
 * que entraron después.
 *
 * Solo sale de la COCINA, nunca del EMPAQUE. La comida existe pero no está en
 * las bolsas: esos packs igual hay que armarlos.
 *
 * Se guarda en el navegador de quien arma la hoja: es un apunte de esta
 * hornada, no un dato del negocio.
 */

import { claveDePedido } from './tandasDeCocina';

const LLAVE = 'bikitchen.pedidosYaCocinados';

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

export { claveDePedido };

/** Quita de la lista los pedidos cuya comida ya está hecha. */
export const sinLosYaCocinados = (pedidos, cocinados) => {
    const marcados = new Set((cocinados || []).map(x => String(x).trim()).filter(Boolean));
    if (marcados.size === 0) return pedidos || [];
    return (pedidos || []).filter(p => !marcados.has(claveDePedido(p)));
};

/** Marca o desmarca un pedido. */
export const alternarCocinado = (cocinados, clave) => {
    const limpia = String(clave || '').trim();
    if (!limpia) return cocinados || [];
    const lista = cocinados || [];
    return lista.includes(limpia)
        ? lista.filter(x => x !== limpia)
        : [...lista, limpia];
};

/**
 * Marca o desmarca TODOS los pedidos de una lista.
 *
 * Es el atajo de la familia: si ya estaban todos marcados los quita, y si no,
 * los agrega. Después se destildan a mano los que entraron después.
 */
export const alternarVarios = (cocinados, claves) => {
    const limpias = (claves || []).map(x => String(x || '').trim()).filter(Boolean);
    if (limpias.length === 0) return cocinados || [];
    const lista = cocinados || [];
    const todosPuestos = limpias.every(k => lista.includes(k));
    return todosPuestos
        ? lista.filter(x => !limpias.includes(x))
        : [...new Set([...lista, ...limpias])];
};

/** Lee lo guardado. Si está corrupto se arranca de cero sin tumbar la hoja. */
export const leerPedidosCocinados = (ciclo = '') => {
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
export const guardarPedidosCocinados = (cocinados, ciclo = '') => {
    try {
        window.localStorage.setItem(llaveDelCiclo(ciclo), JSON.stringify(cocinados || []));
    } catch {
        // Sin guardar: vale para esta sesión y ya
    }
};
