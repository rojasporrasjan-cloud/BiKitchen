/**
 * Los cambios que el cliente pide él mismo, desde el link que le llega por
 * WhatsApp.
 *
 * "cada miércoles poder mandar un mensaje a las personas que tienen packs
 *  mensuales […] y mandarles un link en el cual puedan pedir si quieren algún
 *  cambio […] y que esa info se guarde en nuestro sistema automático"
 *  — Jan, 25 set 2026.
 *
 * Este archivo es la regla, y lo usan los DOS lados: la página del cliente,
 * para mostrar qué puede elegir, y la función del servidor, para no guardar
 * nada que la página no debió dejar pasar. Si la regla viviera dos veces, un
 * día dirían cosas distintas y el cliente vería "listo" con un cambio que la
 * cocina nunca recibe.
 *
 * Lo que se decidió con Jan:
 *   - Los cambios cierran A LA MISMA HORA QUE LOS PEDIDOS (decisión de Jan,
 *     2 oct 2026, para que el cliente y la cocina tengan una sola regla):
 *       entrega del miércoles → lunes 7 p. m.
 *       entrega del sábado    → jueves 7 p. m.
 *       entrega del lunes     → viernes 7 p. m.
 *     Antes era el miércoles 8 p. m. para sábado y lunes, y Gina les decía a
 *     los clientes el viernes 7 p. m.: el link les cerraba antes de tiempo.
 *   - Solo se elige de la lista de sustituciones de Gina (config/substitutions):
 *     la cocina nunca recibe algo que no tiene.
 *   - Máximo 2 cambios por pack (limiteDeCambios.js).
 */

import { mapPackNameToMenuKey } from './packClassification';
import { esPackDeProteinas, cuantasProteinas, entregasDelPedido, elegidasPara } from './proteinasPorEntrega';
import { MAX_CAMBIOS_POR_PACK } from './limiteDeCambios';

/** 7 p. m. en Costa Rica (UTC-6, sin horario de verano): la del cierre de pedidos. */
export const HORA_LIMITE_CR = 19;
const DESFASE_CR_HORAS = 6;

/**
 * Cuántos días antes de la entrega se cierra, según el día que se entrega.
 *
 * Igual que el cierre de pedidos de Gina: el lunes cierra el viernes (3 días
 * antes); el miércoles y el sábado, dos días antes. Los días que no son de
 * reparto, por si acaso, también dos días antes.
 */
const DIAS_ANTES = { 1: 3, 3: 2, 6: 2, 0: 2, 2: 2, 4: 2, 5: 2 };

const texto = (x) => String(typeof x === 'string' ? x : (x?.nombre || '')).trim();

/** El momento exacto en que se cierra la entrega (un Date en UTC). */
export const horaLimiteDe = (fecha) => {
    const dia = new Date(`${fecha}T00:00:00Z`);
    if (Number.isNaN(dia.getTime())) return null;
    const cierre = new Date(dia);
    cierre.setUTCDate(cierre.getUTCDate() - (DIAS_ANTES[dia.getUTCDay()] ?? 3));
    cierre.setUTCHours(HORA_LIMITE_CR + DESFASE_CR_HORAS, 0, 0, 0);
    return cierre;
};

export const estaCerrada = (fecha, ahora = new Date()) => {
    const cierre = horaLimiteDe(fecha);
    return !cierre || ahora.getTime() >= cierre.getTime();
};

/** "jueves 24 de setiembre, 7 p. m." — para decirle al cliente hasta cuándo. */
export const horaLimiteEnPalabras = (fecha) => {
    const cierre = horaLimiteDe(fecha);
    if (!cierre) return '';
    const enCR = new Date(cierre.getTime() - DESFASE_CR_HORAS * 3600000);
    const dia = enCR.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    // "miércoles, 23 de septiembre" → "miércoles 23 de setiembre", como se dice acá
    const hora = HORA_LIMITE_CR > 12 ? `${HORA_LIMITE_CR - 12} p. m.` : `${HORA_LIMITE_CR} a. m.`;
    return `${dia.replace(/^(\p{L}+),/u, '$1').replace('septiembre', 'setiembre')}, ${hora}`;
};

/** La entrega que todavía se puede cambiar, o null si ya no queda ninguna. */
export const entregaAbierta = (pedido, ahora = new Date()) =>
    entregasDelPedido(pedido).find(f => !estaCerrada(f, ahora)) || null;

/** De qué familia del menú es el pedido ("bajoCalorias", "regular"…), o null. */
export const familiaDelPedido = (pedido) => {
    const nombres = [
        pedido?.plan,
        ...(Array.isArray(pedido?.items) ? pedido.items.map(i => i?.nombre) : []),
        ...(Array.isArray(pedido?.menu) ? pedido.menu.map(i => i?.nombre) : [])
    ].filter(Boolean);
    for (const n of nombres) {
        const clave = mapPackNameToMenuKey(n);
        if (clave) return clave;
    }
    return null;
};

/** ¿Lleva también las cenas? "Almuerzo y cena", sin decir "solo almuerzos". */
export const llevaCena = (pedido) => {
    const n = [pedido?.plan, ...(pedido?.items || []).map(i => i?.nombre)].join(' ');
    return /\bcenas?\b/i.test(n) && !/solo\s+almuerzos?/i.test(n);
};

/** Los platos de una lista del menú, limpios: [{ numero, proteina, vegetal, carbo }]. */
const limpiarPlatos = (lista) => (Array.isArray(lista) ? lista : [])
    .map((p, i) => ({
        numero: Number(p?.numero) || i + 1,
        proteina: texto(p?.proteina),
        vegetal: texto(p?.vegetal),
        carbo: texto(p?.carbo)
    }))
    .filter(p => p.proteina);

/**
 * Lo que el cliente ve y puede tocar esta semana.
 *
 * @param {object} pedido       el documento de Firestore
 * @param {object} menus        menus_oficial/current
 * @param {object} sustituciones config/substitutions
 * @returns {null | {
 *   tipo: 'menu'|'proteinas', familia, packs, maxCambios,
 *   almuerzos: Array, cenas: Array,
 *   opciones: { proteina: string[], vegetal: string[], carbo: string[] },
 *   proteinas?: { cuantas: number, disponibles: string[] }
 * }}  null si el pedido no es de algo que se pueda cambiar desde el link
 */
export const loQueSePuedeCambiar = (pedido, menus, sustituciones) => {
    const packs = Math.max(1, Number(pedido?.items?.[0]?.cantidad) || 1);

    if (esPackDeProteinas(pedido)) {
        const disponibles = (menus?.proteinasDisponibles || []).map(texto).filter(Boolean);
        if (disponibles.length === 0) return null;
        return {
            tipo: 'proteinas',
            familia: null,
            packs,
            maxCambios: 0,
            almuerzos: [],
            cenas: [],
            opciones: { proteina: [], vegetal: [], carbo: [] },
            proteinas: { cuantas: cuantasProteinas(pedido), disponibles }
        };
    }

    const familia = familiaDelPedido(pedido);
    const almuerzos = limpiarPlatos(menus?.[familia]);
    if (!familia || almuerzos.length === 0) return null;

    return {
        tipo: 'menu',
        familia,
        packs,
        maxCambios: MAX_CAMBIOS_POR_PACK,
        almuerzos,
        cenas: llevaCena(pedido) ? limpiarPlatos(menus?.cena?.[familia]) : [],
        opciones: {
            proteina: (sustituciones?.proteins || []).map(texto).filter(Boolean),
            vegetal: (sustituciones?.vegetables || []).map(texto).filter(Boolean),
            carbo: (sustituciones?.carbos || []).map(texto).filter(Boolean)
        }
    };
};

const PARTES = ['proteina', 'vegetal', 'carbo'];
const MAX_NOTA = 300;

/**
 * Revisa lo que manda la página ANTES de guardarlo.
 *
 * El servidor la corre siempre: la página podría estar vieja, o alguien podría
 * mandar a mano lo que quiera. Nada que no esté en la lista de Gina llega a la
 * cocina.
 *
 * @param {object} permitido  lo que devolvió loQueSePuedeCambiar
 * @param {object} entrada    { cambios: [{ comida, plato, parte, a }], proteinas: [], notas }
 * @returns {{ errores: string[], limpio: object|null }}
 */
export const validarPedidoDeCambios = (permitido, entrada = {}) => {
    const errores = [];
    if (!permitido) return { errores: ['Este pedido no se puede cambiar desde el link.'], limpio: null };

    const notas = String(entrada?.notas || '').trim().slice(0, MAX_NOTA);

    if (permitido.tipo === 'proteinas') {
        const elegidas = (Array.isArray(entrada?.proteinas) ? entrada.proteinas : []).map(texto).filter(Boolean);
        const { cuantas, disponibles } = permitido.proteinas;
        if (elegidas.length !== cuantas) errores.push(`Tenés que elegir ${cuantas} proteínas (elegiste ${elegidas.length}).`);
        const raras = elegidas.filter(p => !disponibles.includes(p));
        if (raras.length) errores.push(`Estas no están en la lista de esta semana: ${raras.join(', ')}.`);
        return { errores, limpio: errores.length ? null : { tipo: 'proteinas', proteinas: elegidas, notas } };
    }

    // Un cambio es "esta parte, este ingrediente → este otro", y vale para
    // TODOS los platos de esa comida que lo llevan. Es como lo aplica la hoja
    // (leerCambioDePack busca el ingrediente por nombre): si el puré va en los
    // platos 2 y 4, "Cambiar Pure de papa por…" cambia los dos. Se cuenta como
    // un solo cambio y el cliente lo ve igual que lo va a cocinar la cocina.
    const cambios = [];
    const porClave = new Map();
    (Array.isArray(entrada?.cambios) ? entrada.cambios : []).forEach((c) => {
        const comida = c?.comida === 'cena' ? 'cena' : 'almuerzo';
        const platos = comida === 'cena' ? permitido.cenas : permitido.almuerzos;
        const parte = PARTES.includes(c?.parte) ? c.parte : null;
        const porNumero = platos.find(p => p.numero === Number(c?.plato));
        const de = texto(c?.de) || (porNumero && parte ? porNumero[parte] : '');
        const a = texto(c?.a);
        const suyos = parte ? platos.filter(p => p[parte] && p[parte] === de) : [];
        if (!parte || suyos.length === 0) { errores.push('Hay un cambio que no corresponde a ningún plato del menú.'); return; }
        if (!permitido.opciones[parte].includes(a)) { errores.push(`«${a}» no está en las opciones de cambio.`); return; }
        if (a === de) return;                                 // cambiar por lo mismo no es un cambio
        const clave = `${comida}|${parte}|${de}`;
        if (porClave.has(clave)) {
            if (porClave.get(clave) !== a) errores.push(`«${de}» tiene dos cambios distintos.`);
            return;
        }
        porClave.set(clave, a);
        cambios.push({ comida, parte, de, a, platos: suyos.map(p => p.numero) });
    });

    const tope = permitido.maxCambios * permitido.packs;
    if (cambios.length > tope) {
        errores.push(`Se pueden hacer hasta ${tope} cambio${tope === 1 ? '' : 's'} por entrega.`);
    }
    if (cambios.length === 0 && !notas) errores.push('No elegiste ningún cambio.');

    return { errores, limpio: errores.length ? null : { tipo: 'menu', cambios, notas } };
};

/**
 * El texto que lee la hoja, en la forma exacta que ya entiende.
 *
 * `leerCambioDePack` (desayunosPersonalizados.js) busca "Cambiar X por Y",
 * una cláusula por "·", con X tal como está en el menú. Es lo mismo que se
 * escribía a mano para Karla Juárez o Nick Araya: nada nuevo que aprender.
 *
 * La nota libre del cliente NO puede disparar un cambio: si escribe "cambiar
 * el arroz por ensalada" ahí, la cocina lo aplicaría sin pasar por la lista de
 * Gina. En la nota esa palabra queda como "cambio"; Gina la lee igual, y el
 * texto original queda guardado en `cambiosDelLink`.
 */
export const textoParaLaHoja = (limpio) => {
    if (!limpio) return '';
    const lineas = limpio.tipo === 'menu'
        ? limpio.cambios.map(c => `Cambiar ${c.de} por ${c.a}${c.comida === 'cena' ? ' (cena)' : ''}`)
        : [];
    const nota = String(limpio.notas || '').replace(/cambiar/gi, 'cambio').trim();
    if (nota) lineas.push(`Nota del cliente: ${nota}`);
    return lineas.join(' · ');
};

const quitarTexto = (base, pedazo) => {
    if (!pedazo) return base;
    return base.split(pedazo).join('').replace(/(\s*·\s*){2,}/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
};

/**
 * Lo que se escribe en el pedido, o null si no hay nada que guardar.
 *
 * DOS CAMPOS, y cada uno con su dueño:
 *
 *   cambiosPorEntrega[fecha]  → TEXTO. Es el que lee la hoja (notasDeLaEntrega
 *                               en logisticsUtils.js) y lo pueden haber escrito
 *                               Gina o la otra cuenta a mano. Acá solo se
 *                               AGREGA la parte del link; lo que ya había se
 *                               respeta. Si el cliente vuelve a mandar, se
 *                               reemplaza solo lo que había puesto él.
 *   cambiosDelLink[fecha]     → el detalle (qué, cuándo, desde dónde) para el
 *                               panel. La hoja no lo lee.
 *
 * Se manda el mapa COMPLETO de fechas, no un campo punteado: con una fecha
 * ("2026-09-28") adentro de un campo punteado es fácil escribir mal la ruta, y
 * un campo mal escrito no falla, se guarda en otro lado y la hoja no lo ve.
 * Es la misma regla de `cambioDeProteinas`.
 */
/**
 * Lo que el link muestra ya marcado al abrirlo.
 *
 * En un pack de proteínas manda lo guardado PARA ESA ENTREGA
 * (`proteinasPorEntrega`), no lo que el cliente mandó por el link: Jan o Gina
 * pueden haberlas elegido o cambiado después desde "Proteínas de la semana", y
 * el cliente tiene que ver lo mismo que va a cocinar la hoja. Solo las que
 * están en la lista de la semana (escritas como en la lista): una que no está
 * no se puede ver ni quitar con los botones y trabaría el "Elegiste N de N".
 */
export const loGuardadoParaElLink = (pedido, fecha, permitido) => {
    const delLink = pedido?.cambiosDelLink?.[fecha] || null;
    if (permitido?.tipo !== 'proteinas') return delLink;
    const elegidas = elegidasPara(pedido, fecha) || [];
    if (!delLink && elegidas.length === 0) return null;
    const comoEnLaLista = new Map((permitido.proteinas?.disponibles || []).map(d => [texto(d).toLowerCase(), d]));
    const proteinas = elegidas.map(p => comoEnLaLista.get(texto(p).toLowerCase())).filter(Boolean);
    return { ...(delLink || {}), proteinas };
};

export const cambioParaGuardar = (pedido, fecha, limpio, { ahora = new Date() } = {}) => {
    if (!fecha || !limpio) return null;

    const texto = textoParaLaHoja(limpio);
    const anterior = pedido?.cambiosDelLink?.[fecha]?.texto || '';
    const escrito = pedido?.cambiosPorEntrega?.[fecha];
    const base = quitarTexto(typeof escrito === 'string' ? escrito : '', anterior);
    const combinado = [base, texto].filter(Boolean).join(' · ');

    const cambiosPorEntrega = { ...(pedido?.cambiosPorEntrega || {}) };
    if (combinado) cambiosPorEntrega[fecha] = combinado; else delete cambiosPorEntrega[fecha];

    const registro = {
        ...(limpio.tipo === 'menu' ? { cambios: limpio.cambios } : { proteinas: limpio.proteinas }),
        notas: limpio.notas || '',
        texto,
        guardadoEn: ahora.toISOString(),
        origen: 'link-del-cliente'
    };
    const salida = {
        cambiosPorEntrega,
        cambiosDelLink: { ...(pedido?.cambiosDelLink || {}), [fecha]: registro }
    };
    // Los packs de proteínas ya tienen su lugar por fecha, que la hoja, las
    // etiquetas y el despacho ya leen (proteinasPorEntrega.js).
    if (limpio.tipo === 'proteinas') {
        salida.proteinasPorEntrega = { ...(pedido?.proteinasPorEntrega || {}), [fecha]: limpio.proteinas };
    }
    return salida;
};
