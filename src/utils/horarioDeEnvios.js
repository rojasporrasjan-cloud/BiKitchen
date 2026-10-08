/**
 * Los horarios de los envíos automáticos, en palabras y en hora de Costa Rica.
 *
 * Netlify programa cada función con un cron en UTC ('0 15 * * 1,4,5'). El panel
 * muestra ese MISMO texto traducido ("Lunes, jueves y viernes · 9:00 a. m."),
 * así nunca dice una hora distinta a la real. La prueba
 * src/tests/cronogramaDeEnvios.test.js compara cada cron con el `config` de su
 * función: si alguien cambia uno sin el otro, falla.
 *
 * Solo entiende lo que usan estas funciones: minuto fijo, hora fija o "cada N
 * minutos", y una lista de días de la semana (o todos).
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const OFFSET_CR = -6; // Costa Rica no cambia de hora

const lista = (partes) => (partes.length <= 1 ? partes.join('')
    : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`);

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** '9:00 a. m.' */
export const horaEnPalabras = (h, m = 0) => {
    const sufijo = h < 12 ? 'a. m.' : 'p. m.';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
};

/**
 * @returns {{ cadaMinutos: number|null, hora: number|null, minuto: number, dias: number[] }}
 *   `hora` y `dias` ya en hora de Costa Rica (puede cambiar el día al restar 6 h).
 */
export const leerCron = (cron) => {
    const [min, hora, , , dow] = String(cron || '').trim().split(/\s+/);
    const diasUtc = !dow || dow === '*' ? [0, 1, 2, 3, 4, 5, 6] : dow.split(',').map(Number);
    if (/^\*\/\d+$/.test(min)) return { cadaMinutos: Number(min.slice(2)), hora: null, minuto: 0, dias: diasUtc };
    const hUtc = Number(hora);
    let hCr = hUtc + OFFSET_CR;
    let corrimiento = 0;
    if (hCr < 0) { hCr += 24; corrimiento = -1; }
    const dias = diasUtc.map(d => (d + corrimiento + 7) % 7).sort((a, b) => a - b);
    return { cadaMinutos: null, hora: hCr, minuto: Number(min) || 0, dias };
};

/** "Lunes, jueves y viernes · 9:00 a. m." / "Todos los días · cada 10 min" */
export const cronEnPalabras = (cron) => {
    const c = leerCron(cron);
    const todos = c.dias.length === 7;
    const dias = todos ? 'Todos los días' : mayuscula(lista(c.dias.map(d => DIAS[d])));
    return c.cadaMinutos ? `${dias} · cada ${c.cadaMinutos} min` : `${dias} · ${horaEnPalabras(c.hora, c.minuto)}`;
};

/**
 * La próxima vez que corre, como Date (instante real).
 * Para los de "cada N minutos" no tiene sentido: devuelve null.
 */
export const proximaVez = (cron, ahora = new Date()) => {
    const c = leerCron(cron);
    if (c.cadaMinutos) return null;
    // Se trabaja en "hora de Costa Rica" corriendo el reloj 6 horas
    const crAhora = new Date(ahora.getTime() + OFFSET_CR * 3600 * 1000);
    for (let i = 0; i < 8; i++) {
        const d = new Date(Date.UTC(crAhora.getUTCFullYear(), crAhora.getUTCMonth(), crAhora.getUTCDate() + i, c.hora, c.minuto));
        if (!c.dias.includes(d.getUTCDay())) continue;
        const real = new Date(d.getTime() - OFFSET_CR * 3600 * 1000);
        if (real > ahora) return real;
    }
    return null;
};

/** Para el cronograma de la semana: [{ dia: 1, hora: 9, minuto: 0 }] por cada día en que corre. */
export const momentosDeLaSemana = (cron) => {
    const c = leerCron(cron);
    if (c.cadaMinutos) return [];
    return c.dias.map(dia => ({ dia, hora: c.hora, minuto: c.minuto }));
};

export const NOMBRES_DE_DIAS = DIAS;
