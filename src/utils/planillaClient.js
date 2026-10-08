/**
 * Llamar a netlify/functions/planilla.js desde el navegador.
 *
 * El reloj del iPad va sin sesión (con el código del link); el panel manda el
 * token del dueño.
 */
import { auth } from '../firebase/config';

const FUNCION = '/.netlify/functions/planilla';
const ESPERA_MAXIMA_MS = 10000;

/**
 * Sin respuesta en 10 s cuenta como "sin internet" (`error.sinInternet`), para
 * que el reloj no se quede pegado en "Marcando…" con una señal que va y viene.
 */
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
        error.sinInternet = res.status >= 500;      // la función no contestó bien: se reintenta después
        throw error;
    }
    return datos;
};

/** Para el reloj del iPad (sin sesión). */
export const pedirAlReloj = (accion, datos = {}) => pedir({ accion, ...datos });

/** Para la planilla del panel (solo el dueño). */
export const pedirALaPlanilla = async (accion, datos = {}) => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error('Tu sesión venció. Volvé a entrar al panel.');
    return pedir({ accion, ...datos }, await usuario.getIdToken());
};
