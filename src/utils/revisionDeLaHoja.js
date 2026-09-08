/**
 * El repaso de la hoja antes de mandarla.
 *
 * Cada revision de aca sale de un error REAL de la semana del 7 de setiembre de
 * 2026, y cinco de las seis costaban plata:
 *
 *   - Diego Flores pagaba 223.960 por almuerzo y cena y recibia CERO cenas, en
 *     tres entregas seguidas.
 *   - El Pack Regular de Catherine Ordonez quedo clasificado como desayuno, asi
 *     que no se cocinaba, y la entrega era al dia siguiente.
 *   - Edwin Perez salio cobrado y cocinado dos veces.
 *   - "Fajtas" y "Fajitas de cerdo" eran dos ollas del mismo plato.
 *   - Packs mensuales que se acababan sin que nadie se enterara.
 *
 * Ninguno lo encontro el sistema: los encontramos leyendo la hoja renglon por
 * renglon. Esto es esa lectura, hecha sola.
 *
 * NO TOCA NADA. Solo mira y avisa. No corrige pedidos, no reordena la hoja y no
 * impide imprimir: si se equivoca, lo peor que pasa es un aviso de mas. Esa es
 * la unica razon por la que se puede dejar corriendo siempre.
 */

/** Nombre comparable: sin tildes, sin mayusculas, sin dobles espacios. */
const clave = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Distancia entre dos nombres, contando la LETRA VOLTEADA como un solo error.
 *
 * Tiene que ser asi. "saletados" y "salteados" son dos letras al derecho y al
 * reves —un dedazo— pero para la cuenta comun eso son 2 cambios, exactamente lo
 * mismo que separa "ayote" de "chayote", que son dos platos DISTINTOS. Contando
 * el volteo como 1, el error de dedo se distingue del plato de verdad.
 */
export const distanciaConVolteos = (a, b) => {
    const s = String(a || '');
    const t = String(b || '');
    const m = s.length;
    const n = t.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const d = Array.from({ length: m + 1 }, (_, i) => {
        const fila = new Array(n + 1).fill(0);
        fila[0] = i;
        return fila;
    });
    for (let j = 0; j <= n; j += 1) d[0][j] = j;

    for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
            const costo = s[i - 1] === t[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
            if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
    }
    return d[m][n];
};

/** Un aviso, con lo justo para actuar sin ir a buscar nada. */
const aviso = (nivel, tipo, titulo, detalle, quienes = []) =>
    ({ nivel, tipo, titulo, detalle, quienes });

/**
 * 1. Dos ollas del mismo plato.
 *
 * Un dedazo en el nombre parte la olla en dos: se cocina dos veces la mitad y a
 * alguien le falta. Solo se avisa de errores de UNA letra —o una letra volteada—
 * porque a dos de distancia ya empiezan a caer platos legitimos.
 */
export const ollasPartidas = (preparaciones = []) => {
    const nombres = [...new Set((preparaciones || [])
        .map(p => String(p?.name ?? p ?? '').trim())
        .filter(n => n.length > 4))];

    const encontrados = [];
    for (let i = 0; i < nombres.length; i += 1) {
        for (let j = i + 1; j < nombres.length; j += 1) {
            const a = clave(nombres[i]);
            const b = clave(nombres[j]);
            if (a === b || Math.abs(a.length - b.length) > 1) continue;
            if (distanciaConVolteos(a, b) === 1) {
                encontrados.push(aviso(
                    'alto', 'olla-partida',
                    'Dos ollas del mismo plato',
                    `"${nombres[i]}" y "${nombres[j]}" se escriben casi igual. `
                    + 'Se van a cocinar por separado, cada una a la mitad.',
                    [nombres[i], nombres[j]]
                ));
            }
        }
    }
    return encontrados;
};

/** Si el pedido dice que lleva cena. */
const pideCena = (p) => /almuerzo\s*y\s*cena|con\s+cena/i.test(
    `${p?.plan || ''} ${p?.categoryLabel || ''} ${p?.tipoMenu || ''}`
);

const esFamiliaDeCena = (n) => /^CENAS\s*-/i.test(String(n || ''));

/**
 * 2. Paga cena y no le sale ninguna.
 *
 * Lo de Diego Flores: 223.960 por almuerzo y cena, cinco almuerzos y cero cenas,
 * repetido en tres entregas antes de que alguien lo viera.
 */
export const cenasQueNoSalen = (pedidos = []) => (pedidos || [])
    .filter(p => pideCena(p) && !(p?.familias || []).some(esFamiliaDeCena))
    .map(p => aviso(
        'alto', 'sin-cenas',
        'Paga cena pero no le sale ninguna',
        `${p.cliente} lleva "${p.plan}" y en la hoja no aparece ninguna cena suya.`,
        [p.cliente]
    ));

/**
 * 3. Un pack que no se va a cocinar.
 *
 * Si el pack no calzo con ninguna familia del menu no genera ollas: nadie lo
 * cocina y nadie se entera hasta que el cliente reclama.
 *
 * Los packs de DESAYUNOS quedan fuera: se producen por su propio camino y nunca
 * calzan con una familia de almuerzo, asi que avisar de ellos era gritar en
 * falso. Le paso en la hoja del miercoles 9 con el pack de Angie Navarro, y un
 * aviso que se equivoca es peor que ninguno: el de al lado deja de leerse.
 */
export const packsQueNadieCocina = (pedidos = []) => (pedidos || [])
    .filter(p => p?.esPack && !p?.esDesayuno && (p?.familias || []).length === 0)
    .map(p => aviso(
        'alto', 'pack-sin-cocinar',
        'Un pack que no se va a cocinar',
        `El pack de ${p.cliente} ("${p.plan}") no calzo con ninguna familia del menu, `
        + 'asi que no genero ollas.',
        [p.cliente]
    ));

/**
 * 4. El mismo pedido dos veces.
 *
 * Se compara cliente + PLAN. El plan es lo que evita el falso aviso: Hazel
 * Jimenez lleva dos packs el mismo dia a proposito —un Regular y un Sin Carbos—
 * y Diana Gonzalez un pack y unos individuales. Esos no son duplicados. Edwin
 * Perez con el mismo pack dos veces, si.
 */
export const pedidosRepetidos = (pedidos = []) => {
    const porLlave = new Map();
    (pedidos || []).forEach(p => {
        const k = `${clave(p?.cliente)}|${clave(p?.plan)}`;
        if (k === '|') return;
        if (!porLlave.has(k)) porLlave.set(k, []);
        porLlave.get(k).push(p);
    });

    return [...porLlave.values()]
        .filter(lista => lista.length > 1)
        .map(lista => aviso(
            'alto', 'repetido',
            'El mismo pedido dos veces',
            `${lista[0].cliente} aparece ${lista.length} veces con "${lista[0].plan}". `
            + 'Se va a cocinar y cobrar doble.',
            lista.map(p => p.numeroOrden || p.id).filter(Boolean)
        ));
};

/**
 * 5. Se le acaban las entregas.
 *
 * Un pack mensual se termina y nadie avisa. Verlo con una semana de
 * anticipacion es la diferencia entre renovarlo y perderlo.
 */
export const seLesAcaban = (pedidos = [], fecha, diasDeAviso = 7) => {
    if (!fecha) return [];
    const corte = new Date(`${fecha}T12:00:00`);
    if (Number.isNaN(corte.getTime())) return [];
    corte.setDate(corte.getDate() + diasDeAviso);
    const limite = corte.toISOString().slice(0, 10);

    return (pedidos || [])
        .filter(p => {
            const fs = (p?.fechas || []).filter(Boolean).slice().sort();
            if (fs.length < 2) return false;   // una sola entrega no es un pack recurrente
            const ultima = fs[fs.length - 1];
            return ultima >= fecha && ultima <= limite;
        })
        .map(p => {
            const fs = (p.fechas || []).slice().sort();
            return aviso(
                'medio', 'renovacion',
                'Se le acaban las entregas',
                // Sin repetir el nombre: el panel ya lo pone como etiqueta.
                `Le queda la ultima entrega el ${fs[fs.length - 1]}. `
                + 'Hay que ofrecerle la renovacion antes de esa.',
                [p.cliente]
            );
        });
};

/**
 * 6. Datos que faltan.
 *
 * No frenan la cocina, pero si la entrega: sin zona el chofer no sabe a donde
 * va, y sin apellido no se distingue un Eduardo de otro.
 */
export const datosQueFaltan = (pedidos = []) => {
    const faltas = (pedidos || []).map(p => {
        const que = [];
        if (!p?.telefono) que.push('telefono');
        if (!p?.zona) que.push('zona');
        if (String(p?.cliente || '').trim().split(/\s+/).filter(Boolean).length < 2) que.push('apellido');
        return que.length ? { cliente: p.cliente, que } : null;
    }).filter(Boolean);

    if (faltas.length === 0) return [];
    return [aviso(
        'bajo', 'datos-faltantes',
        `Faltan datos de ${faltas.length}`,
        faltas.map(f => `${f.cliente} (${f.que.join(', ')})`).join(' · '),
        faltas.map(f => f.cliente)
    )];
};

/**
 * 7. Un pack de N proteinas que no dice CUALES.
 *
 * El pedido de Diana Gonzalez decia "Pack de 3 proteinas de 250 g" y traia un
 * solo item con ese mismo nombre: en ninguna parte quedo escrito que tres
 * proteinas eligio. La hoja necesitaba tres renglones, no tenia los nombres, y
 * relleno repitiendo el mismo plato — a Gina le salieron tres milanesas de
 * pollo seguidas y penso que el Excel duplicaba cosas.
 *
 * Inventar es peor que avisar: con el aviso se le pregunta al cliente; sin el,
 * se cocinan tres veces lo mismo y alguien recibe lo que no pidio.
 */
export const packsSinDecirCuales = (pedidos = []) => (pedidos || [])
    .map(p => {
        const nombre = String(p?.plan || '');
        const m = nombre.match(/(\d+)\s*prote[ií]nas?/i);
        if (!m) return null;
        const cuantas = Number(m[1]);
        if (!(cuantas > 1)) return null;

        // Los platos de verdad: los que NO son el nombre del pack repetido.
        const propios = (p?.platos || []).map(x => clave(x)).filter(Boolean);
        const distintos = new Set(propios.filter(x => x !== clave(nombre)));
        if (distintos.size >= cuantas) return null;

        return aviso(
            'alto', 'pack-sin-detalle',
            'Un pack de proteínas que no dice cuáles',
            `${p.cliente} lleva "${nombre}" pero en el pedido no quedó escrito qué `
            + `proteínas eligió (hay ${distintos.size} de ${cuantas}). La hoja rellena `
            + 'repitiendo un plato, así que se cocinaría lo mismo varias veces.',
            [p.cliente]
        );
    })
    .filter(Boolean);

const ORDEN_NIVEL = { alto: 0, medio: 1, bajo: 2 };

/**
 * Las revisiones NUEVAS, con la forma que ya usa el panel de la hoja.
 *
 * `revisarHoja` ya avisa de los menus vacios, los pedidos sin platos, las
 * fechas raras, el telefono y la zona. Esto NO repite nada de eso: son las
 * cuatro que nadie estaba mirando y que costaron plata en setiembre.
 *
 * Se devuelve con la misma forma —{ cliente, que, comoSeArregla, gravedad }—
 * para que salga en el MISMO recuadro. Dos listas de avisos en pantallas
 * distintas terminan en que no se lee ninguna.
 */
export const problemasParaLaHoja = ({ pedidos = [], preparaciones = [], fecha = null } = {}) => {
    const comoArreglar = {
        'olla-partida': 'Corregí el nombre en el pedido, o unilos en Sustituciones para que compartan olla.',
        'sin-cenas': 'Abrí el pedido y revisá que los platos de cena estén cargados.',
        'pack-sin-cocinar': 'Revisá el nombre del pack: no calzó con ninguna familia del menú.',
        repetido: 'Cancelá el que sobra, o marcá los dos como "no fusionar" si de verdad son distintos.',
        renovacion: 'Escribile antes de la última entrega para renovarle el pack.',
        'pack-sin-detalle': 'Preguntale al cliente qué proteínas quiere y escribilas en el pedido.'
    };

    return [
        ...ollasPartidas(preparaciones),
        ...cenasQueNoSalen(pedidos),
        ...packsQueNadieCocina(pedidos),
        ...pedidosRepetidos(pedidos),
        ...packsSinDecirCuales(pedidos),
        ...seLesAcaban(pedidos, fecha)
    ].map(a => ({
        cliente: a.tipo === 'olla-partida' ? 'Cocina' : (a.quienes[0] || a.titulo),
        que: a.detalle,
        comoSeArregla: comoArreglar[a.tipo] || '',
        gravedad: a.nivel === 'alto' ? 'alta' : 'media'
    }));
};

/**
 * Todas las revisiones, lo mas grave primero.
 *
 * @param {object} datos
 * @param {Array} datos.pedidos  { cliente, plan, fechas, telefono, zona, familias, esPack }
 * @param {Array} datos.preparaciones  los nombres de olla de la hoja de cocina
 * @param {string} datos.fecha  la fecha de la hoja, para el aviso de renovacion
 */
export const revisarLaHoja = ({ pedidos = [], preparaciones = [], fecha = null } = {}) => [
    ...ollasPartidas(preparaciones),
    ...cenasQueNoSalen(pedidos),
    ...packsQueNadieCocina(pedidos),
    ...pedidosRepetidos(pedidos),
    ...packsSinDecirCuales(pedidos),
    ...seLesAcaban(pedidos, fecha),
    ...datosQueFaltan(pedidos)
].sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel]);
