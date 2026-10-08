/**
 * Los números del tablero "WhatsApp (Kommo)" del panel.
 *
 * Jan, 8 oct 2026: "ocupo ver todo lo que está pasando en tiempo real: qué está
 * activo, cuántos mensajes se han enviado, el gasto". Todo sale de UNA llamada a
 * la función `kommo` (acción 'envios', ~44 lecturas): los interruptores de
 * Netlify, los últimos 40 envíos, la conexión, el gasto del mes y las ventas de
 * los últimos 30 días. Acá solo se ordena, sin leer nada más.
 */

import { TIPOS_DE_ENVIO } from './registroDeEnvios';
import { hoyEnCostaRica } from './avisosDePago';
import { COSTO_MARKETING_USD, PRESUPUESTO_MENSUAL_USD } from './cierresDePedidos';

/** "Cierre de pedidos" / "Difusión: Promo HOY5". */
export const nombreDelEnvio = (entrada = {}) => {
    if (entrada.tipo === 'difusion') return `Difusión a mano${entrada.nombre ? `: ${entrada.nombre}` : ''}`;
    return TIPOS_DE_ENVIO.find(t => t.id === entrada.tipo)?.label || entrada.tipo || 'Envío';
};

/** Prendido / en prueba / apagado, con el nombre de cada envío. */
export const estadoDeLosEnvios = (modos = {}) => {
    const grupos = { si: [], prueba: [], no: [] };
    TIPOS_DE_ENVIO.forEach((t) => {
        const m = modos?.[t.id]?.modo;
        grupos[m === 'si' || m === 'prueba' ? m : 'no'].push(t.label);
    });
    return { prendidos: grupos.si, enPrueba: grupos.prueba, apagados: grupos.no };
};

/** Lo que salió hoy (hora de Costa Rica): a clientes y a Jan en prueba. */
export const enviosDeHoy = (registro = [], ahora = new Date()) => {
    const hoy = hoyEnCostaRica(ahora);
    const deHoy = (registro || []).filter(e => e?.cuando && hoyEnCostaRica(new Date(e.cuando)) === hoy);
    const reales = deHoy.filter(e => e.modo === 'si');
    return {
        entradas: deHoy,
        aClientes: reales.reduce((s, e) => s + (e.enviados?.length || 0), 0),
        pruebas: deHoy.filter(e => e.modo === 'prueba').length
    };
};

/** El gasto de marketing del mes contra el tope. */
export const gastoDelMes = (marketingDelMes = {}) => {
    const mensajes = Number(marketingDelMes?.mensajes) || 0;
    const gasto = Math.round(mensajes * COSTO_MARKETING_USD * 100) / 100;
    return {
        mes: marketingDelMes?.mes || '',
        mensajes,
        gasto,
        tope: PRESUPUESTO_MENSUAL_USD,
        porcentaje: Math.min(100, Math.round((gasto / PRESUPUESTO_MENSUAL_USD) * 100))
    };
};

/** Lo que vendieron los envíos en los últimos 30 días (lo calcula ventas-por-envio). */
export const ventasDelPeriodo = (ventas) => {
    const porTipo = ventas?.porTipo || [];
    return {
        dias: ventas?.dias || 30,
        enviados: porTipo.reduce((s, t) => s + (t.enviados || 0), 0),
        compraron: porTipo.reduce((s, t) => s + (t.compraron || 0), 0),
        monto: porTipo.reduce((s, t) => s + (t.monto || 0), 0),
        calculadoEn: ventas?.calculadoEn || ''
    };
};

/** Todo junto para la pantalla. */
export const resumenDelTablero = (datos = {}, ahora = new Date()) => ({
    estados: estadoDeLosEnvios(datos?.modos),
    hoy: enviosDeHoy(datos?.registro, ahora),
    gasto: gastoDelMes(datos?.marketingDelMes),
    ventas: ventasDelPeriodo(datos?.ventas),
    conexion: datos?.conexion || null
});
