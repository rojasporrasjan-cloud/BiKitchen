/**
 * Llamar a netlify/functions/gastos.js desde el navegador.
 *
 * Va aparte de `planillaClient` a propósito (Jan, 9 oct 2026): se publicó un
 * viernes y no se quiso tocar nada del reloj que el equipo estaba usando.
 * Mismo comportamiento: 10 s sin respuesta = "sin internet".
 */
import { auth } from '../firebase/config';

const FUNCION = '/.netlify/functions/gastos';
const ESPERA_MAXIMA_MS = 10000;

const pedir = async (cuerpo, token) => {
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);
    let res;
    try {
        res = await fetch(FUNCION, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(cuerpo),
            signal: corte.signal
        });
    } catch {
        const error = new Error('No hay conexión. Revisá el internet.');
        error.sinInternet = true;
        throw error;
    } finally {
        clearTimeout(reloj);
    }
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(datos.error || `Error ${res.status}`);
        error.status = res.status;
        error.datos = datos;
        error.sinInternet = res.status >= 500;
        throw error;
    }
    return datos;
};

/** Con el link de Gina (sin sesión: el código va en `datos.codigo`). */
export const pedirGastosConLink = (accion, datos = {}) => pedir({ accion, ...datos });

/** Desde el panel (con la sesión del dueño). */
export const pedirGastosDelPanel = async (accion, datos = {}) => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error('Tu sesión venció. Volvé a entrar al panel.');
    return pedir({ accion, ...datos }, await usuario.getIdToken());
};
