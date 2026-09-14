/**
 * Qué se cocina, qué se empaca y qué se descuenta cada día del ciclo sábado + lunes.
 *
 * Así trabaja la cocina (Jan, 14 de setiembre de 2026):
 *
 *   JUEVES   Solo cocina. El sábado completo y se adelanta la comida de los
 *            mensuales y quincenales del lunes. Keto y familiares NO: esos se
 *            hacen el viernes. Gina deja mucho picado y cocinado sin salsa.
 *
 *   VIERNES  Empaca el sábado completo y adelanta los packs BAJO CALORÍAS
 *            (almuerzo y cena) del lunes, que son los que más hay. La cocina
 *            del viernes es eso menos lo que se hizo el jueves.
 *            Al final del día Gina avisa qué SOBRÓ.
 *
 *   SÁBADO   Empaca TODO el lunes —el domingo no se trabaja y el repartidor
 *            recoge el lunes a las 5 a.m.— menos lo que ya se empacó el viernes.
 *            La cocina del sábado es eso menos lo que sobró.
 *
 * DOS FORMAS DE DESCONTAR, Y NO SE PUEDEN MEZCLAR
 *
 * El viernes se descuenta lo COCINADO el jueves: toda esa comida sigue en la
 * cocina y sirve para lo del viernes.
 *
 * El sábado se descuenta lo que SOBRÓ, y nada más. Lo cocinado el jueves y el
 * viernes ya se usó en las bolsas del sábado y en los bajo calorías del lunes;
 * lo que no se usó es justamente lo que Gina reporta como sobrante. Restar
 * además lo del jueves y el viernes era contar dos veces la misma comida: la
 * hoja del sábado pedía de menos exactamente lo que se había adelantado.
 *
 * Que Gina cocine "un poquito más" de lo que le da la hoja no descuadra nada:
 * lo de más termina en el sobrante y el sábado se cocina menos.
 */

export const DIAS_DEL_CICLO = ['jueves', 'viernes', 'sabado'];

export const esDiaDelCiclo = (dia) => DIAS_DEL_CICLO.includes(String(dia || ''));

/** Gina no los cocina el jueves. Salen el viernes (los del sábado) o el sábado (los del lunes). */
export const FAMILIAS_QUE_NO_VAN_EL_JUEVES = ['keto', 'familiarDeluxe', 'familiarPremium'];

/** Lo que se adelanta del lunes el viernes. */
export const FAMILIA_QUE_SE_ADELANTA_EL_VIERNES = 'bajoCalorias';

const esPersonalizadoNombre = (p) => /^personalizado/i.test(String(p?.plan || p?.tipoMenu || '').trim());

/**
 * Las dos fechas del ciclo, en orden: el sábado y el lunes.
 */
export const fechasDelCiclo = (fechas = []) => {
    const lista = [...new Set((fechas || []).filter(Boolean))].sort();
    return { sabado: lista[0] || '', lunes: lista[1] || '' };
};

/**
 * ¿Es de los que el viernes se adelantan? Bajo calorías del lunes, pero no un
 * personalizado: ese lleva su propio menú y se arma aparte.
 */
export const seAdelantaElViernes = (pedido, familiaDe) =>
    familiaDe(pedido) === FAMILIA_QUE_SE_ADELANTA_EL_VIERNES && !esPersonalizadoNombre(pedido);

/**
 * Los pedidos de cada lado para un día.
 *
 * @param {object} o
 * @param {'jueves'|'viernes'|'sabado'} o.dia
 * @param {Array}    o.pedidos      los del ciclo, ya sin repetidos
 * @param {string[]} o.fechas       las del ciclo
 * @param {Function} o.calendario   pedido -> fechas de entrega
 * @param {Function} o.familiaDe    pedido -> clave de familia ('bajoCalorias', 'keto'…)
 * @param {Function} o.esRecurrente pedido -> tiene más de una entrega
 * @param {string[]} [o.empacados]  claves de los ya empacados (solo cuenta el sábado)
 * @param {Function} [o.claveDe]    pedido -> clave con la que se marcó
 * @returns {{cocina: Array, empaque: Array, delLunes: Array}}
 *   `delLunes` son todos los del lunes, para poder marcar cuáles se empacaron.
 */
export const pedidosDelDia = ({
    dia, pedidos = [], fechas = [], calendario, familiaDe, esRecurrente,
    empacados = [], claveDe = (p) => p?.id
}) => {
    const { sabado, lunes } = fechasDelCiclo(fechas);
    const entregaEl = (p, f) => !!f && (calendario(p) || []).includes(f);
    const lista = pedidos || [];
    const delLunes = lista.filter(p => entregaEl(p, lunes));

    if (dia === 'jueves') {
        const cocina = lista
            .filter(p => entregaEl(p, sabado) || (entregaEl(p, lunes) && esRecurrente(p)))
            .filter(p => !FAMILIAS_QUE_NO_VAN_EL_JUEVES.includes(familiaDe(p)));
        return { cocina, empaque: cocina, delLunes };
    }

    if (dia === 'viernes') {
        const todo = lista.filter(p => entregaEl(p, sabado)
            || (entregaEl(p, lunes) && seAdelantaElViernes(p, familiaDe)));
        return { cocina: todo, empaque: todo, delLunes };
    }

    if (dia === 'sabado') {
        const yaEmpacados = new Set((empacados || []).map(String));
        // Un pedido que ya se entregó el sábado no vuelve a salir por eso: lo
        // que cuenta es que tenga entrega el LUNES.
        const faltan = delLunes.filter(p => !yaEmpacados.has(String(claveDe(p))));
        return { cocina: faltan, empaque: faltan, delLunes };
    }

    return { cocina: lista, empaque: lista, delLunes };
};

/**
 * Los del lunes que se dan por empacados el viernes si nadie dijo otra cosa:
 * los bajo calorías. Si el viernes se empacó alguno más, o alguno no se alcanzó,
 * se marca o desmarca en la hoja del sábado.
 */
export const empacadosDelViernesPorDefecto = ({ pedidos = [], fechas = [], calendario, familiaDe, claveDe = (p) => p?.id }) => {
    const { lunes } = fechasDelCiclo(fechas);
    return (pedidos || [])
        .filter(p => (calendario(p) || []).includes(lunes) && seAdelantaElViernes(p, familiaDe))
        .map(p => String(claveDe(p)))
        .filter(Boolean);
};

/**
 * Qué día se sacó una hoja ya mandada a la cocina.
 *
 * Las hojas nuevas lo guardan. Las viejas no: se deduce del día en que se
 * mandó (jueves, viernes o sábado, hora de Costa Rica).
 */
export const diaDeLaTanda = (tanda) => {
    if (esDiaDelCiclo(tanda?.dia)) return tanda.dia;
    const cuando = new Date(tanda?.enviada || '');
    if (Number.isNaN(cuando.getTime())) return null;
    const enCR = new Date(cuando.getTime() - 6 * 3600 * 1000);   // UTC-6, sin horario de verano
    return { 4: 'jueves', 5: 'viernes', 6: 'sabado' }[enCR.getUTCDay()] || null;
};

const sumar = (destino, fuente) => {
    Object.entries(fuente || {}).forEach(([k, v]) => {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) destino[k] = (destino[k] || 0) + n;
    });
    return destino;
};

/**
 * Qué se le descuenta a la cocina de cada día.
 *
 * @param {object} o
 * @param {string} o.dia
 * @param {Array}  o.tandas      las hojas ya mandadas de este ciclo ({dia?, enviada, cocinado})
 * @param {object} [o.excelDeGina] lo que Gina anotó el jueves en su Excel ({clave: cantidad})
 * @returns {{cocinado: object, usarSobrantes: boolean, origen: string}}
 */
export const descuentoDelDia = ({ dia, tandas = [], excelDeGina = null }) => {
    if (dia === 'viernes') {
        // El Excel de Gina es lo que ELLA hizo; la hoja mandada es lo que se le
        // pidió. Si están los dos, manda el Excel y la hoja no se suma: sumarlos
        // era descontar el jueves dos veces.
        const delExcel = sumar({}, excelDeGina);
        if (Object.keys(delExcel).length > 0) {
            return { cocinado: delExcel, usarSobrantes: false, origen: 'excel' };
        }
        const delJueves = (tandas || []).filter(t => diaDeLaTanda(t) === 'jueves');
        const cocinado = delJueves.reduce((acc, t) => sumar(acc, t?.cocinado), {});
        return {
            cocinado,
            usarSobrantes: false,
            origen: Object.keys(cocinado).length > 0 ? 'hoja-del-jueves' : 'nada'
        };
    }
    if (dia === 'sabado') {
        return { cocinado: {}, usarSobrantes: true, origen: 'sobrantes' };
    }
    return { cocinado: {}, usarSobrantes: false, origen: 'nada' };
};

/** Lo que dice el botón de cada día y lo que explica arriba de la hoja. */
export const TEXTOS_DEL_DIA = {
    jueves: {
        titulo: 'JUEVES',
        corto: 'Solo cocina',
        explica: 'Cocina del sábado completo + mensuales y quincenales del lunes. Sin keto ni familiares (van el viernes). No descuenta nada.'
    },
    viernes: {
        titulo: 'VIERNES',
        corto: 'Empaque del sábado + bajo calorías del lunes',
        explica: 'Cocina y empaque del sábado completo + los bajo calorías (almuerzo y cena) del lunes, menos lo que se cocinó el jueves.'
    },
    sabado: {
        titulo: 'SÁBADO',
        corto: 'Todo el lunes, menos lo del viernes',
        explica: 'Cocina y empaque de todo el lunes, menos lo que se empacó el viernes y menos lo que Gina dijo que sobró.'
    }
};
