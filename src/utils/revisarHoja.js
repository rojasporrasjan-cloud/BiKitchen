/**
 * Revisión de la hoja antes de imprimirla.
 *
 * La hoja no avisa cuando un pedido sale mal: sale una tabla vacía, o un cliente
 * sin platos, y en cocina nadie se entera hasta que falta comida. Esto recorre
 * lo que se va a imprimir y dice qué está incompleto ANTES de mandarlo a papel.
 *
 * Es función pura: entran los pedidos ya filtrados por fecha y el menú oficial,
 * sale la lista de problemas. Sin Firebase, sin React.
 */

import { mapPackNameToMenuKey, isIndividualPack } from './packClassification';
import { getScheduleFromOrder } from './orderDates';

const nombrePlan = (pedido) => pedido?.plan || pedido?.tipoMenu || '';

/**
 * @param {object[]} pedidos - los ya mapeados con mapPedidosFromLegacy, con su rawPedido
 * @param {object} menus - menú oficial (getOfficialMenus)
 * @param {string} fecha - AAAA-MM-DD que se está imprimiendo
 */
export const revisarHoja = (pedidos = [], menus = null, fecha = '') => {
    const problemas = [];
    const resumen = { total: pedidos.length, packs: 0, individuales: 0, desayunos: 0, platos: 0 };

    pedidos.forEach((p) => {
        const plan = nombrePlan(p);
        const cliente = p.cliente || 'Sin nombre';
        const platos = p.platos || [];
        const esIndividual = isIndividualPack(plan);
        const menuKey = mapPackNameToMenuKey(plan);

        resumen.platos += platos.length;
        if (esIndividual) resumen.individuales += 1;
        else resumen.packs += 1;
        if (menuKey === 'desayuno') resumen.desayunos += 1;

        // --- Un pack sin menú imprime una tabla vacía ---
        if (!esIndividual && !menuKey) {
            problemas.push({
                gravedad: 'alta',
                cliente,
                que: `El pack "${plan}" no corresponde a ningún Menú Semanal.`,
                comoSeArregla: 'Corregí el nombre del pack en el pedido, o marcalo como individuales.'
            });
        }

        // --- Un pack cuyo menú existe pero está vacío ---
        if (!esIndividual && menuKey) {
            const delMenu = menus?.[menuKey];
            const listaMenu = Array.isArray(delMenu) ? delMenu : delMenu?.platos;
            if (!listaMenu || listaMenu.length === 0) {
                problemas.push({
                    gravedad: 'alta',
                    cliente,
                    que: `El Menú Semanal de "${menuKey}" está vacío, así que este pack sale sin platos.`,
                    comoSeArregla: 'Cargá el menú de la semana en Menús.'
                });
            }
        }

        // --- Un individual sin platos escritos no imprime nada ---
        if (esIndividual && platos.length === 0) {
            problemas.push({
                gravedad: 'alta',
                cliente,
                que: 'Es de platos sueltos pero el pedido no dice cuáles.',
                comoSeArregla: 'Abrí el pedido y escribí los platos, o volvé a importarlo.'
            });
        }

        // --- Las fechas se están adivinando, no leyendo ---
        //
        // Cuando el pedido no trae `fechas_entrega`, getScheduleFromOrder las
        // calcula sumando semanas a la fecha base. Eso funciona, pero si el
        // cliente pidió días salteados las fechas inventadas no son las suyas.
        const guardadas = (p.rawPedido?.fechas_entrega || []).filter(Boolean).length;
        const queVe = getScheduleFromOrder(p.rawPedido || {}).length;
        if (queVe > 1 && guardadas <= 1) {
            problemas.push({
                gravedad: 'alta',
                cliente,
                que: `Es de ${queVe} entregas pero el pedido no las tiene guardadas: la hoja las está calculando.`,
                comoSeArregla: 'Abrí el pedido y confirmá las fechas reales de entrega.'
            });
        }

        // --- Datos que necesita el repartidor ---
        if (!p.telefono) {
            problemas.push({
                gravedad: 'media',
                cliente,
                que: 'No tiene teléfono.',
                comoSeArregla: 'Agregalo en el pedido: el repartidor lo necesita.'
            });
        }
        const zona = p.rawPedido?.zona_envio || '';
        if (!zona || zona === 'No especificada') {
            problemas.push({
                gravedad: 'media',
                cliente,
                que: 'No tiene zona de entrega.',
                comoSeArregla: 'Agregá la zona para que entre bien en la ruta.'
            });
        }
    });

    return {
        fecha,
        resumen,
        problemas,
        graves: problemas.filter((p) => p.gravedad === 'alta').length
    };
};
