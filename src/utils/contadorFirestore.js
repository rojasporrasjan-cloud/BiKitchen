/**
 * Cuántas lecturas de Firestore lleva gastadas el día.
 *
 * El 3 de setiembre de 2026 se agotó la cuota diaria en plena preparación de la
 * hoja de cocina: Firebase empezó a contestar `429 RESOURCE_EXHAUSTED` y
 * cualquier pantalla que se recargara salía vacía. Nadie lo vio venir porque no
 * hay forma de saber cuánto queda.
 *
 * FIREBASE NO DICE CUÁNTO QUEDA. No hay endpoint que conteste "te quedan 13.000
 * lecturas". Solo la consola, con retraso de horas. Así que esto CUENTA LO QUE
 * GASTA LA APP, que es de donde sale casi todo: cada pantalla del panel se baja
 * la colección `pedidos` entera —545 documentos hoy— y algunas dos veces.
 *
 * Es una ESTIMACIÓN, y hay que leerla como tal:
 *
 *   - Cuenta por navegador. Si Jan y Gina abren el panel cada uno en su
 *     computadora, cada contador ve solo lo suyo y el gasto real es la suma.
 *   - No ve lo que gasta la app pública ni lo que se lea desde otro lado.
 *   - Si se borran los datos del navegador, el contador vuelve a cero pero la
 *     cuota de Firebase no.
 *
 * Sirve para lo que tiene que servir: darse cuenta de que abrir Clientes cuesta
 * 1.100 lecturas antes de abrirlo doce veces.
 */

/** Lo que da el plan Spark (gratis) por día. */
export const LIMITE_DIARIO = 50000;

/** Debajo de esto conviene avisar. */
export const UMBRAL_AVISO = 0.75;
export const UMBRAL_ALERTA = 0.90;

const LLAVE = 'bk-lecturas-firestore';

/**
 * El día SEGÚN LA CUOTA, que se reinicia a medianoche del Pacífico y no a la
 * nuestra. Un martes a las 11 de la noche en Costa Rica ya es miércoles allá,
 * así que contar por el día local daría el número equivocado justo en las horas
 * en que se prepara la hoja.
 */
export const diaDeCuota = (ahora = new Date()) => {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(ahora);
    } catch {
        // Si el navegador no conoce la zona, el día local es mejor que nada.
        return ahora.toISOString().slice(0, 10);
    }
};

const leerGuardado = () => {
    try {
        const crudo = JSON.parse(localStorage.getItem(LLAVE) || '{}');
        return (crudo && typeof crudo === 'object') ? crudo : {};
    } catch {
        return {};   // modo privado, o datos corruptos
    }
};

const guardar = (datos) => {
    try { localStorage.setItem(LLAVE, JSON.stringify(datos)); } catch { /* sin storage */ }
};

/**
 * Anota lecturas hechas.
 *
 * @param {number} cuantas  documentos leídos
 * @param {string} [motivo] de dónde salieron, para poder decir qué gasta más
 */
export const anotarLecturas = (cuantas, motivo = 'otros') => {
    const n = Number(cuantas);
    if (!Number.isFinite(n) || n <= 0) return;

    const hoy = diaDeCuota();
    const datos = leerGuardado();
    // Solo se guarda el día vigente: el de ayer ya no sirve para nada y
    // acumularlos llenaría el storage sin que nadie los mire.
    const dia = datos.dia === hoy ? datos : { dia: hoy, total: 0, porMotivo: {} };

    dia.total = (Number(dia.total) || 0) + n;
    dia.porMotivo[motivo] = (Number(dia.porMotivo[motivo]) || 0) + n;
    guardar(dia);
};

/** Lo que lleva gastado el día, ya calculado para mostrar. */
export const lecturasDeHoy = () => {
    const hoy = diaDeCuota();
    const datos = leerGuardado();
    const total = datos.dia === hoy ? (Number(datos.total) || 0) : 0;
    const porMotivo = datos.dia === hoy ? (datos.porMotivo || {}) : {};

    const usado = Math.min(1, total / LIMITE_DIARIO);
    return {
        total,
        limite: LIMITE_DIARIO,
        restante: Math.max(0, LIMITE_DIARIO - total),
        fraccion: usado,
        nivel: usado >= UMBRAL_ALERTA ? 'alerta' : usado >= UMBRAL_AVISO ? 'aviso' : 'bien',
        // De más a menos, para saber qué pantalla es la cara
        porMotivo: Object.entries(porMotivo).sort((a, b) => b[1] - a[1])
    };
};

/** Borra la cuenta del día. Para cuando se sabe que la cuota ya se reinició. */
export const reiniciarContador = () => guardar({ dia: diaDeCuota(), total: 0, porMotivo: {} });

/**
 * Cuándo se reinicia la cuota, en hora de acá.
 *
 * Es medianoche del Pacífico, que en Costa Rica cae a la 1 o las 2 de la
 * mañana según si allá están en horario de verano.
 */
export const cuandoSeReinicia = (ahora = new Date()) => {
    // Medianoche del Pacífico del día siguiente, vista desde nuestra hora.
    const manana = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const diaPacifico = diaDeCuota(manana);
    // Se prueban las dos posibilidades de offset (PST -8, PDT -7) y se toma la
    // que de verdad cae a medianoche allá.
    for (const offset of [7, 8]) {
        const intento = new Date(`${diaPacifico}T00:00:00.000Z`);
        intento.setUTCHours(intento.getUTCHours() + offset);
        if (diaDeCuota(new Date(intento.getTime() + 60000)) === diaPacifico) return intento;
    }
    return new Date(`${diaPacifico}T07:00:00.000Z`);
};

/** "en 3 h 20 min" — cuánto falta para que se reinicie. */
export const faltaParaReiniciar = (ahora = new Date()) => {
    const ms = cuandoSeReinicia(ahora) - ahora;
    if (ms <= 0) return 'ya se reinició';
    const horas = Math.floor(ms / 3600000);
    const min = Math.round((ms % 3600000) / 60000);
    return horas > 0 ? `en ${horas} h ${min} min` : `en ${min} min`;
};
