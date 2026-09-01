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
import { mapPackNameToMenuKey, esPersonalizado } from '../packClassification';
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

/** Los menús personalizados: cada cliente lleva sus propios platos. */
export const TIPO_PERSONALIZADO = 'Personalizado';

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

/**
 * En qué orden salen los bloques de la impresora.
 *
 * Se imprimen en una tira continua, así que el orden es el orden en que quedan
 * apilados sobre la mesa. Primero los packs —que es el grueso del trabajo—, y
 * los personalizados de último porque cada uno lleva sus propios platos y
 * conviene armarlos aparte, sin mezclarlos con la producción en serie.
 */
const ORDEN_PACKS = [
    TIPO_ETIQUETA.regular,
    TIPO_ETIQUETA.fullPack,
    TIPO_ETIQUETA.bajoCalorias,
    TIPO_ETIQUETA.sinCarbos,
    TIPO_ETIQUETA.keto,
    TIPO_ETIQUETA.vegetariano,
    TIPO_ETIQUETA.casaditos,
    TIPO_ETIQUETA.familiarPremium,
    TIPO_ETIQUETA.familiarDeluxe
];

export const ordenDeTipo = (tipo) => {
    const t = String(tipo || '');

    // Los personalizados van al final: se arman uno por uno
    if (t === TIPO_PERSONALIZADO) return 500;
    if (t === TIPO_INDIVIDUAL) return 400;
    if (t === TIPO_ETIQUETA.desayuno) return 300;

    // Las cenas después de todos los packs, en el mismo orden de familia
    if (/\bcena\b/i.test(t)) {
        const base = t.replace(/\s*cena\s*$/i, '').trim();
        const i = ORDEN_PACKS.indexOf(base);
        return 200 + (i === -1 ? ORDEN_PACKS.length : i);
    }

    const i = ORDEN_PACKS.indexOf(t);
    return 100 + (i === -1 ? ORDEN_PACKS.length : i);
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
    // Un menú personalizado se empaca como pack, no como plato suelto: va en su
    // propio envase de pack y se cuenta con los packs al empacar.
    if (/^personalizado/i.test(String(packName || '').trim())) return TIPO_PERSONALIZADO;
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

    // Palabras que solo aparecen en el nombre comercial de un pack
    if (/\bpack\b|mensual|quincenal|semanal|promo/i.test(n)) return true;

    // Un nombre corto que además cae en una familia ("Bajo Calorías", "Keto").
    // El límite de palabras importa: mapPackNameToMenuKey reconoce por palabra
    // suelta, así que "Chili vegetariano de frijoles rojos y vegetales" —un plato
    // real del menú— daba "vegetariano" y su etiqueta se borraba.
    const palabras = n.split(/\s+/).filter(Boolean);
    return palabras.length <= 3 && !!mapPackNameToMenuKey(n);
};

/**
 * ¿El pedido lleva almuerzo Y cena?
 *
 * "two pack" a propósito NO cuenta: el catálogo lo define como "Plan Parejas:
 * 10 Comidas Totales (5 para cada uno)" (packsData.js). Son dos packs del MISMO
 * menú y la cantidad ya la duplica cantidadMenus; sumarle cenas le da al cliente
 * el doble de lo que pagó.
 *
 * La promo de DOS SEMANAS sí lleva cena, aunque su nombre corto no lo diga. En
 * los chats aparece escrita de las dos formas y siempre al mismo precio:
 *   "pack dos semanas con desayunos gratis"                      → ₡87.890
 *   "pack dos semanas ALMUERZO Y CENA con desayuno gratis"       → ₡87.890
 *   "pack quincenal ALMUERZO Y CENA con regalía de desayunos"    → ₡87.890
 * Es el mismo producto. Para comparar: dos semanas de solo almuerzo cuesta
 * ₡49.000 (5 Comidas Bajo Calorías quincenal). Sin esto, a esos clientes les
 * faltaban las cinco etiquetas de sus cenas.
 */
export const textoLlevaCena = (texto) => {
    const t = String(texto || '').toLowerCase();

    const diceCena = /almuerzo[s]?\s*y\s*cena[s]?/.test(t) || /\bcenas?\b/.test(t);

    // "two pack" gana sobre todo lo demás salvo que el pedido diga cena aparte.
    // Se descarta primero porque "two pack ... mensual" también dispararía otras reglas.
    if (/two\s*pack/.test(t) && !diceCena) return false;

    return diceCena
        || /\b(dos|2)\s*semanas\b/.test(t)
        || /promo\s*2\s*semanas/.test(t)
        || (/quincenal/.test(t) && /desayun/.test(t));
};

/**
 * Si el pack hay que partirlo en una hoja de almuerzos y otra de cenas.
 *
 * Un PERSONALIZADO nunca: sus platos son literalmente lo que hay que cocinar,
 * ni mas ni menos. A Fatima Arauz se le repusieron CINCO CENAS del menu del 25
 * al 31 de agosto; como el nombre del pack dice "cenas", la hoja creia que era
 * un pack de almuerzos que ademas llevaba cenas y la sacaba DOS veces: una con
 * sus platos y otra con el menu de cenas de ESTA semana. Diez cenas para quien
 * lleva cinco.
 */
export const packSeParteEnAlmuerzoYCena = (packName, textoDelPedido) =>
    !esPersonalizado(packName) && textoLlevaCena(textoDelPedido);

/** Misma regla, aplicada a un pedido completo. */
export const esPromoCena = (pedido) => {
    const items = pedido?.items || pedido?.rawPedido?.items || [];
    return textoLlevaCena([
        pedido?.plan, pedido?.tipoMenu, pedido?.categoryLabel, pedido?.categoria, pedido?.observaciones,
        ...items.map(i => `${i?.nombre || ''} ${i?.planLabel || ''}`)
    ].join(' '));
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

    // Se ordena por cliente ANTES de fusionar, igual que PrintProductionView.
    // La fusión conserva el primero que ve: sin este orden, la hoja y las
    // etiquetas se quedaban con pedidos DISTINTOS del mismo cliente.
    elegibles.sort((a, b) => String(a.cliente || '').localeCompare(String(b.cliente || '')));

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
/**
 * Un pack que es SOLO de desayunos, y no un pack de almuerzos que los regala.
 *
 * Angie Navarro lleva "Paquete mensual desayunos (6 por semana)": sus platos YA
 * son los desayunos. Las etiquetas le sumaban ademas los cinco del menu de la
 * semana, que ella no pidio.
 *
 * La distincion importa porque hay packs de ALMUERZOS cuyo nombre tambien dice
 * "desayunos" —"PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Regular"— y esos
 * SI llevan los desayunos aparte. Se reconocen porque nombran una familia.
 */
export const esPackDeSoloDesayunos = (nombre) => {
    const n = String(nombre || '').toLowerCase();
    if (!/desayun/.test(n)) return false;
    return !/bajo|calor|sin carbos|keto|vegetarian|casadito|full pack|deluxe|familiar|regular|est[áa]ndar|almuerzo/.test(n);
};

export const buildLabelBatch = (rawOrders, date, officialMenus = null) => {
    const { pedidos, fusionados } = selectOrdersForDate(rawOrders, date);

    const grupos = new Map();
    const warnings = [];

    pedidos.forEach(pedido => {
        const packName = pedido.plan || pedido.tipoMenu || '';
        const tipo = resolveTipoEtiqueta(packName);
        const menuKey = mapPackNameToMenuKey(packName);
        const cantidadMenus = pedido.cantidadMenus || 1;

        // Cuántos packs lleva el pedido. El dato viaja en `cantidadMenus` (pedidos
        // de la web) o en la cantidad del ítem (los de WhatsApp), y a veces en
        // ambos. Se toma el mayor, igual que cantidadDePacks en la hoja.
        //
        // Hace falta mirar el ítem porque cuando los platos salen del MENÚ OFICIAL
        // vienen con cantidad 1, y sin esto Enid Murillo —que lleva 2 packs— sacaba
        // 5 etiquetas en vez de 10.
        const cantidadDeItems = Math.max(1, ...(pedido.rawPedido?.items || pedido.items || [])
            .map(i => Number(i?.cantidad) || 1));
        const packsDelPedido = Math.max(cantidadMenus, cantidadDeItems);

        // Los platos del pedido mandan: son los únicos que traen las
        // sustituciones del cliente. El menú oficial es solo el respaldo.
        //
        // En un pack se descartan los "platos" que en realidad son el nombre
        // del pack: en la etiqueta tiene que ir la proteína que trae el envase.
        // En un individual NO se descarta nada, porque ahí el nombre del
        // producto SÍ es lo que come el cliente ("Tilapia a la meunier").
        // Un menú PERSONALIZADO es un pack aunque no pertenezca a ninguna familia:
        // sus platos vienen en el propio pedido, no del menú semanal.
        const esPersonalizado = /^personalizado/i.test(String(packName).trim());
        const esPack = !!menuKey || esPersonalizado;
        // Sustituciones sobre el NOMBRE DEL PACK, no sobre un plato.
        //
        // Cuando un pack no trae la lista de proteínas, mapPedidosFromLegacy arma un
        // solo plato con el nombre comercial. Si además el cliente pidió un cambio,
        // queda "Pack Vegetariano → Filet de pollo encebollado": parece un plato real
        // y el pack se quedaba con UNA etiqueta en vez de las cinco de su menú.
        // Se descarta como plato y el cambio se avisa aparte para no perderlo.
        const sustitucionesSobrePack = [];
        let platos = (pedido.platos || []).filter(p => {
            const crudo = String(p?.proteina?.nombre || '');
            const n = resolveFinalDishName(crudo);
            if (!n) return false;
            if (!esPack) return true;

            const original = crudo.split(/→|->/)[0].trim();
            if (esNombreDePack(original)) {
                if (n !== original) sustitucionesSobrePack.push(n);
                return false;
            }
            return !esNombreDePack(n);
        });

        // Un pedido puede traer el pack Y productos sueltos (Priscilla lleva su
        // pack quincenal y aparte tortas de maduro). Los sueltos NO describen el
        // pack: si se toman por sus platos, el cliente recibe UNA etiqueta en vez
        // de las cinco de su menú. Cuando lo que queda no alcanza a cubrir el
        // menú de la semana, el menú manda y lo demás se etiqueta como suelto.
        // Se reconoce por el nombre: si coincide con OTRO ítem del pedido, es un
        // producto aparte y no un plato del pack. Mirar solo la cantidad no sirve
        // —un pack puede tener legítimamente menos platos que el menú.
        let sueltos = [];
        if (esPack && !esPersonalizado) {
            const clave = (x) => String(x || '').trim().toLowerCase();
            const nombrePack = clave(packName);
            const otrosItems = (pedido.rawPedido?.items || pedido.items || [])
                .map(i => clave(i?.nombre))
                .filter(n => n && n !== nombrePack);

            if (otrosItems.length > 0) {
                sueltos = platos.filter(p => otrosItems.includes(clave(resolveFinalDishName(p?.proteina?.nombre))));
                platos = platos.filter(p => !sueltos.includes(p));
            }
        }

        if (platos.length === 0 && esPack && !esPersonalizado) {
            platos = platosDelMenuOficial(menuKey, officialMenus);
        }

        // Reposiciones y entregas atrasadas piden el menú de OTRA semana. Las
        // etiquetas solo conocen el menú activo, así que saldrían con los platos
        // equivocados sin que nadie se entere. Enid Murillo es el caso: su
        // reposición va "con el menú de la semana pasada".
        const textoDelPedido = [pedido.plan, pedido.tipoMenu, pedido.observaciones].join(' ');
        if (/semana pasada|men[úu] anterior|semana anterior/i.test(textoDelPedido)) {
            warnings.push({
                tipo: 'menu-de-otra-semana',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: 'El pedido pide el MENÚ DE OTRA SEMANA. Las etiquetas salieron con los platos del menú activo: revisá cuáles van antes de imprimir.'
            });
        }

        if (sustitucionesSobrePack.length > 0) {
            warnings.push({
                tipo: 'sustitucion-sobre-pack',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: `Pidió un cambio (${sustitucionesSobrePack.join(', ')}) pero está anotado sobre el nombre del pack, no sobre un plato. Se imprimieron los ${platos.length} platos del menú: cambiá a mano la etiqueta que corresponda.`
            });
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
        // Si el pack pertenece a una familia de ALMUERZOS, el pedido no es de
        // puros desayunos por más que su texto los mencione: "20 COMIDAS Y 10
        // DESAYUNOS" dentro de un Pack Bajo Calorías son almuerzos con regalía.
        const itemsDelPedido = pedido.rawPedido?.items || pedido.items || [];
        const yaEsDeDesayunos = !menuKey
            && itemsDelPedido.length > 0
            && itemsDelPedido.every(i => esPackDeSoloDesayunos(i?.nombre));
        // Cuantos packs de DESAYUNO. No siempre coincide con los del almuerzo:
        // Christopher Ulloa lleva UN personalizado y DOS packs de desayunos.
        const packsDeDesayuno = Number(pedido.packsDesayuno) > 0
            ? Number(pedido.packsDesayuno)
            : cantidadMenus;
        const conDesayuno = menuKey !== 'desayuno' && !yaEsDeDesayunos && llevaDesayunos(pedido);
        const platosDesayuno = conDesayuno ? platosDelMenuDesayuno(officialMenus) : [];

        if (conDesayuno && platosDesayuno.length === 0) {
            warnings.push({
                tipo: 'desayuno-sin-menu',
                cliente: pedido.cliente || 'Sin nombre',
                detalle: 'Lleva desayunos pero no hay Menú de Desayunos configurado esta semana. Sus etiquetas de desayuno NO se generaron.'
            });
        } else if (conDesayuno) {
            const pedidos_ = desayunosPedidos(pedido);
            const generadas = platosDesayuno.length * packsDeDesayuno;
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
        // Un PERSONALIZADO no se parte: sus platos son literalmente lo que va en
        // los envases. A Fatima Arauz, cuyo pack se llama "CENAS ...", le sumaba
        // ademas las cinco del menu de cenas ACTIVO.
        const llevaCena = esPack && !esPersonalizado && esPromoCena(pedido);
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

        const agregar = (plato, tipoEtiqueta, vecesFijas = null) => {
            const nombre = resolveFinalDishName(plato?.proteina?.nombre);
            if (!nombre) return;

            // Se toma el MAYOR de los dos, no el producto: son dos formas de
            // escribir el mismo dato. Un pedido puede traer la cantidad en
            // `cantidadMenus` (web) o en el ítem (WhatsApp), y a veces en ambos.
            // Multiplicarlos le daba 9 etiquetas a quien lleva 3 packs.
            // Es el mismo criterio que usa cantidadDePacks en la hoja.
            // En un pack la cantidad es del pedido entero. En un suelto manda la del
            // plato: un pedido con "1× salsa y 5× pollo" no lleva 5 de cada cosa.
            // Cuantas veces se hace ESTE plato dentro del pack. Un PERSONALIZADO
            // puede llevar 2 de una receta y 4 de otra: Christopher Ulloa lleva 20
            // platos de 8 recetas y salian 8 etiquetas, una por receta.
            const veces = Number(plato.vecesPorPack) > 0 ? Number(plato.vecesPorPack) : 1;
            const cantidad = vecesFijas !== null ? vecesFijas : (esPack
                ? Math.max(packsDelPedido, plato.cantidad || 1) * veces
                : (plato.cantidad || 1) * veces);
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
        sueltos.forEach(p => agregar(p, TIPO_INDIVIDUAL));
        platosCena.forEach(p => agregar(p, `${tipo} Cena`));
        // Los desayunos van con su propio tipo, no con el del pack: el envase
        // dice "Desayuno", no "Bajo Calorías".
        platosDesayuno.forEach(p => agregar(p, TIPO_ETIQUETA.desayuno, packsDeDesayuno));
    });

    const groups = [...grupos.values()].sort((a, b) => {
        // Primero el orden de impresión; dentro del bloque, el plato más pedido
        const oa = ordenDeTipo(a.tipo), ob = ordenDeTipo(b.tipo);
        if (oa !== ob) return oa - ob;
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
export const expandGroupsToLabels = (groups, expirationDate, opciones = {}) => {
    const { conDivisores = false } = opciones;
    const vence = formatExpirationDate(expirationDate);
    const labels = [];
    let bloqueActual = null;

    groups.forEach(g => {
        // Una etiqueta suelta al empezar cada bloque, para partir la tira sobre la
        // mesa y no tener que leer plato por plato dónde empieza el Full Pack.
        if (conDivisores && g.tipo !== bloqueActual) {
            labels.push({
                groupId: `divisor-${g.tipo}`,
                divider: true,
                type: g.tipo,
                protein: '',
                expirationDate: ''
            });
            bloqueActual = g.tipo;
        }

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
