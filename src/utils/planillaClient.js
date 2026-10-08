/**
 * Llamar a netlify/functions/planilla.js desde el navegador.
 *
 * El reloj del iPad va sin sesión (con el código del link); el panel manda el
 * token del dueño.
 */
import { auth } from '../firebase/config';

const FUNCION = '/.netlify/functions/planilla';

const pedir = async (cuerpo, token) => {
    const res = await fetch(FUNCION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(cuerpo)
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(datos.error || `Error ${res.status}`);
        error.status = res.status;
        error.datos = datos;
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
