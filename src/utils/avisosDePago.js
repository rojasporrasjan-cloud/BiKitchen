/**
 * A quién le toca un aviso de pago. Lo usan las funciones que mandan
 * (pago-recibido, recordatorio-pago) y la pantalla Listas de Difusión, para que
 * la lista que se ve sea exactamente la que sale.
 */

import { entregasDelPedido } from './proteinasPorEntrega';

/**
 * Sin pagar. 'pending_payment' es como entran los pedidos del importador de
 * WhatsApp y los de SINPE de la página; 'payment_failed', la tarjeta rechazada.
 */
export const ESTADOS_SIN_PAGAR = ['pending_payment', 'payment_failed'];

/** Cuántos días antes de la entrega se recuerda el pago. */
export const DIAS_DE_AVISO = 3;

const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** AAAA-MM-DD de hoy en Costa Rica (UTC-6), aunque el servidor esté en UTC. */
export const hoyEnCostaRica = (ahora = new Date()) =>
    isoDe(new Date(ahora.getTime() - 6 * 3600000 + ahora.getTimezoneOffset() * 60000));

export const sumarDias = (fecha, dias) => {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return isoDe(d);
};

const proximaEntrega = (pedido, hoy) => entregasDelPedido(pedido).find(f => f >= hoy);

/**
 * Pago recibido: confirmado, sin aviso todavía y con una entrega de hoy en
 * adelante (si ya se entregó todo, no tiene sentido). En prueba se salta los
 * que ya tuvieron su muestra, para no repetirla cada 10 minutos.
 */
export const pagosParaAvisar = (pedidos = [], hoy, { prueba = false } = {}) => (pedidos || [])
    .filter(p => p && p.status === 'confirmed' && !p.avisoPagoRecibido && !(prueba && p.avisoPagoRecibidoPrueba))
    .map(pedido => ({ pedido, fecha: proximaEntrega(pedido, hoy), ultima: false }))
    .filter(x => x.fecha);

/** Sin pagar y con la próxima entrega entre hoy y `dias` días. Con o sin aviso. */
export const sinPagarConEntregaCerca = (pedidos = [], hoy, dias = DIAS_DE_AVISO) => {
    const hasta = sumarDias(hoy, dias);
    return (pedidos || [])
        .filter(p => p && ESTADOS_SIN_PAGAR.includes(p.status) && !p.paymentConfirmed)
        .map(pedido => ({ pedido, fecha: proximaEntrega(pedido, hoy), ultima: false }))
        .filter(x => x.fecha && x.fecha <= hasta)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
};

/** Recordatorio de pago: los de arriba que todavía no tuvieron su recordatorio. */
export const pagosPorRecordar = (pedidos = [], hoy, { dias = DIAS_DE_AVISO, prueba = false } = {}) =>
    sinPagarConEntregaCerca(pedidos, hoy, dias)
        .filter(({ pedido }) => !pedido.avisoRecordatorioPago && !(prueba && pedido.avisoRecordatorioPagoPrueba));
