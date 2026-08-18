/**
 * Parseo del texto de pedidos que reenvía la administración.
 *
 * El texto puede venir en dos formatos, y los DOS los genera este mismo sistema:
 *  - El cuerpo del correo de aviso  → generateStyledSummary() en emailNotifications.js
 *  - El mensaje de WhatsApp         → construido en CheckoutSteps.jsx
 *
 * En ambos el número de pedido aparece igual: #ORD-XXXXXXXXXX. Por eso el
 * importador se ancla al número y NO confía en el resto del texto: una vez
 * ubicado el pedido, los datos buenos se leen de Firestore.
 */

// Los números se generan como `#ORD-` + base36 en mayúsculas (ver generateOrderNumber
// en CheckoutSteps.jsx). Los pedidos viejos creados desde el admin usan 4 dígitos.
const ORDER_NUMBER_RE = /#ORD-[A-Z0-9]+/gi;

/**
 * Extrae todos los números de pedido presentes en un texto, sin repetir y en el
 * orden en que aparecen.
 *
 * @param {string} text - Texto crudo pegado por el usuario
 * @returns {string[]} Números normalizados en mayúsculas (ej: ['#ORD-MLMPMVGE99'])
 */
export const extractOrderNumbers = (text) => {
    if (!text || typeof text !== 'string') return [];

    const matches = text.match(ORDER_NUMBER_RE) || [];
    const seen = new Set();
    const unique = [];

    for (const match of matches) {
        const normalized = match.toUpperCase();
        if (!seen.has(normalized)) {
            seen.add(normalized);
            unique.push(normalized);
        }
    }

    return unique;
};

// --------- Parseo completo del bloque (pedidos manuales del chat) ---------

/** Lee "₡13.500" / "13 500" / "16500" y devuelve 16500. Los montos en CRC son enteros. */
const parseAmount = (raw) => {
    if (!raw) return null;
    const digits = String(raw).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : null;
};

/**
 * Textos de relleno que el sistema escribe cuando un campo viene vacío.
 *
 * La lista es EXACTA a propósito. Antes se descartaba cualquier valor que
 * empezara con "sin", y eso se tragaba observaciones reales como "Sin cebolla"
 * o "Sin sal", que son las notas más comunes en comida.
 */
const ES_RELLENO = /^(n\/a|no especificad[oa]s?|ningun[ao]|sin referencias|sin observaciones|sin descuento|sin cup[óo]n|sin datos|sin especificar)$/i;

/** Etiquetas que el parser entiende. Se usan para no confundirlas con otra cosa. */
const ETIQUETA_CONOCIDA = /^\s*(cliente|nombre|tel[ée]fono|tel|lugar|zona|direcci[óo]n|se[ñn]as|referencias|precio|subtotal|total|descuento|env[íi]os?|flete|entregas?|fecha de entrega|fecha del pedido|notas|observaciones|correo|email|e-mail|pago|m[ée]todo de pago|prote[íi]nas?|c[ée]dula|cup[óo]n|transacci[óo]n)\s*[:\s]/i;

/**
 * Quita el prefijo que agrega WhatsApp al copiar mensajes del chat:
 *   "[10:50 p. m., 12/8/2026] Gina: two pack bajo calorías"
 *   "12/8/2026, 10:50 p. m. - Gina: two pack bajo calorías"
 *
 * Es lo primero que se hace, y no es cosmético: el sello de hora trae una FECHA
 * que si no se quita se puede colar como fecha de entrega. Un pedido quedaría
 * programado para el día en que se escribió el mensaje.
 *
 * El nombre de quien escribe solo se quita si venía detrás de un sello de hora,
 * y nunca si resulta ser una etiqueta que sí nos importa (por ejemplo un mensaje
 * que arranque directo con "Cliente:").
 */
export const limpiarPrefijosDeChat = (text) => {
    if (!text || typeof text !== 'string') return '';

    return text.split('\n').map((lineaOriginal) => {
        let linea = lineaOriginal;

        // "[10:50 p. m., 12/8/2026] "
        linea = linea.replace(/^\s*\[[^\]\n]{5,40}\]\s*/, '');
        // "12/8/2026, 10:50 p. m. - "
        linea = linea.replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}(?:\s*[ap]\.?\s*m\.?)?\s*[-–]\s*/i, '');

        // Solo si se quitó un sello de hora se quita también "Nombre: "
        if (linea !== lineaOriginal && !ETIQUETA_CONOCIDA.test(linea)) {
            linea = linea.replace(/^[^:\n]{1,40}:\s*/, '');
        }

        return linea;
    }).join('\n');
};

/**
 * Captura el valor de una etiqueta.
 *
 * Tiene que servir para los DOS formatos que genera el sistema:
 *   correo:    "Nombre: Jairo Monge"
 *   WhatsApp:  "👤 *CLIENTE*: Jairo Monge"
 *
 * Por eso admite emojis, viñetas y los asteriscos de negrita de WhatsApp antes
 * y después de la etiqueta. `[^\p{L}\n]*` se queda dentro de la línea: sin
 * excluir el salto de línea se comería las líneas de arriba.
 */
const grab = (text, labels, { sinDosPuntos = false, validoSinDosPuntos } = {}) => {
    const intentar = (separador, validar) => {
        for (const label of labels) {
            const re = new RegExp(`^[^\\p{L}\\n]*\\*?\\s*${label}\\s*\\*?\\s*${separador}\\s*(.+)$`, 'imu');
            const match = text.match(re);
            if (match) {
                const value = match[1].replace(/\*/g, '').trim();
                if (value && !ES_RELLENO.test(value) && (!validar || validar(value))) return value;
            }
        }
        return null;
    };

    // Primero se buscan los dos puntos, que es como lo escribe el sistema.
    // Recién si no aparecen se acepta el espacio, porque escrito a mano se omiten
    // ("Teléfono 8800-8668", "Envíos 3000"). Ese segundo intento es el peligroso:
    // un encabezado de varias palabras como "OBSERVACIONES DEL CLIENTE" devolvería
    // "DEL CLIENTE", así que quien lo use puede exigir que el valor tenga sentido.
    return intentar(':') || (sinDosPuntos ? intentar('[:\\s]', validoSinDosPuntos) : null);
};

/**
 * Sin dos puntos hay que asegurarse de que lo capturado sea el número y no el
 * resto de la etiqueta: "Teléfono de contacto: 8800-8668" daría "de contacto:...".
 */
const PARECE_TELEFONO = (value) => /^[+(]?[\d\s\-()./]+$/.test(value)
    && value.replace(/\D/g, '').length >= 8;

const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}/;

const MESES = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11
};

const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const aISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Lee una fecha escrita a mano y la devuelve en AAAA-MM-DD.
 *
 * Acepta lo que escribe la administración: "Miércoles 12 de agosto",
 * "12 de agosto de 2026", "12/08/2026" y el ISO de siempre.
 *
 * Cuando no viene el año se usa el actual, y si eso daría una fecha ya pasada
 * hace más de un mes se asume el año siguiente (un pedido de "5 de enero"
 * escrito en diciembre es del año que viene, no del que termina).
 *
 * @param {string} texto
 * @param {Date} [hoy] - inyectable para poder testear
 * @returns {string|null}
 */
export const parseFechaEspanol = (texto, hoy = new Date(), defaultMonth = null) => {
    if (!texto || typeof texto !== 'string') return null;

    // Limpiar notas entre paréntesis como "(entregar 5 comidas)" para no ensuciar la fecha
    const limpio = texto.replace(/\([^)]*\)/g, '').trim();

    const iso = limpio.match(ISO_DATE_RE);
    if (iso) return iso[0];

    // 12/08/2026 o 12-08-2026
    const numerica = limpio.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    if (numerica) {
        const [, d, m, yRaw] = numerica;
        const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
        return aISO(y, Number(m) - 1, Number(d));
    }

    // "12 de agosto", "15 agosto"
    const sinT = sinTildes(limpio);
    const conMes = sinT.match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?/);
    if (conMes) {
        const dia = Number(conMes[1]);
        let mes = MESES[conMes[2]];

        if (mes === undefined && defaultMonth !== null) {
            mes = defaultMonth;
        }

        if (mes === undefined || dia < 1 || dia > 31) return null;

        if (conMes[3]) return aISO(Number(conMes[3]), mes, dia);

        // Sin año: el actual, salvo que ya haya quedado muy atrás
        const base = new Date(hoy);
        base.setHours(0, 0, 0, 0);
        let anio = base.getFullYear();
        const candidata = new Date(anio, mes, dia);
        const treintaDias = 30 * 86400000;
        if (base - candidata > treintaDias) anio += 1;
        return aISO(anio, mes, dia);
    }

    // "Miércoles 26" (sin mes explícito, hereda el mes del bloque)
    const sinNombreMes = sinT.match(/\b(\d{1,2})\b/);
    if (sinNombreMes && defaultMonth !== null) {
        const dia = Number(sinNombreMes[1]);
        if (dia >= 1 && dia <= 31) {
            const base = new Date(hoy);
            base.setHours(0, 0, 0, 0);
            let anio = base.getFullYear();
            return aISO(anio, defaultMonth, dia);
        }
    }

    return null;
};

/**
 * Fechas de entrega. Cubre tres formas:
 *   " • Entrega 1: 2026-08-12"     (correo, packs de varias semanas)
 *   "Fecha de Entrega: 2026-08-12" / "🚚 *ENTREGA*: ..."
 *   "Entregas" y en las líneas de abajo "Miércoles 12 de agosto"
 */
const grabDeliveryDates = (text, hoy) => {
    const multi = [...text.matchAll(/•\s*Entrega\s*\d+\s*:\s*(.+)/gi)]
        .map(m => parseFechaEspanol(m[1], hoy))
        .filter(Boolean);
    if (multi.length > 0) return multi;

    // Encabezado "Entregas" solo, con las fechas en las líneas siguientes.
    const lineas = text.split('\n');
    const idx = lineas.findIndex(l => /^\s*Entregas?\s*:?\s*$/i.test(l));
    if (idx !== -1) {
        const fechas = [];
        let lastMonth = null;

        for (let i = idx + 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;

            const fecha = parseFechaEspanol(linea, hoy, lastMonth);
            if (fecha) {
                fechas.push(fecha);
                const m = Number(fecha.split('-')[1]) - 1;
                lastMonth = m;
            }
        }
        if (fechas.length > 0) return fechas;
    }

    const single = grab(text, ['Fecha de Entrega', 'Fecha Entrega', 'ENTREGA', 'Entregas?']);
    const desdeEtiqueta = parseFechaEspanol(single || '', hoy);
    if (desdeEtiqueta) return [desdeEtiqueta];

    return [];
};

/**
 * Extrae los ítems. formatItemsForEmail() los escribe así:
 *   1× Pack de Proteínas - Pack 3 Proteínas (250g) (Semanal) - ₡13.500
 *   └ Proteínas: Carne mechada, Pollo al pesto
 *
 * El nombre se conserva ENTERO (con el "(250g)") porque logisticsUtils saca los
 * gramos por porción justamente de ahí.
 */
const ES_LINEA_PRECIO = /^\s*Precio\s*:?\s*[₡¢$]?\s*[\d.,\s]+\s*$/i;
const ES_SEPARADOR = /^[\s━─=*_·.-]*$/;
const ES_MONTO_SUELTO = /^[\s₡¢$]*[\d.,\s]+$/;
const PARECE_FECHA = /\b\d{1,2}\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i;

/** Encabezado de sección tipo "👤 INFORMACIÓN DEL CLIENTE": todo en mayúsculas. */
const esEncabezado = (t) => {
    const letras = t.replace(/[^\p{L}]/gu, '');
    return letras.length > 3 && letras === letras.toUpperCase();
};

/**
 * Corta la lectura de un ítem: separador, etiqueta, fecha, monto o detalle.
 *
 * NO incluye los encabezados en mayúsculas a propósito: una línea como
 * "REGALIA DESAYUNOS" es parte de la descripción del pack, no un encabezado de
 * sección, y si se cortara ahí el ítem no se detectaría.
 */
const ES_HEADER_SECCION = /^(?:👤|🛒|🚚|📝|💳|📦)?\s*(?:INFORMACI[ÓO]N|PRODUCTOS|DETALLES|RESUMEN|M[ÉE]TODO)\b/i;

const esCorteDeItem = (linea) => {
    const t = (linea || '').trim();
    if (!t) return false;
    return ES_SEPARADOR.test(t)
        || ETIQUETA_CONOCIDA.test(t)
        || ES_HEADER_SECCION.test(t)
        || PARECE_FECHA.test(t)
        || ES_MONTO_SUELTO.test(t)
        || /^[└│├]/.test(t)
        || /#ORD-/i.test(t);
};

/** Una línea que no aporta nada por sí sola (encabezado, monto, fecha, etiqueta). */
export const esLineaIgnorable = (linea) => {
    const t = (linea || '').trim();
    if (!t) return true;
    if (esCorteDeItem(t)) return true;
    if (esEncabezado(t)) return true;           // "👤 INFORMACIÓN DEL CLIENTE"
    return false;
};

/** Extrae promo/instrucciones del texto del ítem */
const processItemNameAndInstructions = (mainText, extrasArray, tieneDescripcion) => {
    const instruccionFuerte = /^(cambiar|con\s|sin\s|nota|ojo|\+|mandar|enviar|pidio|pidió)/i;
    let nameExtras = [];
    let instructionExtras = [];
    let _extras = tieneDescripcion ? [...extrasArray] : [];
    let currentMainText = mainText;

    const formatInstruction = (t) => {
        return t.replace(/^[\s•·*□▢▪◦◽◾-]+/, '').trim();
    };

    if (/^\s*(?:kg|kilos?|g|gramos?)\b/i.test(currentMainText)) {
        const kgMatch = currentMainText.match(/^\s*(kg|kilos?|g|gramos?)\s+(.+)$/i);
        if (kgMatch) {
            currentMainText = `${kgMatch[2]} (${kgMatch[1].toLowerCase()})`;
        }
    }

    if (/^\s*unidades?\s+de\s+(?:desayunos?|almuerzos?|comidas?|cenas?)\s*$/i.test(currentMainText) && _extras.length > 0) {
        currentMainText = _extras[0].texto;
        _extras = _extras.slice(1);
    }

    if (instruccionFuerte.test(currentMainText) && _extras.length > 0) {
        instructionExtras.push(formatInstruction(currentMainText));
        currentMainText = _extras[0].texto;
        _extras = _extras.slice(1);
    }

    _extras.forEach(e => {
        const txt = e.texto;
        if (/\bregal[ií]a\b/i.test(txt) || /\bpack\b/i.test(txt)) {
            nameExtras.push(txt);
        } else if (instruccionFuerte.test(txt) || (/\b(?:desayunos?|cenas?)\b/i.test(txt) && !/\bregal[ií]a\b/i.test(txt))) {
            instructionExtras.push(formatInstruction(txt));
        } else {
            nameExtras.push(txt);
        }
    });

    const nombreFinal = (nameExtras.length > 0 
        ? [currentMainText, ...nameExtras].join(' - ')
        : currentMainText
    ).replace(/^[\s•·*□▢▪◦◽◾-]+/, '').replace(/\*/g, '').trim();

    return {
        nombre: nombreFinal,
        instruccionesSuelta: instructionExtras.filter(Boolean)
    };
};

/**
 * Extrae los ítems y devuelve además qué líneas consumió, para que
 * parseOrderBlock pueda rescatar como observación lo que quedó suelto.
 *
 * Reconoce tres formas de escribir un ítem:
 *   "1× Pack de Proteínas ... - ₡13.500"   (correo)
 *   "• 1× Pack ..." + "   └ ₡13.500"       (WhatsApp)
 *   "□ 1 pack 3 proteínas de 500g"         (a mano, sin ×)
 *   "two pack bajo calorías Mensual"       (a mano, SIN número)
 *
 * El último caso es el delicado: una línea cualquiera podría pasar por ítem. Por
 * eso solo se acepta si debajo viene una línea "Precio ...", que es lo que
 * confirma que se está describiendo algo que se cobra.
 *
 * El nombre se conserva ENTERO (con el "(250g)") porque logisticsUtils saca los
 * gramos por porción justamente de ahí.
 */
/**
 * Lee las líneas que van DEBAJO del nombre de un ítem, hasta su precio.
 *
 * Escrito a mano, debajo del ítem puede venir la lista de proteínas
 * ("Pack 5 proteínas" + 5 líneas) o una descripción suelta ("REGALIA DESAYUNOS").
 * Solo cuenta si termina en una línea de precio: sin eso no hay ítem que valga.
 *
 * Las líneas "Proteínas: a, b, c" cortan la búsqueda a propósito, porque ya las
 * lee el manejador de detalles de más abajo.
 */
const DETALLE_PROTEINAS_RE = /^[\s└│├•·*◽◾-]*Prote[íi]nas?\s*:/i;

/**
 * Cuántos platos anuncia el ítem: "5 proteínas", "6 por semana", "5 comidas".
 * De acá sale cuántas veces se repite un plato cuando abajo viene uno solo.
 */
const CANTIDAD_ANUNCIADA = /(\d+)\s*(?:prote[íi]nas?|desayunos?|almuerzos?|comidas?|platos?|por\s+semana)/i;

/**
 * Líneas que son un ítem aunque no las siga una línea de "Precio".
 *
 * Cuando el pedido trae un solo ítem, se suele escribir el monto una única vez
 * como "Total: 66.800" y nunca aparece un "Precio". Sin esto, ese pedido entra
 * SIN ítems: ni platos, ni hoja de cocina, ni nada.
 */
const esItemEvidente = (t) => /\b(pack|paquete|desayunos?|almuerzos?|comidas?|cenas?|unidades?)\b/i.test(t) || CANTIDAD_ANUNCIADA.test(t);

const absorberDescripcion = (lines, i, texto) => {
    // Un ítem que anuncia N platos viene seguido de la LISTA, una por línea. Ahí
    // se aceptan varias; si no, solo dos, para que una descripción suelta no se
    // trague media hoja.
    const anuncio = texto.match(CANTIDAD_ANUNCIADA);
    const cantidadAnunciada = anuncio ? parseInt(anuncio[1], 10) : 0;
    const maxExtras = cantidadAnunciada > 0 ? Math.max(cantidadAnunciada, 12) : 6;

    const extras = [];
    let j = i + 1;
    let idxPrecio = -1;

    while (j < lines.length && extras.length < maxExtras) {
        const t = lines[j].trim();
        if (!t) { j++; continue; }
        if (ES_LINEA_PRECIO.test(t)) {
            if (idxPrecio === -1) idxPrecio = j;
            if (cantidadAnunciada > 0 && extras.length < cantidadAnunciada) {
                j++;
                continue;
            } else {
                break;
            }
        }
        if (esCorteDeItem(t) || DETALLE_PROTEINAS_RE.test(t)) break;
        extras.push({ idx: j, texto: t });
        j++;
    }

    // "Paquete mensual desayunos (6 por semana)" + UN plato = ese plato seis veces.
    // Es distinto de "Pack 5 proteínas" + 5 líneas, donde cada línea es un plato.
    let platos = [];
    if (cantidadAnunciada > 1 && extras.length === 1) {
        platos = Array.from({ length: cantidadAnunciada }, () => extras[0].texto);
    } else if (cantidadAnunciada > 0 && extras.length > 0) {
        platos = extras.map(e => e.texto);
    }

    return { platos, extras, idxPrecio };
};

const grabItems = (text) => {
    const items = [];
    const consumidas = new Set();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // --- Ítem que arranca con número ---
        let itemMatch = line.match(/^[\s•·*□▢▪◦◽◾-]*(\d+)\s*[×x]\s*(.+)$/i);
        if (!itemMatch) {
            const suelto = line.match(/^[\s•·*□▢▪◦◽◾-]*(\d+)\s+(\p{L}.*)$/u);
            if (suelto && !PARECE_FECHA.test(line)) itemMatch = suelto;
        }

        if (itemMatch) {
            let rest = itemMatch[2].trim();
            let precio = null;

            // Formato correo: el precio va al final de la misma línea. Es el ÚLTIMO
            // " - ₡..." porque el nombre del pack también trae guiones. Ocasionalmente viene con ":" en vez de "-".
            const priceMatch = rest.match(/^(.*?)\s*[-:]\s*[₡¢$]\s*([\d.,\s]+)$/);
            if (priceMatch) {
                rest = priceMatch[1].trim();
                precio = parseAmount(priceMatch[2]);
            }

            // Sin precio en la misma línea es formato escrito a mano: debajo puede
            // venir la lista de proteínas o una descripción, y después el precio.
            const desc = precio === null
                ? absorberDescripcion(lines, i, rest)
                : { platos: [], extras: [], idxPrecio: -1 };

            // Se registra la descripción si hay precio abajo, o si la línea es un
            // ítem de todas formas (ver esItemEvidente: puede que el monto solo
            // aparezca como "Total:" más abajo).
            const tieneDescripcion = desc.extras.length > 0
                && (desc.idxPrecio !== -1 || esItemEvidente(rest));

            // Filtrar y limpiar el nombre
            const { nombre, instruccionesSuelta } = processItemNameAndInstructions(
                rest, 
                desc.extras, 
                tieneDescripcion && desc.platos.length === 0
            );

            items.push({
                cantidad: parseInt(itemMatch[1], 10) || 1,
                nombre,
                precio,
                proteinas: tieneDescripcion ? desc.platos : [],
                instruccionesSuelta
            });
            consumidas.add(i);

            if (tieneDescripcion) {
                desc.extras.forEach(e => consumidas.add(e.idx));
                // Saltar lo ya leído: si no, cada línea de la descripción se
                // volvería a evaluar y entraría como un ítem repetido.
                i = desc.idxPrecio !== -1
                    ? desc.idxPrecio - 1
                    : desc.extras[desc.extras.length - 1].idx;
            }
            continue;
        }

        // --- Ítem SIN número: lo confirma un "Precio" debajo, o que sea un ítem
        //     evidente cuyo monto aparece más abajo como "Total:" ---
        let texto = line.trim();
        let precioInline = null;

        if (texto && !esCorteDeItem(texto)) {
            const inlineMatch = texto.match(/^(.*?)\s*[-:]\s*[₡¢$]\s*([\d.,\s]+)$/);
            if (inlineMatch) {
                texto = inlineMatch[1].trim();
                precioInline = parseAmount(inlineMatch[2]);
            }

            const { platos, extras, idxPrecio } = absorberDescripcion(lines, i, texto);

            if (idxPrecio !== -1 || (esItemEvidente(texto) && extras.length > 0)) {
                
                const { nombre, instruccionesSuelta } = processItemNameAndInstructions(
                    texto, 
                    extras, 
                    platos.length === 0
                );

                items.push({
                    cantidad: 1,
                    nombre,
                    precio: precioInline,
                    proteinas: platos,
                    instruccionesSuelta
                });
                consumidas.add(i);
                extras.forEach(e => consumidas.add(e.idx));

                // Saltar lo ya leído. Sin esto, cada línea de la descripción se
                // volvería a evaluar y entraría como ítem repetido.
                i = idxPrecio !== -1
                    ? idxPrecio - 1
                    : extras[extras.length - 1].idx;
                continue;
            }
        }

        if (items.length === 0) continue;
        const ultimo = items[items.length - 1];

        // Líneas de detalle del último ítem. El "└" lo pone el sistema;
        // escrito a mano suele venir como "Proteínas: ..." pelado.
        const protMatch = line.match(/^[\s└│├•·*-]*Prote[íi]nas?\s*:\s*(.+)$/i);
        if (protMatch) {
            ultimo.proteinas = protMatch[1]
                .split(',')
                .map(p => p.replace(/\*/g, '').trim())
                .filter(Boolean);
            consumidas.add(i);
            continue;
        }

        // El precio del ítem puede venir en su propia línea:
        //   "   └ ₡13.500"     (WhatsApp)
        //   "Precio 25.850"    (a mano)
        const precioSuelto = line.match(/└\s*[₡¢$]\s*([\d.,\s]+)$/)
            || line.match(/^\s*Precio\s*:?\s*[₡¢$]?\s*([\d.,\s]+)\s*$/i);
        if (precioSuelto) {
            if (ultimo.precio === null) ultimo.precio = parseAmount(precioSuelto[1]);
            consumidas.add(i);
        }
    }

    return { items, consumidas };
};

/**
 * Parsea un bloque de pedido completo.
 *
 * Nunca lanza: devuelve lo que pudo leer y una lista de `warnings` con lo que
 * falta. La UI muestra esos avisos y el humano decide — es preferible eso a
 * inventar datos que después la cocina no puede usar.
 *
 * @param {string} text
 * @returns {object} datos del pedido + warnings
 */
export const parseOrderBlock = (textoCrudo, hoy = new Date()) => {
    const warnings = [];
    if (!textoCrudo || typeof textoCrudo !== 'string') {
        return { warnings: ['El texto está vacío.'], items: [], fechasEntrega: [] };
    }

    // Lo PRIMERO: quitar los sellos de hora del chat. Si no, la fecha del sello
    // se puede colar como fecha de entrega y el pedido queda programado mal.
    const text = limpiarPrefijosDeChat(textoCrudo);

    // Las etiquetas cubren los dos formatos: el del correo y el de WhatsApp
    const numeroOrden = extractOrderNumbers(text)[0] || null;
    const cliente = grab(text, ['Nombre', 'CLIENTE', 'Cliente']);
    // La tercera etiqueta cubre "Teléfono de contacto:" y "Teléfono celular:"
    const telefono = grab(text, ['Tel[ée]fono', 'Tel', 'Tel[ée]fono[^:\\n]{0,20}'], {
        sinDosPuntos: true,
        validoSinDosPuntos: PARECE_TELEFONO
    });
    const correo = grab(text, ['Email', 'Correo', 'E-mail']);
    const cedula = grab(text, ['C[ée]dula']);
    // "Lugar" es como lo escribe la administración a mano
    const zona = grab(text, ['Zona(?: de entrega)?', 'Lugar', 'Ubicaci[óo]n'], { sinDosPuntos: true });
    const direccion = grab(text, ['Direcci[óo]n', 'Se[ñn]as']);
    const referencias = grab(text, ['Referencias']);

    // Las observaciones no llevan dos puntos: van en la línea siguiente al
    // encabezado "📝 OBSERVACIONES DEL CLIENTE" (ver generateStyledSummary).
    let observaciones = grab(text, ['Observaciones', 'NOTAS', 'Notas']);
    if (!observaciones) {
        const headerNoteMatch = text.match(/^\s*NOTAS?\s*:?\s*\n([\s\S]*?)(?=👤|INFORMACI[ÓO]N|CLIENTE\s*:|$)/i);
        if (headerNoteMatch && headerNoteMatch[1].trim()) {
            observaciones = headerNoteMatch[1].trim();
        } else {
            const obsMatch = text.match(/OBSERVACIONES[^\n]*\n\s*([^\n]+)/i);
            const value = obsMatch && obsMatch[1].trim();
            if (value && !/^(ninguna|sin observaciones|n\/a)$/i.test(value)) observaciones = value;
        }
    }

    const total = parseAmount(grab(text, ['TOTAL', 'Total']));
    const subtotal = parseAmount(grab(text, ['Subtotal']));
    // "Envíos 3000" — en plural y sin dos puntos, como se escribe a mano
    const envioRaw = grab(text, ['Env[íi]os?', 'Flete'], { sinDosPuntos: true });
    const costoEnvio = /confirmar/i.test(envioRaw || '') ? 0 : (parseAmount(envioRaw) ?? 0);
    const descuento = parseAmount(grab(text, ['Descuento'])) ?? 0;

    const fechasEntrega = grabDeliveryDates(text, hoy);
    
    // Si hay una nota de cabecera antes del cliente, se escanean los ítems después de la nota
    let textItemsScan = text;
    const headerMatch = text.match(/^\s*NOTAS?\s*:?\s*\n[\s\S]*?(?=👤|INFORMACI[ÓO]N|CLIENTE\s*:)/i);
    if (headerMatch) {
        textItemsScan = text.slice(headerMatch[0].length);
    }
    
    const { items, consumidas } = grabItems(textItemsScan);

    // WhatsApp lo trae como "💳 *PAGO*: SINPE"; el correo lo pone en la línea
    // siguiente al encabezado "MÉTODO DE PAGO".
    let metodoPago = grab(text, ['PAGO', 'M[ée]todo de pago']);
    if (!metodoPago) {
        const payMatch = text.match(/M[ÉE]TODO DE PAGO[^\n]*\n[━\-=\s]*\n?\s*([^\n]+)/i);
        if (payMatch) metodoPago = payMatch[1].replace(/\*/g, '').trim();
    }

    // Líneas que no encajaron en nada: se rescatan como observación.
    // Una restricción de comida ("Solo chayote y zanahoria") suele venir suelta,
    // sin etiqueta, y perderla es de los errores más caros: nadie se entera hasta
    // que el cliente recibe algo que no come.
    if (!observaciones) {
        const sueltas = text.split('\n')
            .map((linea, i) => ({ linea: linea.trim(), i }))
            .filter(({ linea, i }) => (
                !consumidas.has(i) &&
                !esLineaIgnorable(linea) &&
                linea !== (metodoPago || '').trim() &&
                !/^entregas?$/i.test(linea)
            ))
            .map(({ linea }) => linea);

        if (sueltas.length > 0) observaciones = sueltas.join(' · ');
    }
    let finalTelefono = telefono;
    let finalZona = zona;

    // Si la administración invirtió los campos al escribir en WhatsApp
    // (ej: Teléfono: Tibas / Lugar: 8345-2491), los intercambiamos automáticamente
    if (finalTelefono && !PARECE_TELEFONO(finalTelefono) && finalZona && PARECE_TELEFONO(finalZona)) {
        const temp = finalTelefono;
        finalTelefono = finalZona;
        finalZona = temp;
    } else if (!finalTelefono && finalZona && PARECE_TELEFONO(finalZona)) {
        finalTelefono = finalZona;
        finalZona = null;
    }

    // Lo que la cocina y las reglas de Firestore necesitan sí o sí
    if (!cliente) warnings.push('Falta el nombre del cliente.');
    if (!finalTelefono) warnings.push('Falta el teléfono.');
    // El correo NO se avisa: si no viene, se arma a partir del teléfono
    // (ver resolverCorreo en buildPedidoFromImport.js).
    if (!total || total <= 0) warnings.push('Falta el TOTAL o quedó en cero.');
    if (items.length === 0) warnings.push('No pude leer ningún ítem del pedido.');

    // Un pack que anuncia N proteínas pero no dice cuáles deja a la cocina sin
    // saber qué preparar: saldría un solo renglón con el nombre del pack.
    items.forEach((item) => {
        const anuncia = String(item.nombre || '').match(/(\d+)\s*prote[íi]nas?/i);
        if (anuncia && item.proteinas.length === 0) {
            warnings.push(`"${item.nombre}" dice ${anuncia[1]} proteínas pero no dice cuáles — escribilas abajo o la cocina no sabrá qué preparar.`);
        }
    });
    if (fechasEntrega.length === 0) warnings.push('Falta la fecha de entrega en formato AAAA-MM-DD — sin ella el pedido no sale en la hoja de producción.');

    // Mover las instrucciones sueltas detectadas en los ítems a las observaciones globales
    items.forEach(item => {
        if (item.instruccionesSuelta && item.instruccionesSuelta.length > 0) {
            const extraNotas = item.instruccionesSuelta.join(' · ');
            observaciones = observaciones ? `${observaciones} · ${extraNotas}` : extraNotas;
            delete item.instruccionesSuelta;
        }
    });

    return {
        numeroOrden, cliente, telefono: finalTelefono, correo, cedula,
        zona: finalZona, direccion, referencias, observaciones,
        items, subtotal, descuento, costoEnvio, total,
        fechasEntrega, metodoPago,
        warnings
    };
};

