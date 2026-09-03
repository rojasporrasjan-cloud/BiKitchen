/**
 * Production View Helper Utilities
 */

export const MARGEN_COCINA = 1.30;

export const conMargen = (cantidad) => Math.round((Number(cantidad) || 0) * MARGEN_COCINA);

export const normalizeClientKey = (name) => {
    if (!name) return '';
    return String(name)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
};

/**
 * Fusiona pedidos del mismo cliente (mismo nombre normalizado o mismo teléfono).
 *
 * Cuando hay match, el segundo pedido se descarta: solo se conservan sus
 * observaciones y zona de envío, sus ITEMS se pierden. Por eso se devuelve
 * también `fusionados`, para que la pantalla pueda avisar cuáles pedidos
 * quedaron absorbidos por otro (ver RevisionHoja).
 *
 * Un pedido con `noFusionar: true` NO se absorbe: es un agregado hecho a
 * propósito (una reposición, una proteína extra en una sola entrega de un pack
 * mensual) y sus platos hay que cocinarlos igual que los del pedido principal.
 *
 * Vive acá (no en PrintProductionView) para que Etiquetas pueda usar la MISMA
 * fusión que la hoja de producción: si cada pantalla dedupilcara a su manera,
 * la cantidad de etiquetas y la cantidad que se cocina podrían no coincidir.
 *
 * @param {Array} ordersList - pedidos ya normalizados por mapPedidosFromLegacy
 * @returns {{ pedidos: Array, fusionados: Array }}
 */
/**
 * ¿Es un teléfono de relleno y no uno real?
 *
 * Cuando el pedido llega por WhatsApp sin número se anota 8888-8888. Ese valor
 * NO identifica a nadie: si se usa para fusionar, Luis Carlos Monge y Lizbeth
 * Zeledón —dos clientes sin relación— se convierten en un solo pedido.
 */
export const esTelefonoDeRelleno = (telefono) => {
    const d = String(telefono || '').replace(/\D/g, '');
    if (d.length < 8) return true;
    if (/^(\d)\1+$/.test(d)) return true;        // 88888888, 00000000
    if (/^0?12345678/.test(d)) return true;      // 12345678
    return false;
};

/**
 * Los dos nombres, la misma persona?
 *
 * Compara PALABRAS COMPLETAS, no subcadenas. Con `includes()` sobre el texto,
 * "Ana Mora" caia dentro de "Mariana Morales" —"ana" esta dentro de "mariana"
 * y "mora" dentro de "morales"— y los dos pedidos se fusionaban: el segundo
 * perdia sus items y esa comida no se cocinaba.
 *
 * Sigue uniendo al mismo cliente escrito de mas o de menos: "Bryan Ocampo" y
 * "Bryan Ocampo Granados" comparten TODAS las palabras del nombre corto.
 * Se piden 2 palabras minimo para no unir a todos los "Jose".
 */
/**
 * Las sustituciones que pidio el cliente, plato por plato.
 *
 * El checkout las guarda en `items[].customizations` separadas por tipo
 * (proteinChanges / vegeChanges / carboChanges); los pedidos viejos usan
 * `dishChanges`. Se leen todas para que ningun cambio quede invisible.
 *
 * OJO: la hoja de cocina cocina el MENU OFICIAL del pack. A granel se cuenta el
 * plato original, no el sustituto, asi que el cambio hay que avisarlo aparte o
 * la proteina que pidio el cliente no se cocina.
 */
export const listarSustituciones = (pedido) => {
    if (!pedido) return [];
    const items = pedido.items || pedido.menu || pedido.rawPedido?.items || [];
    if (!Array.isArray(items)) return [];

    const TIPOS = [
        ['proteinChanges', 'proteina'],
        ['vegeChanges', 'vegetal'],
        ['carboChanges', 'carbo'],
        ['dishChanges', 'plato']
    ];

    const subs = [];
    items.forEach(item => {
        const c = item?.customizations || {};
        TIPOS.forEach(([campo, tipo]) => {
            (c[campo] || []).forEach(d => {
                const a = d.newValue || d.newProtein;
                if (!a) return;
                subs.push({ tipo, plato: d.dishNumber, de: d.dishName || '', a });
            });
        });
    });
    return subs;
};

/**
 * Quita de la nota los cambios de plato.
 *
 * `mapPedidosFromLegacy` los anexa a las observaciones, y ademas salen en su
 * propia etiqueta. Sin esto el mismo cambio aparece DOS veces en la celda, con
 * dos formatos distintos, y quien empaca tiene que leer el doble para entender
 * que es lo mismo.
 */
export const sinSustituciones = (obs) => {
    if (!obs) return '';
    return String(obs)
        .split(/\s*·\s*/)
        .filter((parte) => !/^Plato\s+\d+\s*\(.*\)\s*→/.test(parte.trim()))
        .join(' · ')
        .trim();
};

/**
 * Lo que quien empaca necesita ver de un cliente, en orden de importancia.
 *
 * La pantalla y el Excel armaban esta lista por separado y decian cosas
 * distintas: en el Excel no aparecia que el cliente llevara desayunos. Vive acá
 * para que las dos salidas no puedan volver a separarse.
 *
 * Lo que NO va acá: las observaciones del cliente ("sin cerdo", "no aguacate").
 * Esas se muestran aparte porque son texto libre suyo, no un estado que el
 * sistema deduzca.
 *
 * @param {object} cliente - el cliente ya armado para la hoja
 * @param {{esTwoPack?: boolean, otrosPacks?: string}} [opts]
 * @returns {string[]}
 */
export const etiquetasDeEmpaque = (cliente, opts = {}) => {
    if (!cliente) return [];
    const tags = [];

    if (opts.esTwoPack) tags.push('TWO PACK - empacar 2 packs iguales');
    // Si la nota del pedido ya habla de desayunos, la etiqueta generica sobra:
    // salian las dos juntas ("Lleva desayunos" arriba de "Lleva 2 packs de
    // desayunos") y la nota que SI dice cuantos quedaba enterrada.
    const notaHablaDeDesayuno = /desayun/i.test(String(cliente.observaciones || ''));
    if (cliente.incluyeDesayuno && !notaHablaDeDesayuno) tags.push('Lleva desayunos');

    const subs = listarSustituciones(cliente.rawPedido || cliente);
    if (subs.length > 0) tags.push(`CAMBIA: ${subs.map(textoSustitucion).join(' · ')}`);

    // "Lleva desayunos" y "Lleva también: Desayunos" son la misma frase dicha
    // dos veces. La pantalla ya lo limpiaba por su cuenta y el Excel no, asi que
    // ahi salian las dos juntas: "Lleva desayunos | Lleva también: Desayunos |
    // Lleva cena" en la casilla de Angelo Oviedo. Ahora la regla vive acá y las
    // dos salidas la comparten.
    let otros = String(opts.otrosPacks || '').trim();
    if (otros && (cliente.incluyeDesayuno || notaHablaDeDesayuno)) {
        const resto = otros
            .replace(/^Lleva también:\s*/i, '')
            .split(',')
            .map(p => p.trim())
            .filter(p => p && !/^desayunos?$/i.test(p));
        otros = resto.length > 0 ? `Lleva también: ${resto.join(', ')}` : '';
    }
    if (otros) tags.push(otros);
    return tags;
};

/** Una linea legible por sustitucion, para la hoja y los avisos. */
export const textoSustitucion = (s) =>
    `Plato ${s.plato}: ${s.de || s.tipo} → ${s.a}`;

export const esMismoCliente = (a, b) => {
    const ka = normalizeClientKey(a);
    const kb = normalizeClientKey(b);
    if (!ka || !kb) return false;
    if (ka === kb) return true;

    const ta = ka.split(/\s+/).filter(t => t.length > 2);
    const tb = kb.split(/\s+/).filter(t => t.length > 2);
    const sa = new Set(ta);
    const sb = new Set(tb);

    return (ta.length >= 2 && ta.every(t => sb.has(t)))
        || (tb.length >= 2 && tb.every(t => sa.has(t)));
};

export const deduplicateOrdersByClient = (ordersList) => {
    if (!ordersList || ordersList.length === 0) return { pedidos: [], fusionados: [] };
    const seen = new Map();
    const result = [];
    const fusionados = [];

    ordersList.forEach(order => {
        const clientName = order.cliente || order.nombre || '';
        const normKey = normalizeClientKey(clientName);

        let existingKey = null;
        for (const [key, val] of seen.entries()) {
            // El teléfono solo sirve para identificar si es real: el relleno lo comparten
            // muchos clientes y fusionaría pedidos que no tienen nada que ver.
            const samePhone = !esTelefonoDeRelleno(order.telefono)
                && !esTelefonoDeRelleno(val.telefono)
                && String(order.telefono).replace(/\D/g, '') === String(val.telefono).replace(/\D/g, '');
            const isMatch = samePhone || esMismoCliente(key, normKey);

            if (isMatch) {
                existingKey = key;
                break;
            }
        }

        if (existingKey) {
            const existingOrder = seen.get(existingKey);
            const numeroDe = (o) => o.rawPedido?.numeroOrden || o.numeroOrden || o.id;

            // Mismo cliente NO quiere decir mismo pedido. Diana Gonzalez lleva su
            // Pack Mensual Bajo Calorias y aparte 3 milanesas de pollo de 250 g:
            // son dos cosas distintas que hay que cocinar las dos. Aca se juntaban
            // igual y del segundo solo sobrevivian las observaciones, asi que las
            // milanesas desaparecian de la hoja y en su lugar quedaba pegado un
            // "sin cargo" en la fila del pack. Nadie las hubiera empacado.
            //
            // La fusion existe para el pedido importado DOS VECES, y ahi el plan
            // suele venir escrito distinto —"Two Pack" y "Pack Bajo Calorias" para
            // el mismo pedido de Jose Daniel Benavides—, asi que el contenido no
            // sirve para distinguir. Se marca a mano: `noFusionar` en el agregado
            // dice que es un pedido aparte de verdad.
            if (order.noFusionar || existingOrder.noFusionar) {
                const suelto = { ...order };
                if (!suelto.zona_envio && existingOrder.zona_envio) {
                    suelto.zona_envio = existingOrder.zona_envio;
                }
                result.push(suelto);
                return;
            }

            fusionados.push({
                cliente: order.cliente || existingOrder.cliente || '',
                absorbido: numeroDe(order),
                absorbidoPlan: order.plan || order.tipoMenu || '',
                conserva: numeroDe(existingOrder),
                conservaPlan: existingOrder.plan || existingOrder.tipoMenu || ''
            });
            const newObs = order.observaciones || order.details?.notes || '';
            if (newObs) {
                if (!existingOrder.observaciones) {
                    existingOrder.observaciones = newObs;
                } else if (!existingOrder.observaciones.toLowerCase().includes(newObs.toLowerCase())) {
                    existingOrder.observaciones += ` · ${newObs}`;
                }
            }
            if (order.zona_envio && !existingOrder.zona_envio) {
                existingOrder.zona_envio = order.zona_envio;
            }
        } else {
            const orderCopy = { ...order };
            seen.set(normKey, orderCopy);
            result.push(orderCopy);
        }
    });

    return { pedidos: result, fusionados };
};

export const filterNoteForDish = (obs, currentDish, allDishes) => {
    if (!obs) return '';
    const currentProt = (currentDish?.proteina?.nombre || (typeof currentDish?.proteina === 'string' ? currentDish.proteina : '') || '').toLowerCase();

    const clauses = String(obs).split(/\s*[·|—]\s*/).map(c => c.trim()).filter(Boolean);

    const filteredClauses = clauses.filter(clause => {
        const lowerClause = clause.toLowerCase();

        if (lowerClause.includes('cambiar ')) {
            const match = lowerClause.match(/cambiar\s+(.*?)(?:\s+por\s+|$)/i);
            if (match && match[1]) {
                const sourceDishText = match[1].trim();
                const currentKeywords = currentProt.split(/\s+/).filter(k => k.length > 3 && !['salsa', 'con', 'para', 'de', 'el', 'la'].includes(k));
                const matchesCurrentDish = currentKeywords.some(kw => sourceDishText.includes(kw));

                if (matchesCurrentDish) {
                    return true; // Keep this change instruction on its home dish!
                }

                const matchesOtherDish = (allDishes || []).some(d => {
                    const dishProt = (d.proteina?.nombre || (typeof d.proteina === 'string' ? d.proteina : '') || '').toLowerCase();
                    if (!dishProt || dishProt === currentProt) return false;
                    const keywords = dishProt.split(/\s+/).filter(k => k.length > 3 && !['salsa', 'con', 'para', 'de', 'el', 'la'].includes(k));
                    return keywords.some(kw => sourceDishText.includes(kw));
                });

                if (matchesOtherDish) {
                    return false;
                }
            }
        }

        return true;
    });

    return filteredClauses.join(' · ');
};

/**
 * Deja en la nota SOLO lo que le sirve a quien empaca.
 *
 * La hoja la lee el equipo de empaque, no administración. Ahí llegaban cosas que
 * solo servían para el control interno y le tapaban lo importante:
 *
 *   "Diana Jiménez 72047512 / Ricardo Campos 88972181"        → teléfonos
 *   "Fecha corregida: el chat del 24 ago dice sábado 29..."   → nota de sistema
 *   "#ORD-2MSHA9HADP · ₡87.890"                               → número y precio
 *
 * Se conserva todo lo que cambia lo que va en la caja —cambios de plato, alergias,
 * horarios de entrega— y se descarta el resto. Ante la duda, se conserva: perder
 * un "sin chile dulce" es peor que dejar un dato de más.
 */

/** Ocho dígitos seguidos: un teléfono de Costa Rica. */
const TELEFONO = /(?:\+?506[\s-]?)?\b\d{4}[\s-]?\d{4}\b/g;

/** Frases que solo existen para el control interno. */
const NOTA_INTERNA = new RegExp([
    'fecha corregida', 'revisar chat', 'seg[úu]n el chat', 'el chat del',
    '#ord-', 'correo', '@[\\w.-]+\\.\\w+',
    // Notas que dejamos nosotros al ordenar la base, no del cliente
    'pendiente de pago', 'aparece en la hoja de gina', 'fecha movida',
    'no renov[óo]', 'confirmado para que entre', 'seman[ao] \\d+ de \\d+',
    // Control de cobro y de procedencia del dato. Nada de esto le dice a quien
    // empaca que meter en la bolsa, y tapa lo que si importa: en la hoja del
    // miercoles 2 salio impreso, en la casilla de Randall Cerdas, 'Gina
    // confirmo "ya pago" y "entrega en la manana" (chat 31 ago). FALTA LA ZONA'.
    'gina confirm[óo]', 'ya pag[óo]', 'ya viene pagado', 'no se cobra',
    'sin cargo', 'reposici[óo]n', 'falta la zona', '\\(chat\\b',
    'que no se entreg', 'agregado al pack', 'pedido para entrega',
    'segunda entrega de la semana',
    // Marcas que deja el panel al aprobar pedidos en lote. Salio impreso en la
    // casilla de sebastian Villegas: "Confirmado por el admin", que no le dice
    // nada a quien empaca y ocupa el lugar de lo que si importa.
    'confirmado por el admin', 'aprobaci[óo]n masiva', 'fechas? corregidas?',
    'creado por el admin', 'importado (de|desde)',
    // Rastro de nuestras propias correcciones. Salio impreso en la casilla de
    // Marlon Camacho: "Corregido: estaba cargado como cantidad 2 y la hoja lo
    // contaba como 4 packs" — cierto, pero a quien empaca no le sirve de nada.
    'reactivado', 'se hab[ií]a anulado', 'no compr[oó] esta semana',
    'revisar si pag', 'revisar env[ií]o', 'renovaci[óo]n:', 'reemplaza a\\b',
    'ya cobrado', 'van aparte porque', 'cargadas fila por fila',
    'es un solo pedido', 'le quedan \\d+ entrega', 'su pedido es del',
    'la hoja lo contaba', 'tel[ée]fono tomado', 'lo marc[óo] gina',
    'mensaje de cancelaci[óo]n', 'jan confirm[óo]', 'su pedido original',
    'ya pas[óo]\\b', 'hay que ped[ií]rsela', 'corregido:'
].join('|'), 'i');

/** Un monto en colones metido dentro de una frase: "... (4 tazas) ₡7.500". */
const PRECIO_EN_FRASE = /\s*[₡¢]\s*\d[\d.,]*/g;

/** Señales de que la frase sí es una instrucción para la cocina o la entrega. */
const ES_INSTRUCCION = /cambiar|cambio|no poner|sin\b|quitar|agregar|en vez de|sustitu|entregar|antes de las|despu[ée]s de las|llamar|alerg|solo\b|extra|doble|aparte/i;

/**
 * Referencias de control metidas DENTRO de una frase útil.
 *
 * "Cambiar gallo pinto por BURRITOS (chat 2 set)" es una instrucción con una
 * referencia pegada. Antes la frase entera se botaba por mencionar el chat, y
 * a quien empaca no le llegaba el cambio: a Allan Quesada le salía impreso solo
 * "reemplaza el cambio anterior a flautas)", y a Alexandra Mora y a Daniel
 * Milanés no les salía nada —y lo de Daniel era que no puede comer mariscos—.
 * Se quitan del texto en vez de tirar la frase.
 */
const REFERENCIA_INTERNA = /\s*\((?:chat|ver)\b[^)]*\)?|\s*#ORD-[A-Za-z0-9-]+/gi;

/** Todo lo que venga después de esta marca es para nosotros, no para empaque. */
const CORTE_INTERNO = /\bINTERNO\s*:/i;

/** Una frase que ya no dice nada: puros signos, o un resto sin contenido. */
const SIN_CONTENIDO = /^[\s\W]*$/;

export const notaParaEmpaque = (obs) => {
    if (!obs) return '';

    const texto = String(obs).split(CORTE_INTERNO)[0];

    const frases = texto
        // Las notas vienen separadas por "·", por raya, y por punto y seguido:
        // sin cortar en el punto, una instrucción y el apunte interno que le
        // sigue quedaban en la misma frase y se iban juntos a la basura.
        .split(/\s*[·|—]\s*|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
        .map(f => f.replace(REFERENCIA_INTERNA, '').replace(/\(\s*\)/g, '').trim())
        // Un parentesis se puede haber abierto en una frase y cerrado en la
        // siguiente: "…por BURRITOS (chat 2 set — reemplaza lo anterior)". Al
        // cortar por la raya, la segunda mitad queda huerfana y sin sentido.
        // Se reconoce porque cierra un parentesis que nunca abrio.
        .filter(f => f && !SIN_CONTENIDO.test(f)
            && !(f.includes(')') && !f.includes('(')));

    const utiles = frases.filter(frase => {
        if (NOTA_INTERNA.test(frase)) return false;

        // Un teléfono solo estorba, salvo que la frase además pida algo
        if (TELEFONO.test(frase)) {
            TELEFONO.lastIndex = 0;
            return ES_INSTRUCCION.test(frase);
        }
        TELEFONO.lastIndex = 0;

        // Una frase que es puro precio no dice nada al empacar
        if (/^[₡¢$]?\s*[\d.,\s]+(colones|crc)?$/i.test(frase)) return false;

        return true;
    }).map(frase => {
        // "Llamar al 7157-8779 antes de entregar" se queda ENTERA: sin el número la
        // instrucción no sirve. Los teléfonos sueltos ya se descartaron más arriba.
        const esInstruccion = ES_INSTRUCCION.test(frase);
        TELEFONO.lastIndex = 0;

        // A quien empaca le sirve saber QUE guarniciones van; cuanto costaron no.
        return (esInstruccion ? frase : frase.replace(TELEFONO, ''))
            .replace(PRECIO_EN_FRASE, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s+([,.])/g, '$1')
            .trim();
    }).filter(frase => {
        if (!frase) return false;
        // Quitar el precio puede dejar una frase coja. En la casilla de Jenny
        // Alvarado salio impreso "REVISAR ENVIO: el mensaje dice pero el total
        // de solo cuadra con": la frase vivia de los numeros que se quitaron.
        return !/\b(dice|cuadra con|es de|de)\s*$/i.test(frase) && !SIN_CONTENIDO.test(frase);
    });

    return utiles.join(' · ');
};

/**
 * Cuántos packs de ese menú lleva un cliente.
 *
 * La cantidad puede venir en dos lugares según por dónde entró el pedido:
 *   - `cantidadMenus` → pedidos hechos en la web
 *   - la cantidad del ítem → pedidos que Gina metió por WhatsApp
 *
 * Mirando solo `cantidadMenus`, el pedido de "3x Pack Mensual Bajo Calorías"
 * —₡232.500, o sea 3 × ₡77.500— salía en la hoja como UN pack: el cliente
 * recibía la tercera parte de lo que pagó.
 *
 * Se toma el MAYOR de los dos, no la suma: son dos formas de escribir el mismo
 * dato, no dos cantidades que se acumulen.
 *
 * Solo vale para packs. En los individuales la cantidad ya viaja dentro de cada
 * plato, y contarla también acá la multiplicaría dos veces.
 */
export const cantidadDePacks = (cliente) => {
    const declarada = Number(cliente?.cantidadMenus) || 1;
    const delItem = Number(cliente?.rawPedido?.items?.[0]?.cantidad) || 1;
    return Math.max(declarada, delItem);
};
