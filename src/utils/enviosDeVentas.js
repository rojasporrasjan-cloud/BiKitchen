/**
 * A quién le llegan los envíos nuevos para vender más (Jan, 8 oct 2026: "si,
 * deja todo listo"). Cada función programada solo lee, llama a esto y manda;
 * las reglas viven acá para probarlas sin red:
 *
 *   - Seguimiento a las 20 h (seguimiento-consulta.js): escribió por WhatsApp
 *     hace 18–24 h y no tiene pedido vivo. Dentro de las 24 h el mensaje libre
 *     es gratis. Uno por persona cada 7 días.
 *   - Pasate al mensual (pasate-al-mensual.js): compra semanal, tuvo entrega en
 *     los últimos 7 días o tiene una por venir, y no tiene un mensual vivo.
 *   - Menú de la semana por tipo (menu-de-la-semana.js): compró ese tipo de pack
 *     y su última entrega fue hace 3 a 8 semanas, sin nada después.
 */

import { entregasDelPedido } from './proteinasPorEntrega';
import { sumarDias } from './avisosDePago';
import { normalizarTelefono, esTelefonoDeRelleno } from './telefonoRelleno';
import { imprimeEnHoja } from './estadosPedido';
import { nombreClave } from './cierresDePedidos';

const esCancelado = (p) => /^cancel|rechaz|reembols/i.test(String(p?.status || p?.estado || ''));
const telDe = (p) => normalizarTelefono(p?.telefono);
const nombreDelPack = (p) => String(p?.plan || p?.items?.[0]?.nombre || p?.items?.[0]?.name || '');
const vivos = (pedidos = []) => {
    const vistos = new Set();
    return (pedidos || []).filter(p => p && !esCancelado(p) && !esTelefonoDeRelleno(p.telefono)
        && telDe(p).length === 8 && (vistos.has(p.id) ? false : vistos.add(p.id)));
};

// ── Seguimiento a las 20 horas ────────────────────────────────────────────

export const SEGUIMIENTO_DESDE_HORAS = 18;
export const SEGUIMIENTO_HASTA_HORAS = 23.5; // antes de que se cierre la ventana de 24 h
export const SEGUIMIENTO_CADA_DIAS = 7;

/**
 * ¿Le toca el seguimiento a esta ficha de Kommo (kommo_contactos)?
 * @param {object} ficha   { ultimoEntrante, noMolestarDesde, seguimientoEn }
 * @param {boolean} tienePedido  si ya tiene un pedido vivo (lo averigua la función)
 */
export const leTocaSeguimiento = (ficha, { ahora = new Date(), tienePedido = false, noMolestar = false } = {}) => {
    if (!ficha?.ultimoEntrante || tienePedido || noMolestar) return false;
    const horas = (ahora - new Date(ficha.ultimoEntrante)) / 3600000;
    if (horas < SEGUIMIENTO_DESDE_HORAS || horas > SEGUIMIENTO_HASTA_HORAS) return false;
    if (ficha.seguimientoEn) {
        const dias = (ahora - new Date(ficha.seguimientoEn)) / 86400000;
        if (dias < SEGUIMIENTO_CADA_DIAS) return false;
    }
    return true;
};

/** ¿Este teléfono ya tiene un pedido vivo (con una entrega de hoy en adelante, o hecho en los últimos 3 días)? */
export const tienePedidoVivo = (pedidos = [], hoy, ahora = new Date()) => vivos(pedidos).some((p) => {
    if (entregasDelPedido(p).some(f => f >= hoy)) return true;
    const creado = p.createdAt?.toMillis?.() ?? (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : Date.parse(p.createdAt || ''));
    return Number.isFinite(creado) && (ahora - creado) < 3 * 86400000;
});

// ── Pasate al mensual ─────────────────────────────────────────────────────

const esMensual = (p) => /mensual|quincenal|dos semanas|2 semanas|semanas/i.test(`${nombreDelPack(p)} ${p?.items?.[0]?.nombre || ''}`)
    || ['monthly', 'biweekly'].includes(p?.items?.[0]?.plan);
const esPackSemanal = (p) => !esMensual(p) && /pack|casadit|semanal/i.test(nombreDelPack(p))
    && !/prote[ií]na|individual|familiar/i.test(nombreDelPack(p));

/**
 * Compradores de pack semanal que podrían pasarse al mensual: tuvieron entrega
 * en los últimos 7 días o tienen una por venir, y ningún mensual vivo.
 * @returns {Array<{pedido, fecha, ultima}>}
 */
export const paraPasarseAlMensual = (pedidos = [], hoy) => {
    const lista = vivos(pedidos).filter(imprimeEnHoja);
    const conMensual = new Set(lista.filter(p => esMensual(p) && entregasDelPedido(p).some(f => f >= hoy)).map(telDe));
    const porTelefono = new Map();
    lista.filter(esPackSemanal).forEach((p) => {
        const tel = telDe(p);
        if (conMensual.has(tel)) return;
        const reciente = entregasDelPedido(p).filter(f => f >= sumarDias(hoy, -7)).slice(-1)[0];
        if (!reciente) return;
        const previo = porTelefono.get(tel);
        if (!previo || reciente > previo.fecha) porTelefono.set(tel, { pedido: p, fecha: reciente, ultima: false });
    });
    return [...porTelefono.values()].sort((a, b) => String(a.pedido.cliente).localeCompare(String(b.pedido.cliente)));
};

// ── Menú de la semana por tipo de pack ────────────────────────────────────

export const FAMILIAS_DE_MENU = [
    { id: 'keto', label: 'Keto', patron: /keto/i, bot: 'KOMMO_BOT_MENU_KETO', plantilla: 'menu_semana_keto' },
    { id: 'casaditos', label: 'Casaditos', patron: /casadit/i, bot: 'KOMMO_BOT_MENU_CASADITOS', plantilla: 'menu_semana_casaditos' },
    { id: 'familiar', label: 'Familiar', patron: /famil/i, bot: 'KOMMO_BOT_MENU_FAMILIAR', plantilla: 'menu_semana_familiar' },
    { id: 'bajo-calorias', label: 'Bajo en calorías', patron: /bajo|calor/i, bot: 'KOMMO_BOT_MENU_BAJO_CALORIAS', plantilla: 'menu_semana_bajo_calorias' }
];
export const MENU_DESDE_SEMANAS = 8;
export const MENU_HASTA_SEMANAS = 3;

/** La familia del pack de un pedido, en el orden de FAMILIAS_DE_MENU (keto gana a bajo calorías). */
export const familiaDelPedido = (p) => FAMILIAS_DE_MENU.find(f => f.patron.test(nombreDelPack(p)))?.id || null;

/**
 * Por familia: los que compraron ese tipo y su ÚLTIMA entrega (de cualquier
 * pedido) fue hace 3 a 8 semanas. Si volvió a pedir, no se le escribe.
 * @returns {{ [familia]: Array<{pedido, fecha, ultima}> }}
 */
export const paraMenuDeLaSemana = (pedidos = [], hoy) => {
    const desde = sumarDias(hoy, -7 * MENU_DESDE_SEMANAS);
    const hasta = sumarDias(hoy, -7 * MENU_HASTA_SEMANAS);
    const ultimaPorTelefono = new Map();
    vivos(pedidos).forEach((p) => {
        const ultima = entregasDelPedido(p).slice(-1)[0];
        if (!ultima) return;
        const tel = telDe(p);
        const previa = ultimaPorTelefono.get(tel);
        if (!previa || ultima > previa.fecha) ultimaPorTelefono.set(tel, { pedido: p, fecha: ultima, ultima: false });
    });
    // Quien volvió con OTRO teléfono o sin teléfono (Evelyn Montes, 8 oct 2026)
    // se reconoce por el nombre completo: no se le manda "ya está el menú".
    const volvieron = new Set((pedidos || [])
        .filter(p => p && !esCancelado(p) && entregasDelPedido(p).some(f => f > hasta))
        .map(nombreClave).filter(n => n.includes(' ')));
    const salida = Object.fromEntries(FAMILIAS_DE_MENU.map(f => [f.id, []]));
    [...ultimaPorTelefono.values()]
        .filter(({ pedido, fecha }) => imprimeEnHoja(pedido) && fecha >= desde && fecha <= hasta
            && !volvieron.has(nombreClave(pedido)))
        .forEach((item) => {
            const fam = familiaDelPedido(item.pedido);
            if (fam) salida[fam].push(item);
        });
    return salida;
};
