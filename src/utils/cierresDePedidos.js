/**
 * El cierre de pedidos automático (fase 3 de docs/PLAN_DIFUSIONES_AUTOMATICAS.md).
 *
 * "Hoy cerramos pedidos a las 8 p. m. para la entrega del …": a los clientes que
 * YA compraron para ese día de reparto y esta vez no tienen entrega. Es lo que se
 * mandó a mano el 5 oct 2026 (miércoles, 85 personas) y Jan quiere que salga solo
 * (6 oct 2026: solo clientes que ya compraron, presupuesto US$200 al mes).
 *
 *   Lunes 9 a. m.   → cierre del MIÉRCOLES
 *   Jueves 9 a. m.  → cierre del SÁBADO
 *   Viernes 9 a. m. → cierre del LUNES
 *   (hasta el 8 oct 2026 salía a las 2 p. m.; Jan lo pasó a las 9 a. m.)
 *
 * Aquí vive el QUIÉN y las reglas de marketing; la función programada
 * (netlify/functions/cierre-de-pedidos.js) solo lee, llama y anota. La pantalla
 * Listas de Difusión usa las mismas funciones, así lo que se ve es lo que sale.
 */

import { entregasDelPedido } from './proteinasPorEntrega';
import { sumarDias } from './avisosDePago';
import { normalizarTelefono, esTelefonoDeRelleno } from './telefonoRelleno';
import { noMolestarVigente } from './kommoSync';

/** Qué cierre sale cada día (getDay del día del envío → reparto). */
export const CIERRES = {
    1: { dia: 'miercoles', nombre: 'miércoles', diasHastaEntrega: 2, bot: 'KOMMO_BOT_CIERRE_MIERCOLES' },
    4: { dia: 'sabado', nombre: 'sábado', diasHastaEntrega: 2, bot: 'KOMMO_BOT_CIERRE_SABADO' },
    5: { dia: 'lunes', nombre: 'lunes', diasHastaEntrega: 3, bot: 'KOMMO_BOT_CIERRE_LUNES' }
};

/** Cuántas semanas hacia atrás cuenta "ya compró para ese día". */
export const SEMANAS_DE_HISTORIA = 8;
/** Máximo de mensajes de MARKETING por persona por semana (Jan, 5 oct 2026). */
export const MARKETING_POR_SEMANA = 2;
/**
 * El MISMO mensaje no se le repite a una persona antes de estos días (Jan, 8 oct
 * 2026: "que no reciban mucho mensaje diciendo lo mismo, más bien sería peor").
 * Así el cierre del sábado le llega a un cliente una semana sí y otra no.
 */
export const DIAS_ENTRE_MENSAJES_IGUALES = 14;
/** Si tiene una entrega en estos días alrededor del reparto, ya es cliente activo: no se le ofrece. */
export const DIAS_DE_CLIENTE_ACTIVO = 7;
/** Presupuesto mensual de marketing en dólares (Jan, 6 oct 2026: subió de 80 a 200 para ir más rápido). */
export const PRESUPUESTO_MENSUAL_USD = 200;
/** Lo que cobra Meta por un mensaje de marketing en Costa Rica (aprox.). */
export const COSTO_MARKETING_USD = 0.074;

const diaDeLaSemana = (fecha) => new Date(`${fecha}T12:00:00`).getDay();
const esCancelado = (p) => /^cancel|rechaz|reembols/i.test(String(p?.status || p?.estado || ''));

/**
 * El nombre completo, sin tildes ni mayúsculas. Solo se compara ENTERO: "Maria
 * Rojas" no es "Ana Maria Rojas" (ver la memoria del bug de fusión por nombre).
 */
export const nombreClave = (p) => String(p?.cliente || p?.nombre || '')
    .normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * El cierre que toca hoy, o null si hoy no sale ninguno.
 * @returns {{ dia, nombre, bot, fechaEntrega } | null}
 */
export const cierreDeHoy = (hoy) => {
    const c = CIERRES[diaDeLaSemana(hoy)];
    return c ? { ...c, fechaEntrega: sumarDias(hoy, c.diasHastaEntrega) } : null;
};

/**
 * Clientes que compraron para ese día de reparto en las últimas semanas y no
 * tienen entrega en `fechaEntrega`. Uno por teléfono (su pedido más reciente).
 *
 * "Ya tiene entrega" cuenta CUALQUIER pedido vivo de ese teléfono con esa fecha,
 * también uno sin pagar: si ya pidió, no se le escribe "hoy cerramos".
 */
export const clientesSinEntrega = (pedidos = [], fechaEntrega, { semanas = SEMANAS_DE_HISTORIA } = {}) => {
    const dia = diaDeLaSemana(fechaEntrega);
    const desde = sumarDias(fechaEntrega, -7 * semanas);
    const vivos = (pedidos || []).filter(p => p && !esCancelado(p) && !esTelefonoDeRelleno(p.telefono)
        && normalizarTelefono(p.telefono).length === 8);

    // "Ya es cliente activo": una entrega cerca de ese reparto (ese día, el lunes
    // siguiente, su mensual de los miércoles…). Se busca en TODOS los pedidos
    // vivos, también los que no tienen teléfono, y por teléfono O por nombre
    // completo: el 8 oct a Evelyn Montes (pedido sin teléfono), Jennifer Flores
    // (otro número) y Zujeily (8888-8887) les iba a llegar "hoy cerramos" con
    // su pedido del sábado ya hecho.
    const desdeActivo = sumarDias(fechaEntrega, -3);
    const hastaActivo = sumarDias(fechaEntrega, DIAS_DE_CLIENTE_ACTIVO);
    const activos = (pedidos || []).filter(p => p && !esCancelado(p)
        && entregasDelPedido(p).some(f => f >= desdeActivo && f <= hastaActivo));
    const yaTienen = new Set(activos.map(p => normalizarTelefono(p.telefono)).filter(t => t.length === 8));
    const nombresActivos = new Set(activos.map(nombreClave).filter(n => n.includes(' ')));

    const porTelefono = new Map();
    vivos.forEach((p) => {
        const tel = normalizarTelefono(p.telefono);
        if (yaTienen.has(tel) || nombresActivos.has(nombreClave(p))) return;
        const ultima = entregasDelPedido(p)
            .filter(f => f >= desde && f < fechaEntrega && diaDeLaSemana(f) === dia)
            .slice(-1)[0];
        if (!ultima) return;
        const previo = porTelefono.get(tel);
        if (!previo || ultima > previo.ultima) porTelefono.set(tel, { pedido: p, ultima });
    });
    return [...porTelefono.values()]
        .sort((a, b) => String(a.pedido.cliente || '').localeCompare(String(b.pedido.cliente || '')))
        .map(({ pedido }) => ({ pedido, fecha: fechaEntrega, ultima: false }));
};

/** La semana ISO "2026-W41": la llave del conteo de marketing por persona. */
export const semanaIso = (fecha) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    const dia = (d.getUTCDay() + 6) % 7;                   // lunes = 0
    d.setUTCDate(d.getUTCDate() - dia + 3);                // el jueves de esa semana
    const enero4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const n = 1 + Math.round(((d - enero4) / 86400000 - 3 + ((enero4.getUTCDay() + 6) % 7)) / 7);
    return `${d.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
};

/**
 * Las reglas que no se negocian (plan, sección 4), sobre la lista ya armada.
 *
 * @param {Array} destinatarios  [{ telefono, nombre, … }]
 * @param {object} o
 * @param {Map|object} o.fichas  teléfono → ficha de kommo_contactos
 * @param {string} o.hoy         AAAA-MM-DD en Costa Rica
 * @param {Date}   o.ahora
 * @param {string} [o.tipo]      el envío (cierre-pedidos, menu-semana…): el mismo no se repite antes de 14 días
 * @returns {{ quedan: Array, fuera: Array<{ telefono, nombre, motivo }> }}
 */
export const conReglasDeMarketing = (destinatarios = [], {
    fichas = new Map(), hoy, ahora = new Date(), maximo = MARKETING_POR_SEMANA,
    tipo = '', diasEntreIguales = DIAS_ENTRE_MENSAJES_IGUALES
} = {}) => {
    const ficha = (tel) => (fichas instanceof Map ? fichas.get(tel) : fichas?.[tel]) || null;
    const semana = semanaIso(hoy);
    const quedan = [];
    const fuera = [];
    (destinatarios || []).forEach((d) => {
        const f = ficha(normalizarTelefono(d.telefono));
        let motivo = '';
        if (noMolestarVigente(f, ahora)) motivo = 'no-molestar';
        else if ((Number(f?.marketing?.[semana]) || 0) >= maximo) motivo = `ya-${maximo}-esta-semana`;
        else if (f?.ultimaDifusion && String(f.ultimaDifusion).slice(0, 10) === hoy) motivo = 'ya-le-llego-hoy';
        else if (tipo && f?.ultimoPorTipo?.[tipo]
            && ahora - new Date(f.ultimoPorTipo[tipo]) < diasEntreIguales * 86400000) motivo = 'mismo-mensaje-hace-poco';
        if (motivo) fuera.push({ telefono: d.telefono, nombre: d.nombre, motivo });
        else quedan.push(d);
    });
    return { quedan, fuera };
};

/** El mes "2026-10" del presupuesto. */
export const mesDe = (fecha) => String(fecha).slice(0, 7);

/**
 * ¿Alcanza el presupuesto del mes para `cuantos` mensajes más?
 * @returns {{ alcanza: boolean, gastado: number, conEste: number, tope: number }}
 */
export const presupuestoDelMes = ({ mensajesDelMes = 0, cuantos = 0, tope = PRESUPUESTO_MENSUAL_USD, costo = COSTO_MARKETING_USD } = {}) => {
    const gastado = Math.round(mensajesDelMes * costo * 100) / 100;
    const conEste = Math.round((mensajesDelMes + cuantos) * costo * 100) / 100;
    return { alcanza: conEste <= tope, gastado, conEste, tope };
};
