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

import { mapPackNameToMenuKey, esIndividualEnLaHoja } from './packClassification';
import { getScheduleFromOrder } from './orderDates';
import { listarSustituciones, textoSustitucion } from './productionHelpers';
import { textoLlevaCena } from './labels/labelDomain';

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
        // El MISMO criterio que usa la hoja al imprimir, no uno propio
        const esIndividual = esIndividualEnLaHoja(plan);
        const menuKey = mapPackNameToMenuKey(plan);

        resumen.platos += platos.length;
        if (esIndividual) resumen.individuales += 1;
        else resumen.packs += 1;
        // Los desayunos casi nunca son un pack aparte: viajan de regalía dentro
        // de otro pack. Contando solo `menuKey === 'desayuno'` el panel decía
        // "0 Desayunos" mientras la hoja imprimía ocho, y no había forma de
        // cuadrarlo contra el Excel.
        if (menuKey === 'desayuno' || p.incluyeDesayuno) resumen.desayunos += 1;

        // --- Cena y desayuno que la hoja rellena con un menú por defecto ---
        //
        // Cuando el menú de cena de la semana está vacío, la hoja NO se queda en
        // blanco: cae a DEFAULT_MENUS e imprime esos platos como si fueran los de
        // la semana. Las etiquetas, en cambio, se niegan a generarse a propósito.
        // Sin este aviso se cocina una cena que después no tiene etiqueta, con
        // platos que nadie configuró.
        const llevaCena = !esIndividual && textoLlevaCena(plan);
        if (llevaCena && menuKey) {
            const delCena = menus?.cena?.[menuKey];
            const listaCena = Array.isArray(delCena) ? delCena : delCena?.platos;
            if (!listaCena || listaCena.length === 0) {
                problemas.push({
                    gravedad: 'alta',
                    cliente,
                    que: `Lleva cena pero el menú de cena de "${menuKey}" está vacío: la hoja está mostrando el menú POR DEFECTO, no el de esta semana. Sus etiquetas de cena tampoco se generan.`,
                    comoSeArregla: 'Cargá el menú de cena de la semana en Menús → Cena.'
                });
            }
        }

        const llevaDesayuno = p.incluyeDesayuno || /desayun/i.test(plan);
        if (llevaDesayuno) {
            const delDesayuno = menus?.desayuno;
            const listaDesayuno = Array.isArray(delDesayuno) ? delDesayuno : delDesayuno?.platos;
            if (!listaDesayuno || listaDesayuno.length === 0) {
                problemas.push({
                    gravedad: 'alta',
                    cliente,
                    que: 'Lleva desayunos pero no hay Menú de Desayunos configurado esta semana. Sus etiquetas de desayuno NO se generan.',
                    comoSeArregla: 'Cargá el menú de desayunos de la semana en Menús → Desayuno.'
                });
            }
        }

        // --- Sustituciones que la cocción a granel NO refleja ---
        //
        // Las sustituciones se guardan bien, pero la hoja cocina el MENU OFICIAL
        // del pack: a granel se cuenta el plato original y del sustituto no se
        // cocina nada. Si no se avisa acá, se descubre al empacar, sin la
        // proteina que el cliente pidio.
        const sustituciones = listarSustituciones(p.rawPedido || p);
        if (sustituciones.length > 0) {
            const soloProteinas = sustituciones.every((x) => x.tipo === 'proteina' || x.tipo === 'plato');
            problemas.push({
                gravedad: soloProteinas ? 'media' : 'alta',
                cliente,
                que: soloProteinas
                    ? `Cambia platos: ${sustituciones.map(textoSustitucion).join(' · ')}. Ya está descontado del plato original y sumado al sustituto en la hoja de cocina.`
                    : `Cambia vegetales o carbos: ${sustituciones.map(textoSustitucion).join(' · ')}. Eso NO se cuenta a granel porque va en tazas.`,
                comoSeArregla: soloProteinas
                    ? 'Verificá al empacar que le llegue el plato que pidió, no el del menú.'
                    : 'Ajustá esas tazas a mano en la hoja de cocina.'
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
        // Este aviso pedía `guardadas <= 1`, y por eso NO vio el caso de Maripaz
        // Acevedo: su pedido tenía 2 fechas guardadas pero la hoja le calculaba
        // 4, y las dos inventadas la metieron en un sábado que no le tocaba.
        // Basta con que la hoja vea MÁS de las que hay guardadas.
        const guardadas = (p.rawPedido?.fechas_entrega || []).filter(Boolean).length;
        const queVe = getScheduleFromOrder(p.rawPedido || {}).length;
        if (queVe > 1 && queVe > guardadas) {
            const inventadas = queVe - guardadas;
            problemas.push({
                gravedad: 'alta',
                cliente,
                que: guardadas === 0
                    ? `Es de ${queVe} entregas pero el pedido no tiene ninguna guardada: la hoja las está calculando.`
                    : `Tiene ${guardadas} entregas guardadas pero la hoja le calcula ${queVe}: ${inventadas} son inventadas.`,
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
