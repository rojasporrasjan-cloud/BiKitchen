/**
 * A quién le toca cada aviso alrededor de la entrega (Jan, 4 oct 2026):
 *
 *   - HOY TE LLEGA: la mañana del reparto, a todo el que recibe ese día.
 *   - GUÍA DE CONGELADO: la tarde de la PRIMERA entrega de cada pedido, la
 *     tarjeta de cómo guardar y en qué orden comer los platos.
 *   - ¿QUÉ TAL TODO?: al día siguiente de la primera entrega de un cliente
 *     NUEVO (ese teléfono nunca había recibido nada).
 *   - VOLVER A INVITAR: a quien recibió su última entrega hace 2 a 3 semanas y
 *     no volvió a pedir.
 *
 * Lo usan las funciones que mandan (hoy-te-llega, guia-de-congelado,
 * que-tal-todo, volver-a-invitar) y la pantalla Listas de Difusión, para que la
 * lista que se ve sea exactamente la que sale.
 */

import { entregasDelPedido } from './proteinasPorEntrega';
import { imprimeEnHoja } from './estadosPedido';
import { sumarDias } from './avisosDePago';
import { normalizarTelefono, esTelefonoDeRelleno } from './telefonoRelleno';

/** Ventana del "volver a invitar": última entrega entre hace 21 y hace 14 días. */
export const INVITAR_DESDE_DIAS = 21;
export const INVITAR_HASTA_DIAS = 14;

const esCancelado = (p) => /^cancel|rechaz|reembols/i.test(String(p?.status || p?.estado || ''));
const telDe = (p) => normalizarTelefono(p?.telefono);
const conTelefono = (p) => !esTelefonoDeRelleno(p?.telefono);

/** Uno por pedido aunque dos consultas lo traigan. */
const sinRepetir = (pedidos = []) => {
    const vistos = new Set();
    return (pedidos || []).filter(p => p && (vistos.has(p.id) ? false : vistos.add(p.id)));
};

/**
 * Hoy te llega: pedidos que salen en la hoja (pagados, no cancelados) con una
 * entrega HOY. Uno sin pagar puede no salir, por eso queda afuera.
 */
export const entreganHoy = (pedidos = [], hoy) => sinRepetir(pedidos)
    .filter(p => imprimeEnHoja(p) && entregasDelPedido(p).includes(hoy))
    .map(pedido => ({ pedido, fecha: hoy, ultima: false }));

/** Guía de congelado: la PRIMERA entrega de ese pedido es hoy. */
export const primeraEntregaHoy = (pedidos = [], hoy) => sinRepetir(pedidos)
    .filter(p => imprimeEnHoja(p) && entregasDelPedido(p)[0] === hoy)
    .map(pedido => ({ pedido, fecha: hoy, ultima: false }));

/**
 * ¿Es cliente nuevo? Ningún OTRO pedido vivo de ese teléfono tiene una entrega
 * antes de la primera de este. `otros` son los pedidos de ese mismo teléfono
 * que se conozcan (la pantalla tiene todos; la función los busca por número).
 */
export const esClienteNuevo = (pedido, otros = []) => {
    const primera = entregasDelPedido(pedido)[0];
    if (!primera) return false;
    const tel = telDe(pedido);
    return !(otros || []).some(o => o && o.id !== pedido.id && !esCancelado(o)
        && telDe(o) === tel && entregasDelPedido(o).some(f => f < primera));
};

/** ¿Qué tal todo?: ayer fue la primera entrega de un cliente nuevo. */
export const nuevosQueRecibieronAyer = (pedidos = [], hoy, historial = pedidos) => {
    const ayer = sumarDias(hoy, -1);
    return sinRepetir(pedidos)
        .filter(p => imprimeEnHoja(p) && conTelefono(p) && entregasDelPedido(p)[0] === ayer)
        .filter(p => esClienteNuevo(p, historial))
        .map(pedido => ({ pedido, fecha: ayer, ultima: false }));
};

/**
 * Volver a invitar: la última entrega de ese teléfono fue entre hace 21 y hace
 * 14 días y no tiene nada después (ni entregas nuevas ni un pedido por venir).
 * Se mira el teléfono, no el pedido: si renovó con otro pedido, no se le escribe.
 */
export const paraVolverAInvitar = (pedidos = [], hoy) => {
    const desde = sumarDias(hoy, -INVITAR_DESDE_DIAS);
    const hasta = sumarDias(hoy, -INVITAR_HASTA_DIAS);
    const vivos = sinRepetir(pedidos).filter(p => !esCancelado(p) && conTelefono(p));
    const ultimaPorTelefono = new Map();
    vivos.forEach((p) => {
        const ultima = entregasDelPedido(p).slice(-1)[0];
        if (!ultima) return;
        const previa = ultimaPorTelefono.get(telDe(p));
        if (!previa || ultima > previa.ultima) ultimaPorTelefono.set(telDe(p), { pedido: p, ultima });
    });
    return [...ultimaPorTelefono.values()]
        .filter(({ pedido, ultima }) => imprimeEnHoja(pedido) && ultima >= desde && ultima <= hasta)
        .map(({ pedido, ultima }) => ({ pedido, fecha: ultima, ultima: false }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
};

/**
 * Las formas en que un mismo número puede estar escrito en `telefono`, para
 * buscar los pedidos de ese cliente con una sola consulta `in` (máx. 10).
 */
export const variantesDeTelefono = (telefono) => {
    const d = normalizarTelefono(telefono);
    if (d.length !== 8) return [];
    const a = d.slice(0, 4);
    const b = d.slice(4);
    return [...new Set([
        d, `${a} ${b}`, `${a}-${b}`, `506${d}`, `+506${d}`, `+506 ${d}`,
        `+506 ${a} ${b}`, `+506 ${a}-${b}`, `506 ${a} ${b}`, String(telefono || '').trim()
    ])].filter(Boolean).slice(0, 10);
};
