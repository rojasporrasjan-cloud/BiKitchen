/**
 * Cálculo de etiquetas térmicas a partir de los pedidos reales.
 *
 * REGLA CENTRAL: una etiqueta = un envase que se empaca. Nada más.
 *
 * Por eso este módulo NO usa `buildKitchenSheetData()` ni `conMargen()`: esas
 * aplican el +30% de merma de Gina, que existe para que a la cocina no le falte
 * comida. Si se cocinan 23 porciones pero se empacan 18 envases, hacen falta 18
 * etiquetas. Imprimir 23 sería pegar etiquetas en envases que no existen.
 *
 * Todo lo demás sí se reutiliza tal cual de la hoja de producción, a propósito:
 *   ESTADOS_QUE_IMPRIMEN     → excluye cancelados y sin confirmar
 *   getScheduleFromOrder()   → resuelve packs de 2 semanas / mensuales
 *   mapPedidosFromLegacy()   → aplica las sustituciones del cliente
 *   deduplicateOrdersByClient() → fusiona pedidos repetidos igual que la hoja
 *
 * Si esa cadena cambiara, las etiquetas cambian con ella. Es intencional: la
 * cantidad de etiquetas nunca debería poder discrepar de lo que se empaca.
 */

import { ESTADOS_QUE_IMPRIMEN } from '../estadosPedido';
import { getScheduleFromOrder } from '../orderDates';
import { mapPedidosFromLegacy, detectIsTwoPack } from '../logisticsUtils';
import { deduplicateOrdersByClient } from '../productionHelpers';
import { mapPackNameToMenuKey } from '../packClassification';
import { DEFAULT_MENUS } from '../firestoreMenus';

/**
 * Cómo se llama cada familia de pack EN LA ETIQUETA.
 *
 * Corto a propósito: en 30 mm de ancho no cabe "PACK BAJO EN CALORÍAS".
 * Los labels largos de la hoja de producción (MENU_LABELS) no sirven acá.
 */
export const TIPO_ETIQUETA = {
    regular: 'Regular',
    fullPack: 'Full Pack',
    bajoCalorias: 'Bajo Calorías',
    sinCarbos: 'Sin Carbos',
    keto: 'Keto',
    vegetariano: 'Vegetariano',
    casaditos: 'Casaditos',
    desayuno: 'Desayuno',
    familiarPremium: 'Familiar Premium',
    familiarDeluxe: 'Familiar Deluxe'
};

export const TIPO_INDIVIDUAL = 'Individual';

/**
 * Las tres familias con las que trabaja el equipo al empacar.
 *
 * No son lo mismo que el tipo de plan: a la hora de empacar importa si es un
 * pack semanal, un desayuno o un plato suelto, porque van en envases y estantes
 * distintos. Sirve para filtrar la pantalla.
 */
export const FAMILIA = {
    PACK: 'Packs',
    CENA: 'Cenas',
    DESAYUNO: 'Desayunos',
    INDIVIDUAL: 'Individuales'
};

export const familiaDeTipo = (tipo) => {
    // Las cenas van aparte: son otro envase y otro estante al empacar.
    if (/\bcena\b/i.test(tipo || '')) return FAMILIA.CENA;
    if (tipo === TIPO_ETIQUETA.desayuno) return FAMILIA.DESAYUNO;
    if (tipo === TIPO_INDIVIDUAL) return FAMILIA.INDIVIDUAL;
    return FAMILIA.PACK;
};

/**
 * El nombre que va impreso cuando el cliente pidió un cambio.
 *
 * mapPedidosFromLegacy() deja rastro del cambio como "Pollo → Cerdo" para que
 * la cocina vea de dónde salió. En la etiqueta eso no sirve: el cliente abre su
 * envase y tiene que leer lo que REALMENTE le tocó. Nos quedamos con lo último.
 */
export const resolveFinalDishName = (nombre) => {
    if (!nombre) return '';
    const partes = String(nombre).split(/→|->/);
    return partes[partes.length - 1].trim();
};

/** Nombre corto de la familia del pack, para la línea "tipo" de la etiqueta. */
export const resolveTipoEtiqueta = (packName) => {
    const menuKey = mapPackNameToMenuKey(packName);
    if (menuKey && TIPO_ETIQUETA[menuKey]) return TIPO_ETIQUETA[menuKey];
    return TIPO_INDIVIDUAL;
};

/**
 * ¿Este texto es el nombre de un pack y no el de una proteína?
 *
 * Hace falta porque `mapPedidosFromLegacy` usa `item.nombre` como proteína
 * cuando el ítem no trae la lista de proteínas plato por plato. En un pack eso
 * es el nombre comercial, así que las etiquetas salían diciendo "Pack Regular"
 * en vez de "Fajitas de pollo": el empacador no sabría qué le está pegando al
 * envase.
 */
export const esNombreDePack = (nombre) => {
    const n = String(nombre || '').trim();
    if (!n) return false;
    if (mapPackNameToMenuKey(n)) return true;
    return /\bpack\b|mensual|quincenal|semanal/i.test(n);
};

/**
 * ¿El pedido lleva almuerzo Y cena?
 *
 * Se mira solo "almuerzo y cena" o "cenas", y a propósito NO se incluye
 * "two pack" ni "dos semanas":
 *   - "two pack"    → dos packs del MISMO menú (ya lo duplica cantidadMenus)
 *   - "dos semanas" → dos ENTREGAS, que se resuelven por fecha
 * Meterlos todos en la misma bolsa —como hace la hoja de producción— hace que
 * un pedido cuente doble sin que lleve cena.
 */
export const esPromoCena = (pedido) => {
    const items = pedido?.items || pedido?.rawPedido?.items || [];
    const texto = [
        pedido?.plan, pedido?.tipoMenu, pedido?.categoryLabel, pedido?.observaciones,
        ...items.map(i => `${i?.nombre || ''} ${i?.planLabel || ''}`)
    ].join(' ').toLowerCase();

    return /almuerzo[s]?\s*y\s*cena[s]?/.test(texto) || /\bcenas?\b/.test(texto);
};

/**
 * Platos del menú de CENA de una familia.
 *
 * El menú de cena es completamente distinto al de almuerzo: donde el almuerzo
 * lleva "Albóndigas de res", la cena lleva "Pollo al ajillo". Sin esto, un
 * cliente de promo almuerzo+cena se quedaba sin las 5 etiquetas de sus cenas y
 * nadie se enteraba.
 *
 * Las cuatro formas de la clave son las mismas que busca la hoja de producción.
 */
const platosDelMenuCena = (menuKey, officialMenus) => {
    if (!menuKey || !officialMenus) return [];
    const cap = menuKey.charAt(0).toUpperCase() + menuKey.slice(1);
    // A propósito NO se cae a DEFAULT_MENUS: el menú de cena cambia cada semana,
    // y una etiqueta con el plato equivocado es peor que una que falta —la que
    // falta se nota al empacar, la equivocada llega al cliente.
    const obj = officialMenus.cena?.[menuKey]
        || officialMenus[`cena_${menuKey}`]
        || officialMenus[`cena${cap}`]
        || officialMenus[`cena${menuKey}`];
    if (!obj) return [];
    const arr = Array.isArray(obj) ? obj : (obj.platos || []);
    return arr.map((p, idx) => ({
        numero: p.numero || idx + 1,
        cantidad: 1,
        proteina: { nombre: typeof p.proteina === 'string' ? p.proteina : (p.proteina?.nombre || '') }
    }));
};

/**
 * ¿El pedido lleva desayunos además del pack?
 *
 * Los desayunos de promoción casi nunca vienen como ítem propio: viajan dentro
 * del nombre del pack ("PACK DOS SEMANAS CON DESAYUNOS GRATIS", "REGALIA
 * DESAYUNOS", "con desayunos"). En la base hay 47 pedidos así.
 *
 * `mapPedidosFromLegacy` ya calcula esta marca mirando plan, observaciones e
 * ítems; se reutiliza para no tener dos criterios distintos.
 */
export const llevaDesayunos = (pedido) => {
    if (pedido?.incluyeDesayuno) return true;
    const items = pedido?.items || pedido?.rawPedido?.items || [];
    const texto = [
        pedido?.plan, pedido?.tipoMenu, pedido?.observaciones,
        ...items.map(i => i?.nombre || '')
    ].join(' ');
    return /desayun/i.test(texto);
};

/**
 * Platos del menú de desayunos de la semana.
 *
 * Son 5, igual que un pack de almuerzo: una etiqueta por envase. Tampoco cae a
 * DEFAULT_MENUS, por lo mismo que la cena: el menú cambia cada semana y una
 * etiqueta con el plato equivocado llega al cliente.
 */
const platosDelMenuDesayuno = (officialMenus) => {
    if (!officialMenus) return [];
    const obj = officialMenus.desayuno;
    if (!obj) return [];
    const arr = Array.isArray(obj) ? obj : (obj.platos || []);
    return arr.map((p, idx) => ({
        numero: p.numero || idx + 1,
        cantidad: 1,
        proteina: { nombre: typeof p.proteina === 'string' ? p.proteina : (p.proteina?.nombre || '') }
    }));
};

/** Cuántos desayunos pide el texto del pedido ("10 DESAYUNOS"), si lo dice. */
export const desayunosPedidos = (pedido) => {
    const items = pedido?.items || pedido?.rawPedido?.items || [];
    const texto = [
        pedido?.plan, pedido?.tipoMenu, pedido?.observaciones,
        ...items.map(i => i?.nombre || '')
    ].join(' ');
    const m = texto.match(/(\d+)\s*desayunos?/i);
    return m ? parseInt(m[1], 10) : null;
};

/**
 * Platos del menú oficial de una familia, cuando el pedido no los trae escritos.
 *
 * Un pack semanal normalmente NO guarda sus platos en el pedido: se resuelven
 * contra el menú de la semana. Los individuales sí los traen.
 */
const platosDelMenuOficial = (menuKey, officialMenus) => {
    if (!menuKey) return [];
    const fuente = officialMenus || DEFAULT_MENUS;
    const menuObj = fuente[menuKey] || DEFAULT_MENUS[menuKey];
    if (!menuObj) return [];
    const arr = Array.isArray(menuObj) ? menuObj : (menuObj.platos || []);
    return arr.map((p, idx) => ({
        numero: p.numero || idx + 1,
        cantidad: 1,
        proteina: { nombre: typeof p.proteina === 'string' ? p.proteina : (p.proteina?.nombre || '') }
    }));
};

/**
 * Pedidos crudos de Firestore → pedidos que realmente se empacan esa fecha.
 *
 * Misma cadena y mismo orden que PrintProductionView. Se expone aparte para
 * poder probarla sin montar la pantalla.
 */
export const selectOrdersForDate = (rawOrders, date) => {
    const elegibles = (rawOrders || []).filter(order => {
        const status = (order.status || order.estado || '').toLowerCase();
        if (!ESTADOS_QUE_IMPRIMEN.includes(status)) return false;
        return getScheduleFromOrder(order).includes(date);
    });

    const normalizados = mapPedidosFromLegacy(elegibles);
    return deduplicateOrdersByClient(normalizados);
};

/**
 * Calcula el lote de etiquetas de una fecha de producción.
 *
 * @param {Array}  rawOrders     - documentos crudos de la colección `pedidos`
 * @param {string} date          - fecha de entrega YYYY-MM-DD
 * @param {Object} officialMenus - menús de la semana (opcional; cae a DEFAULT_MENUS)
 * @returns {{ groups, totalLabels, totalOrders, fusionados, warnings }}
 */
export const buildLabelBatch = (rawOrders, date, officialMenus = null) => {
    const { pedidos, fusionados } = selectOrdersForDate(rawOrders, date);

    const grupos = new Map();
    const warnings = [];

    pedidos.forEach(pedido => {
        const packName = pedido.plan || pedido.tipoMenu || '';
        const tipo = resolveTipoEtiqueta(packName);
        const menuKey = mapPackNameToMenuKey(packName);
        const cantidadMenus = pedido.cantidadMenus || 1;

        // Los platos del pedido mandan: son los únicos que traen las
        // sustituciones del cliente. El menú oficial es solo el respaldo.
        //
        // En un pack se descartan los "platos" que en realidad son el nombre
        // del pack: en la etiqueta tiene que ir la proteína que trae el envase.
        // En un individual NO se descarta nada, porque ahí el nombre del
        // producto SÍ es lo que come el cliente ("Tilapia a la meunier").
        const esPack = !!menuKey;
        let platos = (pedido.platos || []).filter(p => {
            const n = resolveFinalDishName(p?.proteina?.nombre);
            if (!n) return false;
            return !(esPack && esNombreDePack(n));
        });

        if (platos.length === 0 && esPack) {
            platos = platosDelMenuOficial(menuKey, officialMenus);
        }

        if (platos.length === 0) {
            warnings.push({
                tipo: 'sin-platos',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: esPack
                    ? `"${packName}" no tiene platos configurados en el Menú Semanal, así que no se sabe qué proteínas lleva. Configurá el menú y volvé a cargar.`
                    : `No se pudo determinar qué lleva "${packName || 'pedido sin nombre'}". No se generaron etiquetas.`
            });
            return;
        }

        // ── Desayunos de promoción ──
        // Van dentro del nombre del pack ("CON DESAYUNOS GRATIS", "REGALIA
        // DESAYUNOS"), no como ítem. Antes solo se avisaba y las etiquetas
        // había que hacerlas a mano.
        const conDesayuno = menuKey !== 'desayuno' && llevaDesayunos(pedido);
        const platosDesayuno = conDesayuno ? platosDelMenuDesayuno(officialMenus) : [];

        if (conDesayuno && platosDesayuno.length === 0) {
            warnings.push({
                tipo: 'desayuno-sin-menu',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: 'Lleva desayunos pero no hay Menú de Desayunos configurado esta semana. Sus etiquetas de desayuno NO se generaron.'
            });
        } else if (conDesayuno) {
            const pedidos_ = desayunosPedidos(pedido);
            const generadas = platosDesayuno.length * cantidadMenus;
            // Si el pedido dice un número distinto al del menú, lo decide una
            // persona: repetir un plato al azar sería inventar qué come.
            if (pedidos_ && pedidos_ !== generadas) {
                warnings.push({
                    tipo: 'desayuno-cantidad',
                    cliente: pedido.cliente || 'Sin nombre',
                    detalle: `El pedido dice ${pedidos_} desayunos pero el menú de la semana tiene ${platosDesayuno.length} platos: se generaron ${generadas}. Ajustá a mano si hace falta.`
                });
            }
        }

        // Two Pack y promos de cena ya vienen con cantidadMenus duplicado desde
        // mapPedidosFromLegacy. No se vuelve a multiplicar acá, pero se avisa
        // para que se contraste contra la hoja de empaque antes de imprimir.
        if (detectIsTwoPack(pedido.rawPedido || pedido)) {
            warnings.push({
                tipo: 'verificar-cantidad',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: `Pedido tipo Two Pack: se contaron ${cantidadMenus} packs. Verificá contra la hoja de empaque antes de imprimir.`
            });
        }

        // ── Cenas ──
        // Un pack de "almuerzo y cena" son DOS juegos de envases con platos
        // distintos. Antes solo salían los del almuerzo: al cliente le faltaban
        // las 5 etiquetas de sus cenas y no había ningún aviso.
        const llevaCena = esPack && esPromoCena(pedido);
        const platosCena = llevaCena ? platosDelMenuCena(menuKey, officialMenus) : [];

        if (llevaCena && platosCena.length === 0) {
            warnings.push({
                tipo: 'cena-sin-menu',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: `Lleva cenas pero no hay menú de cena configurado para "${packName}". Sus etiquetas de cena NO se generaron.`
            });
        } else if (llevaCena) {
            warnings.push({
                tipo: 'verificar-cena',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: `Lleva almuerzo y cena: se generaron ${platos.length} etiquetas de almuerzo y ${platosCena.length} de cena. Verificá la cantidad contra la hoja de empaque.`
            });
        }

        const agregar = (plato, tipoEtiqueta) => {
            const nombre = resolveFinalDishName(plato?.proteina?.nombre);
            if (!nombre) return;

            const cantidad = cantidadMenus * (plato.cantidad || 1);
            const original = String(plato?.proteina?.nombre || '');
            const esSustitucion = /→|->/.test(original);

            const tipo = tipoEtiqueta;
            const clave = `${tipo}||${nombre.toLowerCase()}`;
            if (!grupos.has(clave)) {
                grupos.set(clave, {
                    id: clave,
                    tipo,
                    menuKey: menuKey || null,
                    dishName: nombre,
                    cantidad: 0,
                    esSustitucion: false,
                    clientes: []
                });
            }
            const grupo = grupos.get(clave);
            grupo.cantidad += cantidad;
            grupo.esSustitucion = grupo.esSustitucion || esSustitucion;
            grupo.clientes.push({ cliente: pedido.cliente || 'Sin nombre', cantidad });
        };

        platos.forEach(p => agregar(p, tipo));
        platosCena.forEach(p => agregar(p, `${tipo} Cena`));
        // Los desayunos van con su propio tipo, no con el del pack: el envase
        // dice "Desayuno", no "Bajo Calorías".
        platosDesayuno.forEach(p => agregar(p, TIPO_ETIQUETA.desayuno));
    });

    const groups = [...grupos.values()].sort((a, b) => {
        if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
        if (a.cantidad !== b.cantidad) return b.cantidad - a.cantidad;
        return a.dishName.localeCompare(b.dishName);
    });

    return {
        date,
        groups,
        totalLabels: groups.reduce((acc, g) => acc + g.cantidad, 0),
        totalOrders: pedidos.length,
        fusionados,
        warnings
    };
};

/** Agrupa los grupos por tipo de plan, para mostrarlos en secciones. */
export const groupByTipo = (groups) => {
    const porTipo = new Map();
    groups.forEach(g => {
        if (!porTipo.has(g.tipo)) porTipo.set(g.tipo, { tipo: g.tipo, grupos: [], total: 0 });
        const entry = porTipo.get(g.tipo);
        entry.grupos.push(g);
        entry.total += g.cantidad;
    });
    return [...porTipo.values()].sort((a, b) => b.total - a.total);
};

/** Cuántas etiquetas hay de cada familia, para los filtros de la pantalla. */
export const contarPorFamilia = (groups) => {
    const conteo = {
        [FAMILIA.PACK]: 0, [FAMILIA.CENA]: 0,
        [FAMILIA.DESAYUNO]: 0, [FAMILIA.INDIVIDUAL]: 0
    };
    groups.forEach(g => {
        conteo[familiaDeTipo(g.tipo)] += g.cantidad;
    });
    return conteo;
};

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/** "2026-08-28" → "28 agosto" (como se lee hoy en las etiquetas). */
export const formatExpirationDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = String(isoDate).split('-').map(Number);
    if (!y || !m || !d) return '';
    return `${d} ${MESES[m - 1]}`;
};

/**
 * Expande los grupos a las etiquetas individuales que se van a imprimir.
 * Un grupo de 18 se convierte en 18 etiquetas idénticas: la cola imprime de a una.
 */
export const expandGroupsToLabels = (groups, expirationDate) => {
    const vence = formatExpirationDate(expirationDate);
    const labels = [];
    groups.forEach(g => {
        for (let i = 0; i < g.cantidad; i++) {
            labels.push({
                groupId: g.id,
                type: g.tipo,
                protein: g.dishName,
                expirationDate: vence
            });
        }
    });
    return labels;
};
