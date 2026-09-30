import { auth } from '../firebase/config';

/**
 * La llave del cliente guardada en SU teléfono.
 *
 * Cuando abre su link personal de cambios (el que le llega por WhatsApp), la
 * función le devuelve su teléfono sellado (`llaveCliente`). Se guarda acá y,
 * desde ahí, el perfil le muestra solo "Tus cambios de esta semana" cada
 * semana, sin que escriba nada. Ver netlify/functions/cambios-semana.js.
 *
 * localStorage puede fallar (modo privado, datos borrados): nunca rompe nada,
 * a lo sumo la tarjeta no aparece hasta que vuelva a abrir su link.
 */

const CLAVE = 'bk_llave_cliente';

export const leerLlaveCliente = () => {
    try { return localStorage.getItem(CLAVE) || ''; } catch { return ''; }
};

export const guardarLlaveCliente = (llave) => {
    if (!llave) return;
    try { localStorage.setItem(CLAVE, llave); } catch { /* sin almacenamiento: la próxima vez */ }
};

/** Las cabeceras para las funciones: con la sesión si el cliente la tiene iniciada. */
export const cabecerasConSesion = async () => {
    const cabeceras = { 'Content-Type': 'application/json' };
    try {
        const token = await auth?.currentUser?.getIdToken();
        if (token) cabeceras.Authorization = `Bearer ${token}`;
    } catch { /* sin sesión: igual funciona */ }
    return cabeceras;
};
