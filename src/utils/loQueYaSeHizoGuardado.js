/**
 * Lo que se apunta en el panel "Lo que ya se hizo", guardado en el navegador.
 *
 * Sin esto, pegar el mensaje de Gina y recargar la página borraba todo: el
 * texto de los sobrantes vivía solo en memoria. La hoja se arma a las nueve de
 * la noche entre varias pestañas y varias recargas — perder ese trabajo es
 * volver a pedirle el mensaje a Gina.
 *
 * El interruptor de "ver todo sin rebajar" también se guarda, y es el que más
 * importa: viene prendido de fábrica —para revisar la hoja completa— y si se
 * apaga y vuelve solo, la hoja final sale SIN descontar nada y se cocina de
 * más sin que nadie lo note.
 *
 * Todo esto es un apunte de trabajo de esta hornada, no un dato del negocio:
 * por eso va en el navegador y no en Firestore, y así no gasta cuota.
 */

const LLAVE_SOBRANTES = 'bikitchen.textoDeSobrantes';
const LLAVE_SIN_REBAJA = 'bikitchen.sinRebaja';

/** Lee un texto guardado. Si el navegador no deja, se arranca vacío. */
// Por ciclo, igual que los empacados: lo que sobro la semana pasada no se le
// puede descontar a la hoja de esta.
const llaveSobrantes = (ciclo) => (ciclo ? `${LLAVE_SOBRANTES}::${ciclo}` : LLAVE_SOBRANTES);

export const leerTextoDeSobrantes = (ciclo = '') => {
    try {
        return window.localStorage.getItem(llaveSobrantes(ciclo)) || '';
    } catch {
        return '';
    }
};

export const guardarTextoDeSobrantes = (texto, ciclo = '') => {
    try {
        window.localStorage.setItem(llaveSobrantes(ciclo), String(texto ?? ''));
    } catch {
        // Sin guardar: vale para esta sesión y ya
    }
};

/**
 * Si la hoja se está viendo SIN rebajar.
 *
 * Por defecto sí: se abre mostrando todo, que es como se revisa. Solo se apaga
 * a propósito, y entonces se recuerda.
 */
export const leerSinRebaja = () => {
    try {
        const v = window.localStorage.getItem(LLAVE_SIN_REBAJA);
        return v === null ? true : v === 'true';
    } catch {
        return true;
    }
};

export const guardarSinRebaja = (valor) => {
    try {
        window.localStorage.setItem(LLAVE_SIN_REBAJA, valor ? 'true' : 'false');
    } catch {
        // Sin guardar: vale para esta sesión y ya
    }
};
