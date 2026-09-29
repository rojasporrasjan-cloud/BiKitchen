/**
 * Lo que ve Gina en su link de packs mensuales (/packs-mensuales/<código>).
 *
 * Gina no entra al panel: trabaja desde su teléfono y su Excel. Este link le
 * muestra, siempre al día, en qué semana va cada pack de varias entregas y a
 * quién se le está por acabar.
 *
 * Usa EXACTAMENTE la misma cuenta que Packs Mensuales del panel
 * (getSubscriptionProgress + packsPorRenovar), para que las dos pantallas nunca
 * digan cosas distintas.
 *
 * Solo sale lo que ella necesita para trabajar: nombre, pack, zona y fechas.
 * NUNCA teléfono, dirección, correo ni montos: el link viaja por WhatsApp.
 */

import { isSubscription, getSubscriptionProgress } from './subscriptionProgress';
import { packsPorRenovar, cuerdaQueLeQueda } from './packsPorRenovar';

/** Cuántos días hacia atrás se muestran los que ya terminaron (para llamarlos a renovar). */
export const DIAS_DE_TERMINADOS = 14;
/** Cuántos días antes de la última entrega un pack pasa a "por renovar". */
export const DIAS_PARA_RENOVAR = 10;

const esCancelado = (p) => /^cancel|rechaz|reembols/i.test(String(p?.status || p?.estado || ''));

const isoDe = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

/** Las fechas que hay que consultar: de hace DIAS_DE_TERMINADOS a 35 días adelante. */
export const fechasParaConsultar = (hoy = new Date()) => {
    const fechas = [];
    for (let d = -DIAS_DE_TERMINADOS; d <= 35; d++) {
        const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
        fechas.push(isoDe(f));
    }
    return fechas;
};

/** Un renglón para la lista de Gina, sin datos de contacto. */
const renglon = (pedido, progress, hoyIso) => {
    const cuerda = cuerdaQueLeQueda(progress, hoyIso);
    return {
        id: pedido.id,
        cliente: String(pedido.cliente || '').trim() || 'Sin nombre',
        pack: String(pedido.plan || pedido.items?.[0]?.nombre || '').trim(),
        zona: pedido.zona_envio && pedido.zona_envio !== 'No especificada' ? String(pedido.zona_envio).trim() : '',
        semanaActual: progress.semanaActual,
        total: progress.total,
        etiqueta: progress.etiqueta,
        fechas: progress.fechas,
        proxima: progress.proxima,
        ultima: cuerda.ultima,
        leQuedan: cuerda.leQuedan,
        diasParaLaUltima: cuerda.diasParaLaUltima,
        finalizado: progress.finalizado,
        sinPagar: /pending|pendiente|por[_\s]?pagar/i.test(String(pedido.status || ''))
    };
};

/**
 * Los packs de varias entregas, en tres grupos.
 *
 * @returns {{ enCurso: Array, porRenovar: Array, terminados: Array }}
 *   enCurso     todos los que tienen entregas por delante, por próxima entrega
 *   porRenovar  a quién escribirle ya (misma regla que el panel)
 *   terminados  los que terminaron en los últimos DIAS_DE_TERMINADOS días
 */
export const resumenDePacks = (pedidos = [], hoy = new Date()) => {
    const hoyIso = isoDe(hoy);
    const vistos = new Set();
    const suscripciones = (pedidos || [])
        .filter(p => p && !esCancelado(p) && isSubscription(p))
        .filter(p => (vistos.has(p.id) ? false : vistos.add(p.id)))
        .map(order => ({ order, progress: getSubscriptionProgress(order, hoy) }));

    const enCurso = suscripciones
        .filter(s => !s.progress.finalizado)
        .map(s => renglon(s.order, s.progress, hoyIso))
        .sort((a, b) => String(a.proxima).localeCompare(String(b.proxima)) || a.cliente.localeCompare(b.cliente, 'es'));

    const porRenovar = packsPorRenovar(suscripciones, hoyIso, DIAS_PARA_RENOVAR)
        .map(s => renglon(s.order, s.progress, hoyIso));

    const terminados = suscripciones
        .filter(s => s.progress.finalizado)
        .map(s => renglon(s.order, s.progress, hoyIso))
        .filter(r => r.diasParaLaUltima !== null && r.diasParaLaUltima >= -DIAS_DE_TERMINADOS)
        .sort((a, b) => String(b.ultima).localeCompare(String(a.ultima)));

    return { enCurso, porRenovar, terminados };
};
