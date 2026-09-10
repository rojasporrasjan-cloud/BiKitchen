/**
 * Por que este aparato no puede hablarle a la impresora.
 *
 * El panel decia siempre lo mismo —"abri el panel en Chrome o Edge"— y en el
 * iPhone eso es un consejo FALSO que hace perder la tarde: Apple obliga a todos
 * los navegadores del iPhone y del iPad a usar su propio motor, y ese motor no
 * trae Web Bluetooth. Instalar Chrome ahi no cambia nada.
 *
 * Asi que el mensaje se arma segun el aparato. Vale mas un "desde el iPhone no
 * se puede, usa la computadora" que mandar a alguien a instalar algo que
 * tampoco va a servir.
 */

/** Windows, Mac o Linux con un navegador que no es Chrome ni Edge. */
const ES_ESCRITORIO = /Windows NT|Macintosh|X11|Linux/i;

export const esIOS = (ua = '', puntosTactiles = 0) => {
    const t = String(ua || '');
    if (/iPhone|iPad|iPod/i.test(t)) return true;
    // El iPad moderno se anuncia como Macintosh. Se distingue porque la
    // computadora no tiene pantalla tactil de varios dedos.
    return /Macintosh/i.test(t) && Number(puntosTactiles) > 1;
};

export const esAndroid = (ua = '') => /Android/i.test(String(ua || ''));

const esFirefox = (ua = '') => /Firefox\//i.test(String(ua || ''));
const esSafariDeEscritorio = (ua = '') => {
    const t = String(ua || '');
    return /Safari\//i.test(t) && !/Chrome\/|Chromium\/|Edg\//i.test(t);
};

/**
 * El mensaje para mostrar, o null si el aparato SI puede.
 *
 * @param {object} entorno
 * @param {boolean} entorno.hayBluetooth  lo que dice `webBluetoothDisponible()`
 * @param {string} entorno.userAgent
 * @param {number} entorno.puntosTactiles  navigator.maxTouchPoints
 * @returns {{titulo, detalle, puedeAqui: false} | null}
 */
export const motivoSinBluetooth = ({ hayBluetooth, userAgent = '', puntosTactiles = 0 } = {}) => {
    if (hayBluetooth) return null;

    if (esIOS(userAgent, puntosTactiles)) {
        return {
            puedeAqui: false,
            titulo: 'Desde el iPhone o el iPad no se puede imprimir',
            detalle: 'No es cosa del navegador: Apple obliga a todos los navegadores '
                + 'del iPhone a usar su motor, y ese motor no habla Bluetooth con la '
                + 'impresora. Instalar Chrome acá no cambia nada. Sacá las etiquetas '
                + 'desde la computadora, o desde un teléfono Android con Chrome. '
                + 'Lo demás del panel sí funciona normal acá.'
        };
    }

    if (esAndroid(userAgent)) {
        return {
            puedeAqui: false,
            titulo: 'Este navegador de Android no puede',
            detalle: 'En Android sí se puede imprimir, pero solo desde Chrome. '
                + 'Abrí el panel en Chrome y volvé a intentar.'
        };
    }

    if (esFirefox(userAgent)) {
        return {
            puedeAqui: false,
            titulo: 'Firefox no puede conectarse a la impresora',
            detalle: 'Firefox no trae Web Bluetooth. Abrí el panel en Chrome o Edge.'
        };
    }

    if (esSafariDeEscritorio(userAgent)) {
        return {
            puedeAqui: false,
            titulo: 'Safari no puede conectarse a la impresora',
            detalle: 'Safari no trae Web Bluetooth. Abrí el panel en Chrome o Edge.'
        };
    }

    if (ES_ESCRITORIO.test(String(userAgent || ''))) {
        return {
            puedeAqui: false,
            titulo: 'Este navegador no puede conectarse a la impresora',
            detalle: 'Abrí el panel en Chrome o Edge.'
        };
    }

    return {
        puedeAqui: false,
        titulo: 'Este aparato no puede conectarse a la impresora',
        detalle: 'Probá desde una computadora con Chrome o Edge.'
    };
};

/** Lo mismo, leyendo el navegador de verdad. */
export const motivoSinBluetoothAqui = (hayBluetooth) => motivoSinBluetooth({
    hayBluetooth,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    puntosTactiles: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
});
