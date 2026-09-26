/**
 * A quién le llega el mensaje del miércoles y con qué datos.
 *
 * Lo usan la pantalla "Cambios de la semana" (para el botón) y la función
 * programada (para el envío automático). Si la regla viviera en los dos lados,
 * el botón y el automático terminarían mandándole a gente distinta.
 *
 * Dos mensajes posibles, uno por cliente:
 *   - CAMBIOS: el menú de la semana y el link para elegir cambios.
 *   - RENOVACIÓN: a quien esta es su ÚLTIMA entrega. Además del link, se le
 *     avisa que el pack se termina, para que renueve a tiempo.
 */

import { loQueSePuedeCambiar } from './cambiosDeLaSemana';
import { entregasDelPedido, esPackDeProteinas, elegidasPara } from './proteinasPorEntrega';
import { consultasParaFechas } from './consultaPorFechas';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * El sábado y el lunes que se cocinan juntos esta semana.
 *
 * El miércoles se manda para el sábado que viene y el lunes siguiente. De
 * jueves en adelante ya se está cocinando ese ciclo, así que se toma el
 * siguiente: un link que abre ya cerrado no le sirve a nadie.
 */
export const proximoCiclo = (hoy = new Date()) => {
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const dia = base.getDay();                     // 0 domingo … 6 sábado
    // Hasta el miércoles: el sábado de esta semana. Del jueves al sábado: el de la próxima.
    const hastaSabado = dia <= 3 ? 6 - dia : 13 - dia;
    const sabado = new Date(base);
    sabado.setDate(base.getDate() + hastaSabado);
    const lunes = new Date(sabado);
    lunes.setDate(sabado.getDate() + 2);
    return { sabado: iso(sabado), lunes: iso(lunes) };
};

const estaVivo = (p) => !/^cancel/i.test(String(p?.status || p?.estado || ''));

/**
 * Los pedidos que reciben link, con su entrega y lo que pueden cambiar.
 *
 * Quedan afuera: cancelados, los que no entregan en esas fechas y los que no
 * tienen nada que cambiar desde el link (individuales, familiares, packs cuya
 * familia no tiene menú cargado). Un pedido con entregas el sábado Y el lunes
 * recibe el link de la PRIMERA: es la que se está por cocinar.
 *
 * @returns {Array<{ pedido, fecha, permitido, ultima: boolean }>}
 */
export const pedidosParaElLink = (pedidos = [], fechas = [], menus, sustituciones) => {
    const vistas = new Set();
    return (pedidos || [])
        .filter(estaVivo)
        .map((pedido) => {
            const entregas = entregasDelPedido(pedido);
            const fecha = fechas.find(f => entregas.includes(f));
            if (!fecha) return null;
            const permitido = loQueSePuedeCambiar(pedido, menus, sustituciones);
            if (!permitido) return null;
            return { pedido, fecha, permitido, ultima: entregas[entregas.length - 1] === fecha && entregas.length > 1 };
        })
        .filter(Boolean)
        // Un mismo pedido puede venir dos veces (las dos consultas lo traen)
        .filter(({ pedido }) => {
            const clave = pedido.id || pedido.numeroOrden;
            if (vistas.has(clave)) return false;
            vistas.add(clave);
            return true;
        })
        .sort((a, b) => String(a.pedido.cliente || '').localeCompare(String(b.pedido.cliente || '')));
};

/** ¿Ya contestó para esa entrega? Devuelve lo que eligió, o null. */
export const respuestaDe = (pedido, fecha) => {
    const r = pedido?.cambiosDelLink?.[fecha] || null;
    if (!r || !esPackDeProteinas(pedido)) return r;
    // Las proteínas que valen son las guardadas para esa entrega: pudieron
    // cambiarse después desde "Proteínas de la semana".
    return { ...r, proteinas: elegidasPara(pedido, fecha) || [] };
};

const soloDigitos = (t) => {
    const d = String(t || '').replace(/\D/g, '');
    return d.length > 8 ? d.slice(-8) : d;
};

/**
 * El cliente en la forma que espera el envío por Kommo (kommoPayload.js).
 *
 * `linkCambios` es el dato nuevo: va a un campo personalizado del contacto y
 * el Salesbot lo pone en el mensaje. Sin teléfono no hay a quién mandarle.
 */
export const destinatarioKommo = ({ pedido, fecha, ultima }, url) => {
    const telefono = soloDigitos(pedido?.telefono);
    if (!telefono || !url) return null;
    const entregas = entregasDelPedido(pedido);
    const numero = entregas.indexOf(fecha) + 1;
    return {
        nombre: String(pedido.cliente || '').trim(),
        telefono,
        telefonoOriginal: pedido.telefono,
        correo: pedido.correoEsPlaceholder ? '' : (pedido.correo || ''),
        zona: pedido.zona_envio || '',
        planes: [pedido.plan || pedido.items?.[0]?.nombre || ''],
        suscripcion: {
            total: entregas.length,
            semanaActual: numero,
            etiqueta: entregas.length > 1 ? `Semana ${numero} de ${entregas.length}` : '',
            proxima: fecha
        },
        entregasRestantes: Math.max(0, entregas.length - numero),
        linkCambios: url,
        ultima: !!ultima
    };
};

// ── El link FIJO: bikitchencr.com/cambios ─────────────────────────────────
//
// Para ponerlo en cualquier mensaje o automatización de Kommo sin variables,
// como el de la impresora. El cliente escribe su WhatsApp y su nombre y lo
// lleva a SU link firmado de siempre (/cambios/<código>): mismas reglas,
// mismo cierre, máximo 2 cambios por pack.
//
// Para no leer los pedidos en cada búsqueda (regla 17) se arma UNA vez por
// semana un índice teléfono → pedidos en `links_cambios/{sábado}`: buscar
// cuesta 1 lectura. Si el número no está y el índice tiene más de un rato, se
// vuelve a armar (alguien pudo hacer el pedido después).

export const INDICE_VIGENTE_MS = 20 * 60 * 1000;

/** El ciclo según la hora de Costa Rica, aunque el servidor esté en UTC. */
export const cicloEnCostaRica = (ahora = new Date()) =>
    proximoCiclo(new Date(ahora.getTime() - 6 * 60 * 60 * 1000 + ahora.getTimezoneOffset() * 60 * 1000));

/** Los pedidos de unas fechas con el SDK de administrador: las dos consultas de la hoja. */
export const leerPedidosDelCiclo = async (db, fechas) => {
    const plan = consultasParaFechas(fechas);
    if (!plan) return [];
    const consultas = [
        ...plan.grupos.map(g => db.collection('pedidos').where('fechas_entrega', 'array-contains-any', g).get()),
        db.collection('pedidos').where('fecha_entrega', '>=', plan.desde).where('fecha_entrega', '<=', plan.hasta).get()
    ];
    const porId = new Map();
    (await Promise.all(consultas)).forEach(snap => snap.docs.forEach(d => porId.set(d.id, { id: d.id, ...d.data() })));
    return [...porId.values()];
};

/** { '88112233': [{ id, fecha, nombre, pack }] } a partir de pedidosParaElLink. */
export const indiceDeTelefonos = (lista = []) => {
    const indice = {};
    lista.forEach(({ pedido, fecha }) => {
        const tel = soloDigitos(pedido?.telefono);
        if (tel.length !== 8) return;
        (indice[tel] = indice[tel] || []).push({
            id: pedido.id,
            fecha,
            nombre: String(pedido.cliente || '').trim(),
            pack: pedido.plan || pedido.items?.[0]?.nombre || ''
        });
    });
    return indice;
};

const palabras = (t) => String(t || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .split(/[^a-z]+/).filter(p => p.length >= 2);

/**
 * ¿El nombre que escribió es el del pedido? Basta el primer nombre ("ana"
 * para "Ana Mora Solís"), sin tildes ni mayúsculas. Con el teléfono solo,
 * cualquiera que sepa un número vería el pedido de otro.
 */
export const nombreCalza = (escrito, delPedido) => {
    const [primero] = palabras(escrito);
    return !!primero && palabras(delPedido).includes(primero);
};

/** Los pedidos de ese teléfono Y ese nombre. Vacío si no calza (sin decir cuál de los dos falló). */
export const buscarEnIndice = (indice = {}, telefono, nombre) =>
    (indice[soloDigitos(telefono)] || []).filter(x => nombreCalza(nombre, x.nombre));

