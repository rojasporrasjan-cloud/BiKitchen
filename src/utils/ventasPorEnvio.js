/**
 * ¿Cuánto vendió cada mensaje? (Jan, 8 oct 2026: "deberíamos ver esas
 * estadísticas desde nuestra página en el panel admin").
 *
 * Un envío "vendió" si alguien que lo recibió hizo un pedido en las 72 horas
 * siguientes. No prueba que compró POR el mensaje (un cliente que renueva
 * quizá iba a pedir igual), pero es la misma vara para todos los envíos y
 * alcanza para ver cuál conviene repetir. El cupón, si lo usó, es la prueba
 * directa y se muestra aparte.
 *
 * Cuentan solo los envíos que de verdad salieron a clientes (`modo: 'si'`).
 * Las muestras de prueba no. Las difusiones mandadas a mano desde el panel
 * quedan en el mismo registro con `tipo: 'difusion'` y su `nombre`.
 *
 * Ojo: si un pedido se mete al sistema días después de la compra (porque llegó
 * por WhatsApp), su `createdAt` es el de la carga y puede caer fuera de las 72 h.
 */

import { normalizarTelefono, esTelefonoDeRelleno } from './telefonoRelleno';

export const HORAS_DE_VENTA = 72;
export const DIAS_DE_HISTORIA = 30;

const HORA = 3600 * 1000;

const esCancelado = (p) => /^cancel|rechaz|reembols/i.test(String(p?.status || p?.estado || ''));

/** Milisegundos de un createdAt que puede venir como Timestamp, {seconds}, Date o texto. */
export const msDeFecha = (x) => {
    if (!x) return 0;
    if (typeof x.toMillis === 'function') return x.toMillis();
    if (typeof x.seconds === 'number') return x.seconds * 1000;
    if (typeof x._seconds === 'number') return x._seconds * 1000;
    if (x instanceof Date) return x.getTime();
    const n = Date.parse(String(x));
    return Number.isFinite(n) ? n : 0;
};

/** Los teléfonos (8 dígitos) a los que les llegó el envío, sin muestras ni rellenos. */
export const telefonosDelEnvio = (envio = {}) => [...new Set((envio.enviados || [])
    .filter(p => !p?.muestra)
    .map(p => normalizarTelefono(p?.telefono))
    .filter(t => t.length === 8 && !esTelefonoDeRelleno(t)))];

/** Solo los envíos que salieron a clientes de verdad. */
export const enviosQueCuentan = (registro = []) => (registro || [])
    .filter(e => e && e.modo === 'si' && e.estado !== 'prueba' && telefonosDelEnvio(e).length > 0);

const cuponDe = (p) => {
    const texto = `${typeof p?.cupon === 'string' ? p.cupon : JSON.stringify(p?.cupon || '')} ${p?.observaciones || ''}`;
    return (texto.match(/\b(HOY\d+|[A-Z]{3,}\d{1,3})\b/) || [])[1] || '';
};

/**
 * Lo que vendió UN envío.
 * @returns {{ id, tipo, nombre, cuando, enviados, compraron, monto, tasa, pedidos: Array }}
 */
export const ventasDeEnvio = (envio, pedidos = [], { horas = HORAS_DE_VENTA } = {}) => {
    const desde = msDeFecha(envio?.cuando);
    const hasta = desde + horas * HORA;
    const telefonos = new Set(telefonosDelEnvio(envio));
    const compras = (pedidos || []).filter((p) => {
        if (!p || esCancelado(p)) return false;
        if (!telefonos.has(normalizarTelefono(p.telefono))) return false;
        const creado = msDeFecha(p.createdAt);
        return creado >= desde && creado <= hasta;
    });
    const compradores = new Set(compras.map(p => normalizarTelefono(p.telefono)));
    const monto = compras.reduce((s, p) => s + (Number(p.total) || 0), 0);
    return {
        id: String(envio?.id || ''),
        tipo: String(envio?.tipo || ''),
        nombre: String(envio?.nombre || ''),
        cuando: String(envio?.cuando || ''),
        enviados: telefonos.size,
        compraron: compradores.size,
        monto,
        tasa: telefonos.size ? Math.round((compradores.size / telefonos.size) * 1000) / 10 : 0,
        pedidos: compras
            .sort((a, b) => msDeFecha(a.createdAt) - msDeFecha(b.createdAt))
            .map(p => ({
                cliente: String(p.cliente || '').trim(),
                total: Number(p.total) || 0,
                numeroOrden: String(p.numeroOrden || ''),
                creado: new Date(msDeFecha(p.createdAt)).toISOString(),
                cupon: cuponDe(p)
            }))
    };
};

/** Todos los envíos que cuentan, del más nuevo al más viejo. */
export const resumenDeVentas = (registro = [], pedidos = [], opciones = {}) => enviosQueCuentan(registro)
    .map(e => ventasDeEnvio(e, pedidos, opciones))
    .sort((a, b) => b.cuando.localeCompare(a.cuando));

/**
 * Sumado por tipo de envío (renovación, cierre…), para ver cuál vende más en el mes.
 * Un cliente que compró después de dos envíos del mismo tipo cuenta una vez por envío.
 */
export const totalesPorTipo = (resumen = []) => {
    const porTipo = new Map();
    (resumen || []).forEach((r) => {
        const clave = r.tipo === 'difusion' ? `difusion:${r.nombre}` : r.tipo;
        const t = porTipo.get(clave) || { tipo: r.tipo, nombre: r.nombre, veces: 0, enviados: 0, compraron: 0, monto: 0 };
        t.veces += 1;
        t.enviados += r.enviados;
        t.compraron += r.compraron;
        t.monto += r.monto;
        porTipo.set(clave, t);
    });
    return [...porTipo.values()]
        .map(t => ({ ...t, tasa: t.enviados ? Math.round((t.compraron / t.enviados) * 1000) / 10 : 0 }))
        .sort((a, b) => b.monto - a.monto);
};
