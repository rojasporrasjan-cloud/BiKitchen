/**
 * En que ORDEN cocinar, para que el empaque no espere.
 *
 * Las cocineras entran temprano y los de empaque llegan unas DOS HORAS despues.
 * Si la cocina va en orden alfabetico, a esas dos horas hay un poco de todo y
 * nada terminado: no se puede cerrar ni una bolsa. Si en cambio arranca por la
 * familia que mas packs tiene, a esa hora ya hay treinta bolsas listas y el
 * empaque trabaja de corrido mientras el resto sigue en la olla.
 *
 * "Cocinar en orden dependiendo del volumen... para que los de empaque hagan su
 * trabajo bien sin interrupciones porque ellos llegan a empacar como 2 horas
 * despues" — Jan, 7 de setiembre de 2026.
 *
 * DOS REGLAS QUE NO SE TOCAN
 *
 * 1. La olla no se parte. Si el arroz lo ocupan bajo calorias y casaditos, se
 *    hace TODO cuando le toca al bajo calorias. Lo de casaditos queda esperando.
 *    Partirlo serian dos ollas de arroz, que es justo lo que se arreglo antes.
 *
 * 2. La bolsa manda. Una bolsa no se cierra con los almuerzos: se cierra cuando
 *    esta TODO lo del cliente —sus cenas, sus desayunos y sus individuales—,
 *    porque todo va junto al congelador. Un cliente que lleva dos packs de
 *    familias distintas cierra en la tanda mas tardia de las dos.
 */

/** Nombre comparable: sin tildes, sin mayusculas, sin dobles espacios. */
const clave = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Las familias ordenadas por cuantos packs llevan, de mayor a menor.
 *
 * Las CENAS no son una familia aparte: son la segunda mitad del mismo pack y su
 * bolsa es la misma. Se suman a su familia para que no compitan con ella.
 *
 * @param {Array<{nombre: string, packs: number}>} familias
 * @returns {Array<{nombre: string, packs: number}>}
 */
export const familiasPorVolumen = (familias) => {
    const suma = new Map();
    (familias || []).forEach((f) => {
        const nombre = String(f?.nombre || '').replace(/^CENAS\s*-\s*/i, '').trim();
        if (!nombre) return;
        const k = clave(nombre);
        const previo = suma.get(k);
        const packs = Number(f?.packs) || 0;
        if (previo) previo.packs += packs;
        else suma.set(k, { nombre, packs });
    });

    return [...suma.values()].sort((a, b) =>
        b.packs - a.packs || a.nombre.localeCompare(b.nombre));
};

/**
 * En que tanda va cada preparacion.
 *
 * Hereda la prioridad de la familia MAS GRANDE que la ocupe: el arroz que
 * tambien usa el bajo calorias se cocina con el bajo calorias, completo.
 *
 * @param {Array<{name, unit, familias: string[]}>} preparaciones
 * @param {Array<{nombre, packs}>} orden  la salida de familiasPorVolumen
 * @returns {Array} las mismas preparaciones con { tanda, familiaQueManda }
 */
export const tandaDeCadaPreparacion = (preparaciones, orden) => {
    const puesto = new Map();
    (orden || []).forEach((f, i) => puesto.set(clave(f.nombre), i));
    const ultima = (orden || []).length;

    return (preparaciones || []).map((p) => {
        const suyas = p?.familias || [];
        let mejor = ultima;
        let familiaQueManda = null;
        suyas.forEach((nombre) => {
            const limpio = String(nombre || '').replace(/^CENAS\s*-\s*/i, '').trim();
            const i = puesto.has(clave(limpio)) ? puesto.get(clave(limpio)) : ultima;
            if (i < mejor) { mejor = i; familiaQueManda = limpio; }
        });

        // Dentro de la familia, el MENU 1 va antes que el MENU 2.
        //
        // "Cocinar primero todo el primer menu, que ya lo tengan a las ocho y
        // media, para que cuando Paula llegue empiece a empacar; y el segundo
        // menu que sigan" — Gina, 7 de setiembre de 2026.
        //
        // Una preparacion es de MENU 2 solo si NINGUN menu de almuerzo la ocupa.
        // Las guarniciones se repiten entre los dos menus —picadillo mixto,
        // vegetales mixtos, chayotes salteados— y esas caen en el menu 1 y se
        // cocinan de una sola vez para los dos, que es justo lo que ella pide.
        const soloCena = suyas.length > 0
            && suyas.every((n) => /^CENAS\s*-\s*/i.test(String(n || '')));

        return { ...p, tanda: mejor, familiaQueManda, soloCena };
    });
};

/**
 * En que tanda se cierra la bolsa de cada cliente.
 *
 * La bolsa espera a lo ULTIMO que le falte. Un cliente con pack bajo calorias
 * (tanda 1) y casaditos (tanda 4) cierra en la 4: antes le faltaria comida.
 *
 * @param {Array<{nombre, zona, dia, familias: string[]}>} clientes
 * @param {Array<{nombre, packs}>} orden
 */
export const tandaDeCadaBolsa = (clientes, orden) => {
    const puesto = new Map();
    (orden || []).forEach((f, i) => puesto.set(clave(f.nombre), i));
    const ultima = (orden || []).length;

    return (clientes || []).map((c) => {
        let espera = 0;
        let porQue = null;
        (c?.familias || []).forEach((nombre) => {
            const limpio = String(nombre || '').replace(/^CENAS\s*-\s*/i, '').trim();
            const i = puesto.has(clave(limpio)) ? puesto.get(clave(limpio)) : ultima;
            if (i > espera) { espera = i; porQue = limpio; }
        });
        return { ...c, tanda: espera, esperaPor: (c?.familias || []).length > 1 ? porQue : null };
    });
};

/**
 * La hoja completa, tanda por tanda.
 *
 * Cada tanda trae lo que hay que cocinar y las bolsas que se cierran al
 * terminarla. Una tanda sin preparaciones ni bolsas no se muestra.
 *
 * @returns {Array<{numero, familia, packs, preparaciones, bolsas, esperan}>}
 */
export const armarTandas = ({ familias, preparaciones, clientes } = {}) => {
    const orden = familiasPorVolumen(familias);
    const preps = tandaDeCadaPreparacion(preparaciones, orden);
    const bolsas = tandaDeCadaBolsa(clientes, orden);

    return orden.map((f, i) => ({
        numero: i + 1,
        familia: f.nombre,
        packs: f.packs,
        preparaciones: preps.filter((p) => p.tanda === i),
        // Las que se cierran al terminar esta tanda
        bolsas: bolsas.filter((b) => b.tanda === i),
        // Las que ya tienen sus platos pero siguen esperando otra familia
        esperan: bolsas.filter((b) => b.tanda > i
            && (b.familias || []).some((n) => clave(String(n).replace(/^CENAS\s*-\s*/i, '')) === clave(f.nombre)))
    })).filter((t) => t.preparaciones.length > 0 || t.bolsas.length > 0);
};

/**
 * Mete una fila de cabecera cada vez que arranca una tanda.
 *
 * Se le pasa la salida de `agruparArroces` —que ya trae sus propias filas de
 * grupo— y devuelve la misma lista con `{ tipo: 'tanda' }` intercalado. Asi la
 * tabla no hay que rehacerla: solo aprende un tipo de fila mas.
 *
 * @param {Array} filas  { tipo: 'grupo'|'hijo'|'suelto', item? }
 * @param {Array<{nombre, packs}>} orden
 */
export const conCabecerasDeTanda = (filas, orden = []) => {
    const salida = [];
    let anterior = null;
    // Se numeran CORRIDAS, no por el puesto de la familia. Una familia cuyas
    // preparaciones ya se cocinaron todas en una tanda anterior —el Pack Regular
    // comparte sus ollas con el bajo calorias— no genera cabecera, y numerar por
    // puesto dejaba la hoja saltando de la TANDA 3 a la 5 como si faltara una.
    let numero = 0;

    let cenaAnterior = null;
    // El ultimo puesto de familia que si genero cabecera. Sirve para avisar de
    // los huecos: la hoja salta de la TANDA 3 a la 5 y quien cocina se queda
    // buscando la 4 creyendo que se perdio una pagina.
    let ultimoPuesto = -1;
    (filas || []).forEach((fila) => {
        const suya = fila?.item?.tanda;
        const esCena = !!fila?.item?.soloCena;
        const cambia = suya !== undefined && suya !== null
            && (suya !== anterior || esCena !== cenaAnterior);

        if (cambia) {
            anterior = suya;
            cenaAnterior = esCena;
            // El numero es el PUESTO DE LA FAMILIA, no un contador corrido.
            //
            // Tiene que ser el mismo que usa la hoja de empaque o las dos se
            // contradicen: la cocina decia "TANDA 4 — Sonia" y el empaque
            // "TANDA 4 — Full Pack". Si una familia no aparece en cocina es
            // porque sus ollas ya salieron en una tanda anterior, y ese hueco en
            // la numeracion dice justamente eso.
            numero = suya + 1;
            const familia = orden[suya] || null;

            // Las familias que quedaron en el hueco. No es que falten: sus ollas
            // ya salieron en una tanda de arriba porque las comparten con una
            // familia mas grande. El Full Pack del miercoles 9 no tiene ni una
            // olla propia —todo lo suyo se cocino con el Regular y el Sin
            // Carbos— asi que la hoja pasa de la TANDA 3 a la 5.
            const saltadas = [];
            for (let i = ultimoPuesto + 1; i < suya; i += 1) {
                if (orden[i]) saltadas.push({ numero: i + 1, nombre: orden[i].nombre });
            }
            ultimoPuesto = suya;

            salida.push({
                tipo: 'tanda',
                numero,
                saltadas,
                // "1a" es el menu de almuerzos y "1b" el de cenas
                paso: esCena ? 'b' : 'a',
                menu: esCena ? 2 : 1,
                familia: familia ? familia.nombre : null,
                packs: familia ? familia.packs : 0,
                // La primera es la que le da trabajo a empaque cuando llegan
                esLaPrimera: suya === 0 && !esCena
            });
        }
        salida.push(fila);
    });

    return salida;
};

/**
 * Cuanto trabajo tiene cada cocinera en cada tanda.
 *
 * Las cocineras trabajan EN PARALELO —Rosa el pollo, Fernanda las carnes, dona
 * Carmen los vegetales, Osmany las harinas— pero la tanda es un punto de
 * encuentro: Paula no puede empacar bajo calorias si le falta el pure de
 * Osmany. Asi que nadie pasa a la tanda siguiente hasta que TODAS terminaron
 * la de ahora.
 *
 * De ahi sale lo que de verdad importa: quien tiene mas trabajo en la tanda 1
 * es quien decide a que hora arranca Paula. Verlo ANTES de empezar el dia deja
 * repartir distinto; verlo despues solo sirve para lamentarse.
 *
 * @param {Array} preparaciones  las de tandaDeCadaPreparacion
 * @param {Function} quienLoHace  (item) => nombre de la cocinera
 * @returns {Array<{tanda, menu, porCocinera: Object, total, cuelloDeBotella}>}
 */
export const cargaPorTanda = (preparaciones, quienLoHace) => {
    const porTanda = new Map();

    (preparaciones || []).forEach((p) => {
        if (p?.tanda === undefined || p?.tanda === null) return;
        const llave = `${p.tanda}|${p.soloCena ? 2 : 1}`;
        if (!porTanda.has(llave)) {
            porTanda.set(llave, { tanda: p.tanda, menu: p.soloCena ? 2 : 1, porCocinera: {}, total: 0 });
        }
        const fila = porTanda.get(llave);
        const quien = (quienLoHace ? quienLoHace(p) : '') || 'SIN ASIGNAR';
        fila.porCocinera[quien] = (fila.porCocinera[quien] || 0) + 1;
        fila.total += 1;
    });

    return [...porTanda.values()]
        .sort((a, b) => a.tanda - b.tanda || a.menu - b.menu)
        .map((f) => {
            // Quien tiene mas preparaciones marca el ritmo de la tanda
            const cuello = Object.entries(f.porCocinera)
                .sort((a, b) => b[1] - a[1])[0];
            return { ...f, cuelloDeBotella: cuello ? { cocinera: cuello[0], cuantas: cuello[1] } : null };
        });
};

/**
 * El titulo de una tanda, en texto plano.
 *
 * Vive aca y no adentro de la pantalla porque lo usan DOS: la tabla de cocina
 * en la pagina y la pestana de cocina del Excel. Cuando cada una lo armaba por
 * su cuenta, el Excel no traia tandas del todo: ordenaba por unidad —gramos,
 * tazas, unidades— de mayor a menor, y quien cocinaba veia dos hojas distintas
 * de la misma cosa. La de la pantalla ordenada por tanda y la del Excel plana.
 *
 * @param {object} fila  una fila `{ tipo: 'tanda' }` de `conCabecerasDeTanda`
 */
export const tituloDeTanda = (fila) => {
    if (!fila?.familia) return 'AL FINAL — lo que no pertenece a ningún pack';
    const cenas = fila.menu === 2 ? ' (cenas)' : '';
    const packs = `${fila.packs} ${fila.packs === 1 ? 'pack' : 'packs'}`;
    return `TANDA ${fila.numero}${fila.paso} — ${fila.familia} · MENÚ ${fila.menu}${cenas} · ${packs}`;
};

/** El aviso de las tandas que no aparecen porque sus ollas ya salieron arriba. */
export const avisoDeTandasSaltadas = (fila) => {
    const s = fila?.saltadas || [];
    if (s.length === 0) return '';
    return `No hay tanda ${s.map(x => x.numero).join(' ni ')}: las ollas de `
        + `${s.map(x => x.nombre).join(' y ')} ya salieron arriba, se comparten `
        + 'con una familia más grande.';
};

/**
 * Las preparaciones con su tanda puesta y en el orden en que se cocinan.
 *
 * Vive aca porque lo usan DOS: la tabla de cocina de la pantalla y la pestana
 * de cocina del Excel. Cuando el Excel no lo aplicaba, `conCabecerasDeTanda` no
 * encontraba `item.tanda` en ninguna fila y no dibujaba NI UNA cabecera: el
 * archivo salia como una lista plana aunque el codigo pidiera tandas.
 *
 * El orden: primero por tanda, dentro de cada tanda el menu 1 antes que las
 * cenas —es lo que Paula empaca al llegar—, despues de mayor a menor.
 */
export const ordenarPorTanda = (items, orden = []) =>
    tandaDeCadaPreparacion(Array.isArray(items) ? items : [], orden)
        .sort((a, b) => (a.tanda - b.tanda)
            || (a.soloCena === b.soloCena ? 0 : (a.soloCena ? 1 : -1))
            || (Number(b.totalQty) || 0) - (Number(a.totalQty) || 0)
            || String(a.name).localeCompare(String(b.name)));
