/**
 * Las proteínas de CADA entrega de un pack de proteínas.
 *
 * "hay gente que pide packs mensuales de proteínas, y esas proteínas cambian
 *  todas las semanas […] ocupamos algo donde yo pueda elegir las proteínas"
 *  — Jan, 14 de setiembre de 2026.
 *
 * Un pack mensual de proteínas se paga una vez y se entrega cuatro, pero el
 * pedido guardaba UNA sola lista de proteínas —la de la compra— y la hoja la
 * repetía las cuatro semanas. Cuando el cliente pedía otras, no había dónde
 * escribirlas: se hacía un pedido de individuales aparte (el de Alejandra
 * Calderón existía para el 7 y no para el 14) o se editaba la lista del pedido,
 * y entonces se perdía la de las semanas anteriores.
 *
 * Ahora cada entrega puede tener su lista, en el pedido:
 *
 *     proteinasPorEntrega: {
 *       '2026-09-14': ['Tilapia empanizada', 'Pollo caribeño', …],
 *       '2026-09-21': [...]
 *     }
 *
 * La lista de la compra (`items[i].proteinas`) NO se toca: sigue siendo la de
 * respaldo para las semanas en las que no se eligió nada.
 *
 * Todas las pantallas que arman comida desde los pedidos —la hoja de
 * producción, las etiquetas, la hoja de despacho— pasan por
 * `mapPedidosFromLegacy`, y ahí se aplica `conProteinasDeLaEntrega`. Así la
 * cocina, la etiqueta y el empaque leen la misma lista para la misma fecha.
 */

import { getScheduleFromOrder } from './orderDates';
import { mapPackNameToMenuKey } from './packClassification';

const texto = (v) => String(v ?? '').trim();

/** El nombre por el que se reconoce el pack: el del plan o el del primer ítem. */
const nombreDelPack = (pedido) => {
    const lista = Array.isArray(pedido?.items) && pedido.items.length ? pedido.items : (pedido?.menu || []);
    return [pedido?.plan, pedido?.tipoMenu, ...(lista || []).map(it => it?.nombre || it?.name)]
        .map(texto)
        .filter(Boolean);
};

/**
 * ¿Es un pack de proteínas sueltas —no un pack de una familia del menú—?
 *
 * Tiene que decir "proteínas" en PLURAL. "Pack Mensual Bajo en Calorías (200 g
 * de proteína)" es un bajo en calorías con la porción agrandada: sus platos
 * salen del menú de la semana, no de una lista del cliente.
 */
export const esPackDeProteinas = (pedido) => {
    const nombres = nombreDelPack(pedido);
    const conPlural = nombres.find(n => /prote[ií]nas\b/i.test(n));
    if (!conPlural) return false;
    return !mapPackNameToMenuKey(conPlural);
};

/** Dónde vive la lista: `menu` en los pedidos viejos, `items` en los nuevos. */
const campoDeLaLista = (pedido) => {
    const trae = (l) => Array.isArray(l) && l.some(it => Array.isArray(it?.proteinas) && it.proteinas.length > 0);
    if (trae(pedido?.menu)) return 'menu';
    if (trae(pedido?.items)) return 'items';
    return Array.isArray(pedido?.items) && pedido.items.length ? 'items'
        : (Array.isArray(pedido?.menu) && pedido.menu.length ? 'menu' : 'items');
};

/** La lista de la compra, la de respaldo. */
export const listaDeLaCompra = (pedido) => {
    const lista = pedido?.[campoDeLaLista(pedido)] || [];
    const item = lista.find(it => Array.isArray(it?.proteinas) && it.proteinas.length > 0);
    return item ? item.proteinas.map(texto).filter(Boolean) : [];
};

/**
 * Cuántas proteínas lleva cada entrega.
 *
 * El número casi siempre está en el nombre ("Pack 5 Proteínas", "Pack
 * Proteínas 3 de 250g"). A veces solo en la nota: "Pack Mensual Proteínas
 * 250 g" de Alejandra dice "Pack mensual de 5 proteinas" en observaciones.
 */
export const cuantasProteinas = (pedido) => {
    for (const n of nombreDelPack(pedido)) {
        const m = n.match(/(\d+)\s*prote[ií]nas/i) || n.match(/prote[ií]nas\s*(\d+)\s*de\b/i);
        if (m && Number(m[1]) > 0 && Number(m[1]) <= 20) return Number(m[1]);
    }
    const enNota = texto(pedido?.observaciones).match(/(\d+)\s*prote[ií]nas/i);
    if (enNota && Number(enNota[1]) > 0 && Number(enNota[1]) <= 20) return Number(enNota[1]);
    const compra = listaDeLaCompra(pedido).length;
    return compra > 0 ? compra : 5;
};

/** "250 g", "500 g" — lo que pesa cada porción, tal como lo dice el pack. */
export const gramosDelPack = (pedido) => {
    for (const n of nombreDelPack(pedido)) {
        const m = n.match(/(\d{2,4})\s*(g|gr|gramos)\b/i);
        if (m) return `${Number(m[1])} g`;
    }
    return '';
};

/** Las entregas del pedido, en orden. */
export const entregasDelPedido = (pedido) => [...new Set((getScheduleFromOrder(pedido) || []).filter(Boolean))].sort();

/** La lista elegida para una fecha, o null si para esa fecha no se eligió nada. */
export const elegidasPara = (pedido, fecha) => {
    const lista = pedido?.proteinasPorEntrega?.[fecha];
    return Array.isArray(lista) && lista.some(x => texto(x)) ? lista.map(texto).filter(Boolean) : null;
};

/**
 * ¿Qué lista le toca a una entrega y de dónde sale?
 *
 * - `elegida`: se eligió para esa fecha.
 * - `compra`: la de la compra. Solo cuenta como buena en la PRIMERA entrega, o
 *   en un pack de una sola entrega: es lo que el cliente pidió al comprar.
 * - `falta`: de la segunda entrega en adelante sin elegir. La hoja usa la de la
 *   compra para no dejar al cliente sin comida, pero avisa: casi seguro no es
 *   lo que quiere esta semana.
 */
export const estadoDeLaEntrega = (pedido, fecha) => {
    const elegida = elegidasPara(pedido, fecha);
    if (elegida) return { lista: elegida, origen: 'elegida' };
    const entregas = entregasDelPedido(pedido);
    const compra = listaDeLaCompra(pedido);
    const esLaPrimera = entregas.length <= 1 || entregas[0] === fecha;
    if (esLaPrimera && compra.length > 0) return { lista: compra, origen: 'compra' };
    return { lista: compra, origen: 'falta' };
};

/**
 * El pedido con la lista de ESTA entrega puesta donde la hoja la lee.
 *
 * Devuelve el mismo objeto si no hay nada que cambiar, y una COPIA si lo hay:
 * nunca se modifica el pedido que viene de Firestore.
 *
 * @param {object} pedido
 * @param {string[]|string} fechas  las fechas de la hoja
 */
export const conProteinasDeLaEntrega = (pedido, fechas) => {
    if (!pedido?.proteinasPorEntrega || !esPackDeProteinas(pedido)) return pedido;
    const dias = (Array.isArray(fechas) ? fechas : [fechas]).filter(Boolean);
    if (dias.length === 0) return pedido;

    const entregas = entregasDelPedido(pedido);
    const fecha = dias.find(f => entregas.includes(f) && elegidasPara(pedido, f));
    if (!fecha) return pedido;

    const nueva = elegidasPara(pedido, fecha);
    const campo = campoDeLaLista(pedido);
    const lista = Array.isArray(pedido[campo]) && pedido[campo].length ? pedido[campo] : [{ nombre: nombreDelPack(pedido)[0] || '' }];
    let destino = lista.findIndex(it => Array.isArray(it?.proteinas) && it.proteinas.length > 0);
    if (destino === -1) destino = 0;

    const items = lista.map((it, i) => {
        if (i !== destino) return it;
        const copia = { ...it, proteinas: nueva };
        // `cantidades` y `medidas` van plato por plato: si cambió el largo
        // quedarían corridas ("x2" en la proteína equivocada).
        const largoAntes = Array.isArray(it?.proteinas) ? it.proteinas.length : -1;
        if (largoAntes !== nueva.length) { delete copia.cantidades; delete copia.medidas; }
        // Los cambios por plato eran sobre la lista de la compra. Encima de la
        // de esta semana la hoja imprimiría "Tilapia → Pollo" sin sentido.
        if (copia.customizations && typeof copia.customizations === 'object') {
            const { proteinChanges, ...resto } = copia.customizations;
            copia.customizations = resto;
        }
        return copia;
    });

    return { ...pedido, [campo]: items, proteinasDeEstaEntrega: fecha };
};

/**
 * Lee una lista pegada de WhatsApp: una proteína por renglón.
 *
 *     1. Tilapia empanizada
 *     - Pollo caribeño x2
 *     • Tortas de carne en salsa
 *
 * "x2" / "(2)" / "2 x" repiten la proteína, que es como la hoja cuenta porciones.
 */
export const leerListaDeProteinas = (textoPegado) => String(textoPegado || '')
    .replace(/\r/g, '')
    .split(/\n|;/)
    .map(l => l.replace(/^[\s•·*◽▪️\-–]+/u, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter(Boolean)
    .filter(l => !/^(cliente|tel[eé]fono|lugar|zona|entrega|fecha|prote[ií]nas?\s*:?\s*$)/i.test(l))
    .flatMap(l => {
        let nombre = l;
        let veces = 1;
        const atras = l.match(/^(.*?)\s*(?:x\s*(\d+)|\((\d+)\))$/i);    // "Pollo x2", "Pollo (2)"
        const adelante = l.match(/^(\d+)\s*x\s+(.+)$/i);                // "2 x Pollo"
        if (atras && atras[1]) { nombre = atras[1]; veces = Number(atras[2] || atras[3]); }
        else if (adelante) { nombre = adelante[2]; veces = Number(adelante[1]); }
        const n = Math.min(Math.max(veces || 1, 1), 10);
        return Array.from({ length: n }, () => nombre.trim());
    })
    .filter(Boolean);

/**
 * El cambio para Firestore, o null si queda igual.
 *
 * Se manda el mapa COMPLETO y no solo la fecha: una clave con guiones
 * ("2026-09-14") dentro de un campo punteado es fácil de escribir mal, y un
 * campo mal escrito no falla — se guarda en otro lado y la hoja no lo ve.
 *
 * Una lista vacía BORRA la elección de esa fecha: la entrega vuelve a usar la
 * lista de la compra.
 */
export const cambioDeProteinas = (pedido, fecha, lista) => {
    if (!fecha) return null;
    const limpia = (lista || []).map(texto).filter(Boolean);
    const antes = elegidasPara(pedido, fecha) || [];
    const igual = antes.length === limpia.length && antes.every((x, i) => x === limpia[i]);
    if (igual) return null;

    const mapa = { ...(pedido?.proteinasPorEntrega || {}) };
    if (limpia.length) mapa[fecha] = limpia; else delete mapa[fecha];
    return { proteinasPorEntrega: mapa };
};

/**
 * Los packs de proteínas de una hoja que llevan la lista equivocada.
 *
 * Un pack de varias entregas sin elegir para esta fecha: la hoja le cocina la
 * lista de la compra, que muy probablemente no es la de esta semana.
 *
 * @returns {Array<{id, cliente, fecha, plan}>}
 */
export const proteinasSinElegir = (pedidos = [], fechas = []) => {
    const dias = (Array.isArray(fechas) ? fechas : [fechas]).filter(Boolean);
    return (pedidos || [])
        .filter(p => p && esPackDeProteinas(p))
        .map(p => {
            const entregas = entregasDelPedido(p);
            const fecha = dias.find(f => entregas.includes(f));
            if (!fecha) return null;
            return estadoDeLaEntrega(p, fecha).origen === 'falta'
                ? { id: p.id, cliente: p.cliente || '', fecha, plan: p.plan || '' }
                : null;
        })
        .filter(Boolean);
};

/** "lunes 21 set" */
export const fechaCorta = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso || '');
    const dia = d.toLocaleDateString('es-CR', { weekday: 'long' });
    const mes = d.toLocaleDateString('es-CR', { month: 'short' }).replace('.', '');
    return `${dia} ${d.getDate()} ${mes}`;
};

/**
 * Los avisos para el recuadro de revisión de la hoja, con la misma forma que
 * `problemasParaLaHoja`: { pedidoId, cliente, que, comoSeArregla, gravedad }.
 */
export const avisosDeProteinasSinElegir = (pedidos = [], fechas = []) =>
    proteinasSinElegir(pedidos, fechas).map(x => ({
        pedidoId: x.id || null,
        cliente: x.cliente,
        que: `Lleva "${x.plan}" y para la entrega del ${fechaCorta(x.fecha)} nadie eligió las proteínas: `
            + 'la hoja le cocina las mismas de la compra, que casi seguro no son las de esta semana.',
        comoSeArregla: 'Tocá "Arreglar" y escribí las de esta semana, o elegilas en Admin → Proteínas de la semana.',
        gravedad: 'alta'
    }));

/**
 * Las listas elegidas, siguiendo a sus fechas cuando se mueve una entrega.
 *
 * Sin esto, pasar la entrega del lunes 21 al martes 22 dejaba las proteínas
 * guardadas en el 21 —un día que ya no es entrega— y el 22 salía con la lista
 * de la compra. Misma regla que `calendarioMovido`: "todas" corre cada fecha
 * los mismos días; si no, solo se mueve la que se tocó.
 */
export const moverProteinasConLaFecha = (mapa = {}, { fechaActual, fechaNueva, todas = false } = {}) => {
    const actual = mapa || {};
    if (!fechaActual || !fechaNueva || fechaActual === fechaNueva) return actual;
    const dia = 86400000;
    const aFecha = (iso) => new Date(`${iso}T12:00:00`);
    const aTexto = (d) => d.toISOString().slice(0, 10);
    const corrimiento = Math.round((aFecha(fechaNueva) - aFecha(fechaActual)) / dia);

    const nuevo = {};
    Object.entries(actual).forEach(([f, lista]) => {
        const destino = todas
            ? aTexto(new Date(aFecha(f).getTime() + corrimiento * dia))
            : (f === fechaActual ? fechaNueva : f);
        // Si en el destino ya había una lista, gana la que se está moviendo:
        // es la que el cliente pidió para esa entrega.
        if (f === fechaActual || !(destino in nuevo)) nuevo[destino] = lista;
    });
    return nuevo;
};

const ESTADOS_QUE_NO_VAN = ['cancelled', 'cancelado', 'rejected', 'rechazado', 'refunded', 'reembolsado'];

/**
 * Las entregas de packs de proteínas entre dos fechas, agrupadas por día.
 *
 * Es lo que muestra la pantalla "Proteínas de la semana": para cada miércoles,
 * sábado y lunes, quién recibe un pack de proteínas y si ya se eligieron.
 *
 * @param {Array} pedidos
 * @param {{desde?: string, hasta?: string}} rango  fechas YYYY-MM-DD, incluidas
 * @returns {Array<{fecha, filas: Array}>}
 */
export const entregasParaElegir = (pedidos = [], { desde = '', hasta = '' } = {}) => {
    const porFecha = new Map();
    (pedidos || []).forEach((p) => {
        if (!p || !esPackDeProteinas(p)) return;
        if (ESTADOS_QUE_NO_VAN.includes(String(p.status || p.estado || '').toLowerCase())) return;
        const entregas = entregasDelPedido(p);
        entregas.forEach((fecha, i) => {
            if (desde && fecha < desde) return;
            if (hasta && fecha > hasta) return;
            const fila = {
                pedido: p,
                fecha,
                numero: i + 1,
                total: entregas.length,
                cuantas: cuantasProteinas(p),
                gramos: gramosDelPack(p),
                ...estadoDeLaEntrega(p, fecha),
                // Lo de la semana anterior, para "repetir": muchos piden casi lo mismo.
                anterior: i > 0 ? estadoDeLaEntrega(p, entregas[i - 1]).lista : []
            };
            if (!porFecha.has(fecha)) porFecha.set(fecha, []);
            porFecha.get(fecha).push(fila);
        });
    });
    return [...porFecha.keys()].sort().map(fecha => ({
        fecha,
        filas: porFecha.get(fecha).sort((a, b) =>
            // Los que faltan primero: es lo que hay que hacer.
            (a.origen === 'falta' ? 0 : 1) - (b.origen === 'falta' ? 0 : 1)
            || String(a.pedido.cliente || '').localeCompare(String(b.pedido.cliente || ''), 'es'))
    }));
};

/**
 * Nombres para sugerir al escribir: las proteínas del catálogo y las que ya
 * se usaron en otros packs. Escribirlas igual importa: "Pollo al curry" y
 * "pollo curry" son dos ollas en la hoja de cocina.
 */
export const sugerenciasDeProteinas = (pedidos = [], catalogo = [], menus = null) => {
    const CATEGORIAS = ['pollo', 'res', 'cerdo', 'pescado'];
    const nombres = new Map();
    const agregar = (n) => {
        const t = texto(n);
        const k = t.toLowerCase();
        if (t && !nombres.has(k)) nombres.set(k, t);
    };
    // La lista de la semana (PAQUETES DE PROTEÍNA del Excel) manda cómo se escribe.
    (Array.isArray(menus?.proteinasDisponibles) ? menus.proteinasDisponibles : []).forEach(agregar);
    (catalogo || [])
        .filter(c => CATEGORIAS.includes(String(c?.categoria || '').toLowerCase()))
        .forEach(c => agregar(c.nombre));
    (pedidos || []).filter(esPackDeProteinas).forEach((p) => {
        listaDeLaCompra(p).forEach(agregar);
        Object.values(p.proteinasPorEntrega || {}).forEach(l => (l || []).forEach(agregar));
    });
    return [...nombres.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

/** 1 = lunes, 3 = miércoles, 6 = sábado */
export const diaDeLaSemana = (iso) => new Date(`${iso}T12:00:00`).getDay();
