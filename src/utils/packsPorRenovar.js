/**
 * A quien hay que escribirle ESTA SEMANA para que no se le caiga el pack.
 *
 * Un pack de varias semanas se acaba en silencio. La pantalla de packs los
 * agrupa por PROXIMA entrega, que sirve para saber que se cocina; pero el que
 * esta a punto de quedarse sin nada se ve igual que el que tiene tres semanas
 * por delante, y para cuando alguien lo nota el cliente ya se fue.
 *
 * En la hoja del miercoles 9 de setiembre habia tres asi, y uno —Kendall
 * Barboza— tenia su ULTIMA entrega al dia siguiente. Nadie lo sabia.
 *
 * Se avisa por dos motivos distintos, y basta con uno:
 *   - le queda UNA entrega o ninguna por delante, aunque sea lejos; o
 *   - su ultima entrega cae dentro de los proximos dias.
 *
 * El primero agarra al que compro pocas semanas, el segundo al que compro
 * muchas pero ya se le acabaron.
 */

/** Los dias que hay de aqui a esa fecha. Negativo si ya paso. */
export const diasDeAqui = (iso, hoy) => {
    if (!iso || !hoy) return null;
    const a = new Date(`${iso}T12:00:00`);
    const b = new Date(`${hoy}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.round((a - b) / 86400000);
};

/**
 * Cuanta cuerda le queda a un pack.
 *
 * @param {object} progreso  lo que devuelve getSubscriptionProgress
 * @param {string} hoy  ISO
 * @returns {{ leQuedan, ultima, diasParaLaUltima }}
 */
export const cuerdaQueLeQueda = (progreso, hoy) => {
    const fechas = (progreso?.fechas || []).filter(Boolean).slice().sort();
    const total = Number(progreso?.total) || fechas.length;
    const completadas = Number(progreso?.completadas) || 0;
    const ultima = fechas.length ? fechas[fechas.length - 1] : null;

    return {
        leQuedan: Math.max(0, total - completadas),
        ultima,
        diasParaLaUltima: diasDeAqui(ultima, hoy)
    };
};

/**
 * Los packs a los que hay que escribirles, del mas urgente al menos.
 *
 * @param {Array<{order, progress}>} suscripciones  como las arma MonthlyPacksView
 * @param {string} hoy  ISO
 * @param {number} dias  cuantos dias de anticipacion se quieren
 */
export const packsPorRenovar = (suscripciones = [], hoy, dias = 10) => (suscripciones || [])
    .filter(s => s?.progress && !s.progress.finalizado)
    .map(s => ({ ...s, cuerda: cuerdaQueLeQueda(s.progress, hoy) }))
    .filter(s => {
        const { leQuedan, diasParaLaUltima } = s.cuerda;
        // Una entrega o menos por delante: se acaba, sin importar cuando.
        if (leQuedan <= 1) return true;
        // O su ultima ya viene entrando en la ventana de aviso.
        return diasParaLaUltima !== null
            && diasParaLaUltima >= 0
            && diasParaLaUltima <= dias;
    })
    .sort((a, b) => {
        const da = a.cuerda.diasParaLaUltima;
        const db = b.cuerda.diasParaLaUltima;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
    });

/** "Su ultima es HOY" / "Su ultima es en 3 dias" — para el renglon. */
export const comoSeLee = (cuerda) => {
    const d = cuerda?.diasParaLaUltima;
    if (d === null || d === undefined) return 'Sin fecha de la ultima entrega';
    if (d < 0) return `Su ultima ya fue, hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'dia' : 'dias'}`;
    if (d === 0) return 'Su ultima entrega es HOY';
    if (d === 1) return 'Su ultima entrega es MAÑANA';
    return `Su ultima entrega es en ${d} dias`;
};
