/**
 * Cuando se acaban las lecturas del día.
 *
 * BiKitchen está en el plan gratuito: 50.000 lecturas diarias. Al llegar al
 * tope, Firestore contesta `resource-exhausted` con un 429 y NO vuelve a
 * contestar hasta la medianoche del Pacífico —la 1 a.m. en Costa Rica—.
 *
 * El problema no es que falle: es que fallaba sin decirlo. El 9 de setiembre de
 * 2026, metiendo pedidos, el botón de confirmar se quedó más de 35 segundos
 * reintentando contra una puerta cerrada. Cada reintento nuestro se multiplicaba
 * con los que hace `runTransaction` por su cuenta, y la pantalla solo decía
 * "cargando". Sin este freno, la única señal era la consola del navegador.
 *
 * Se anota la hora del primer golpe y durante un minuto todo lo demás falla de
 * una. Falla igual —la cuota no está— pero falla rápido y con un mensaje que se
 * puede leer.
 *
 * El minuto es a propósito corto: si lo que se agotó era el ritmo por segundo y
 * no el día entero, en un minuto ya se puede volver a intentar solo.
 */

/** Cuánto se deja de intentar después de un `resource-exhausted`. */
export const DESCANSO_MS = 60_000;

let agotadaDesde = 0;

/** Anota que Firestore acaba de contestar que no hay cuota. */
export const anotarCuotaAgotada = (ahora = Date.now()) => {
    agotadaDesde = ahora;
};

/** ¿Seguimos dentro del minuto de descanso? */
export const laCuotaSeAcabo = (ahora = Date.now()) =>
    agotadaDesde > 0 && (ahora - agotadaDesde) < DESCANSO_MS;

/** Para las pruebas y para cuando el usuario decide reintentar a mano. */
export const olvidarCuotaAgotada = () => {
    agotadaDesde = 0;
};

/**
 * El error que se lanza en vez de seguir intentando.
 *
 * Lleva el mismo `code` que Firestore para que quien ya lo distinguía siga
 * funcionando, y un mensaje escrito para que lo lea una persona, no un log.
 */
export const errorDeCuota = () => {
    const e = new Error(
        'Se acabaron las lecturas de Firebase por hoy. Se reinician a la 1:00 a.m. '
        + '(medianoche del Pacífico). Lo que ya guardaste NO se perdió.'
    );
    e.code = 'resource-exhausted';
    e.cuotaDelDia = true;
    return e;
};

/** ¿Este error es porque se acabó la cuota? Sirve para escribir el aviso. */
export const esErrorDeCuota = (error) =>
    error?.code === 'resource-exhausted' || error?.cuotaDelDia === true;
