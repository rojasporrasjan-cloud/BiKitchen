/**
 * Arma la lista de clientes para las difusiones de WhatsApp, a partir de los pedidos.
 *
 * No hay una colección de "clientes" confiable para esto: el mismo cliente puede
 * tener pedidos con el correo escrito distinto, o con correo inventado a partir
 * del teléfono (ver DOMINIO_SIN_CORREO en buildPedidoFromImport). Por eso la
 * identidad se arma con el TELÉFONO, que es lo único que siempre está y es lo
 * que se usa para escribirle por WhatsApp.
 *
 * Todo acá es función pura: entra la lista de pedidos, sale la de clientes. La
 * pantalla solo muestra. Así se puede probar sin Firebase.
 */

import { getScheduleFromOrder } from './orderDates';
import { getSubscriptionProgress } from './subscriptionProgress';
import { DOMINIO_SIN_CORREO } from './buildPedidoFromImport';

/** Pedidos que no cuentan para saber qué le pasa a un cliente. */
const ESTADOS_MUERTOS = ['cancelled', 'cancelado', 'refunded', 'pending_payment'];

/**
 * Los 8 dígitos finales del teléfono. "8721-6592", "87216592" y "+506 8721 6592"
 * son la misma persona, y si no se normaliza aparece tres veces en la lista.
 */
export const normalizarTelefono = (telefono) => {
    const digitos = String(telefono || '').replace(/\D/g, '');
    return digitos.length > 8 ? digitos.slice(-8) : digitos;
};

const aFecha = (valor) => {
    if (!valor) return null;
    const d = valor?.toDate ? valor.toDate() : new Date(valor);
    return isNaN(d.getTime()) ? null : d;
};

const diasEntre = (desde, hasta) => Math.round((hasta - desde) / 86400000);

/** El correo inventado a partir del teléfono no sirve para escribirle a nadie. */
const correoReal = (correo) => {
    const c = String(correo || '').trim().toLowerCase();
    return c && !c.endsWith(DOMINIO_SIN_CORREO) ? c : '';
};

/**
 * Agrupa los pedidos por cliente y calcula lo que hace falta para segmentar.
 *
 * @param {object[]} orders - documentos de `pedidos`
 * @param {Date} [hoy]
 * @returns {object[]} un registro por cliente, del más reciente al más viejo
 */
export const construirClientes = (orders = [], hoy = new Date()) => {
    const porTelefono = new Map();

    orders.forEach((o) => {
        const estado = String(o?.status || '').toLowerCase();
        if (ESTADOS_MUERTOS.includes(estado)) return;

        const telefono = normalizarTelefono(o?.telefono);
        if (!telefono) return; // sin teléfono no hay a quién escribirle

        const creado = aFecha(o?.createdAt);
        const entregas = getScheduleFromOrder(o).filter(Boolean).sort();
        const ultimaEntrega = entregas[entregas.length - 1] || o?.fecha_entrega || null;

        const previo = porTelefono.get(telefono);
        const monto = Number(o?.totalValue ?? o?.total) || 0;

        if (!previo) {
            porTelefono.set(telefono, {
                telefono,
                telefonoOriginal: o?.telefono || '',
                nombre: o?.cliente || 'Sin nombre',
                correo: correoReal(o?.correo),
                zona: o?.zona_envio || '',
                planes: new Set([o?.plan].filter(Boolean)),
                totalPedidos: 1,
                totalGastado: monto,
                primerPedido: creado,
                ultimoPedido: creado,
                ultimaEntrega,
                // El pedido que manda para "en qué semana va": el que llega más
                // lejos en el tiempo, o sea su pack todavía en curso.
                pedidoVigente: o,
                aceptaPromos: o?.aceptaPromos !== false
            });
            return;
        }

        previo.totalPedidos += 1;
        previo.totalGastado += monto;
        if (o?.plan) previo.planes.add(o.plan);
        if (creado && (!previo.primerPedido || creado < previo.primerPedido)) previo.primerPedido = creado;
        // El pedido más nuevo manda: es el nombre y la zona que valen hoy
        if (creado && (!previo.ultimoPedido || creado > previo.ultimoPedido)) {
            previo.ultimoPedido = creado;
            previo.nombre = o?.cliente || previo.nombre;
            previo.zona = o?.zona_envio || previo.zona;
        }
        if (!previo.correo) previo.correo = correoReal(o?.correo);
        if (ultimaEntrega && (!previo.ultimaEntrega || ultimaEntrega > previo.ultimaEntrega)) {
            previo.ultimaEntrega = ultimaEntrega;
            previo.pedidoVigente = o;
        }
        if (o?.aceptaPromos === false) previo.aceptaPromos = false;
    });

    return [...porTelefono.values()]
        .map((c) => {
            // Mismo cálculo que usa el módulo de Packs Mensuales, no una copia:
            // así "Semana 2 de 4" dice lo mismo en las dos pantallas.
            const suscripcion = getSubscriptionProgress(c.pedidoVigente || {}, hoy);
            return {
                ...c,
                planes: [...c.planes],
                suscripcion,
                entregasRestantes: Math.max(suscripcion.total - suscripcion.completadas, 0),
                diasDesdeUltimoPedido: c.ultimoPedido ? diasEntre(c.ultimoPedido, hoy) : null,
                diasParaUltimaEntrega: c.ultimaEntrega
                    ? diasEntre(hoy, new Date(`${c.ultimaEntrega}T12:00:00`))
                    : null
            };
        })
        .sort((a, b) => (b.ultimoPedido || 0) - (a.ultimoPedido || 0));
};

/**
 * Los segmentos disponibles.
 *
 * `aplicar` recibe la lista ya construida y devuelve a quiénes les toca. Cada uno
 * responde a un mensaje distinto que Gina manda de verdad, no son categorías
 * inventadas.
 */
export const SEGMENTOS = [
    {
        id: 'renovacion',
        label: 'Se les acaba el pack',
        descripcion: 'Su última entrega cae dentro de los próximos días. Es el mensaje de renovación.',
        opcion: { campo: 'dias', label: 'Días de aviso', valor: 7 },
        aplicar: (clientes, { dias = 7 } = {}) => clientes.filter(
            (c) => c.diasParaUltimaEntrega !== null
                && c.diasParaUltimaEntrega >= 0
                && c.diasParaUltimaEntrega <= dias
        )
    },
    {
        id: 'packEnCurso',
        label: 'Packs en curso',
        descripcion: 'Packs de varias entregas que todavía no terminan. Filtra por cuántas entregas les quedan.',
        opcion: { campo: 'dias', label: 'Les quedan N entregas o menos', valor: 1 },
        aplicar: (clientes, { dias = 1 } = {}) => clientes.filter(
            (c) => c.suscripcion.total > 1
                && !c.suscripcion.finalizado
                && c.entregasRestantes <= dias
        )
    },
    {
        id: 'dormidos',
        label: 'Hace rato no piden',
        descripcion: 'Su última entrega ya pasó hace más de X días. Mensaje de recuperación.',
        opcion: { campo: 'dias', label: 'Días sin pedir', valor: 30 },
        aplicar: (clientes, { dias = 30 } = {}) => clientes.filter(
            (c) => c.diasParaUltimaEntrega !== null && c.diasParaUltimaEntrega < -dias
        )
    },
    {
        id: 'nuevos',
        label: 'Clientes nuevos',
        descripcion: 'Hicieron su primer pedido hace poco. Para dar seguimiento.',
        opcion: { campo: 'dias', label: 'Días desde el primero', valor: 30 },
        aplicar: (clientes, { dias = 30 } = {}, hoy = new Date()) => clientes.filter(
            (c) => c.primerPedido && diasEntre(c.primerPedido, hoy) <= dias
        )
    },
    {
        id: 'zona',
        label: 'Por zona',
        descripcion: 'Todos los de una zona de entrega.',
        opcion: { campo: 'texto', label: 'Zona', valor: '' },
        aplicar: (clientes, { texto = '' } = {}) => {
            const q = texto.trim().toLowerCase();
            if (!q) return [];
            return clientes.filter((c) => c.zona.toLowerCase().includes(q));
        }
    },
    {
        id: 'pack',
        label: 'Por pack que compran',
        descripcion: 'Los que han pedido cierto pack. Útil cuando el menú de la semana les cuadra.',
        opcion: { campo: 'texto', label: 'Nombre del pack', valor: '' },
        aplicar: (clientes, { texto = '' } = {}) => {
            const q = texto.trim().toLowerCase();
            if (!q) return [];
            return clientes.filter((c) => c.planes.some((p) => p.toLowerCase().includes(q)));
        }
    },
    {
        id: 'todos',
        label: 'Todos los clientes',
        descripcion: 'Toda la base. Para el menú de la semana o un anuncio general.',
        opcion: null,
        aplicar: (clientes) => clientes
    }
];

/**
 * Aplica un segmento.
 *
 * Siempre saca a los que dijeron que no quieren promociones — eso no es opcional
 * ni se puede saltar desde la pantalla (Ley 8968).
 */
export const aplicarSegmento = (clientes, segmentoId, opciones = {}, hoy = new Date()) => {
    const segmento = SEGMENTOS.find((s) => s.id === segmentoId);
    if (!segmento) return [];
    return segmento.aplicar(clientes, opciones, hoy).filter((c) => c.aceptaPromos);
};
