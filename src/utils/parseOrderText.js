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
const grab = (text, labels, { sinDosPuntos = false } = {}) => {
    for (const label of labels) {
        // Por defecto se exigen los dos puntos. Sin ellos, un encabezado de varias
        // palabras como "OBSERVACIONES DEL CLIENTE" devolvería "DEL CLIENTE".
        // `sinDosPuntos` se usa solo donde se escribe a mano sin ellos ("Envíos 3000").
        const separador = sinDosPuntos ? '[:\\s]' : ':';
        const re = new RegExp(`^[^\\p{L}\\n]*\\*?\\s*${label}\\s*\\*?\\s*${separador}\\s*(.+)$`, 'imu');
        const match = text.match(re);
        if (match) {
            const value = match[1].replace(/\*/g, '').trim();
            if (value && !ES_RELLENO.test(value)) return value;
        }
    }
    return null;
};

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
export const parseFechaEspanol = (texto, hoy = new Date()) => {
    if (!texto || typeof texto !== 'string') return null;

    const iso = texto.match(ISO_DATE_RE);
    if (iso) return iso[0];

    // 12/08/2026 o 12-08-2026
    const numerica = texto.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    if (numerica) {
        const [, d, m, yRaw] = numerica;
        const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
        return aISO(y, Number(m) - 1, Number(d));
    }

    // "12 de agosto", "15 agosto" (el "de" es opcional: a mano se omite seguido),
    // con o sin año y con o sin día de la semana adelante.
    // Si la palabra que sigue al número no es un mes, se descarta más abajo, así
    // que "1 pack bajo calorías" no se confunde con una fecha.
    const conMes = sinTildes(texto).match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?/);
    if (conMes) {
        const dia = Number(conMes[1]);
        const mes = MESES[conMes[2]];
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
    // Va ANTES del grab de etiqueta: ese permite cruzar el salto de línea y se
    // quedaría solo con la primera fecha, perdiendo las semanas de un mensual.
    const lineas = text.split('\n');
    const idx = lineas.findIndex(l => /^\s*Entregas?\s*:?\s*$/i.test(l));
    if (idx !== -1) {
        const fechas = [];
        for (let i = idx + 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;
            const fecha = parseFechaEspanol(linea, hoy);
            if (!fecha) break;
            fechas.push(fecha);
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
const ES_LINEA_PRECIO = /^\s*Precio\s*:?\s*₡?\s*[\d.,\s]+\s*$/i;
const ES_SEPARADOR = /^[\s━─=*_·.-]*$/;
const ES_MONTO_SUELTO = /^[\s₡$]*[\d.,\s]+$/;
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
const esCorteDeItem = (linea) => {
    const t = (linea || '').trim();
    if (!t) return false;
    return ES_SEPARADOR.test(t)
        || ETIQUETA_CONOCIDA.test(t)
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
const grabItems = (text) => {
    const items = [];
    const consumidas = new Set();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // --- Ítem que arranca con número ---
        let itemMatch = line.match(/^[\s•·*□▢▪◦-]*(\d+)\s*[×x]\s*(.+)$/i);
        if (!itemMatch) {
            const suelto = line.match(/^[\s•·*□▢▪◦-]*(\d+)\s+(\p{L}.*)$/u);
            if (suelto && !PARECE_FECHA.test(line)) itemMatch = suelto;
        }

        if (itemMatch) {
            let rest = itemMatch[2].trim();
            let precio = null;

            // Formato correo: el precio va al final de la misma línea. Es el ÚLTIMO
            // " - ₡..." porque el nombre del pack también trae guiones.
            const priceMatch = rest.match(/^(.*)\s-\s*₡\s*([\d.,\s]+)$/);
            if (priceMatch) {
                rest = priceMatch[1].trim();
                precio = parseAmount(priceMatch[2]);
            }

            items.push({
                cantidad: parseInt(itemMatch[1], 10) || 1,
                nombre: rest.replace(/\*/g, '').trim(),
                precio,
                proteinas: []
            });
            consumidas.add(i);
            continue;
        }

        // --- Ítem SIN número, confirmado por un "Precio ..." debajo ---
        const texto = line.trim();
        if (texto && !esCorteDeItem(texto)) {
            const extras = [];
            let j = i + 1;
            let idxPrecio = -1;

            while (j < lines.length && extras.length < 2) {
                const t = lines[j].trim();
                if (!t) { j++; continue; }
                if (ES_LINEA_PRECIO.test(t)) { idxPrecio = j; break; }
                if (esCorteDeItem(t)) break;
                extras.push({ idx: j, texto: t });
                j++;
            }

            if (idxPrecio !== -1) {
                items.push({
                    cantidad: 1,
                    nombre: [texto, ...extras.map(e => e.texto)].join(' - ').replace(/\*/g, '').trim(),
                    precio: null,
                    proteinas: []
                });
                consumidas.add(i);
                extras.forEach(e => consumidas.add(e.idx));

                // Saltar hasta la línea del precio. Sin esto, cada línea de la
                // descripción se volvería a evaluar y entraría como ítem repetido.
                i = idxPrecio - 1;
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
        const precioSuelto = line.match(/└\s*₡\s*([\d.,\s]+)$/)
            || line.match(/^\s*Precio\s*:?\s*₡?\s*([\d.,\s]+)\s*$/i);
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
    const telefono = grab(text, ['Tel[ée]fono', 'Tel']);
    const correo = grab(text, ['Email', 'Correo', 'E-mail']);
    const cedula = grab(text, ['C[ée]dula']);
    // "Lugar" es como lo escribe la administración a mano
    const zona = grab(text, ['Zona', 'Lugar']);
    const direccion = grab(text, ['Direcci[óo]n', 'Se[ñn]as']);
    const referencias = grab(text, ['Referencias']);

    // Las observaciones no llevan dos puntos: van en la línea siguiente al
    // encabezado "📝 OBSERVACIONES DEL CLIENTE" (ver generateStyledSummary).
    let observaciones = grab(text, ['Observaciones', 'NOTAS', 'Notas']);
    if (!observaciones) {
        const obsMatch = text.match(/OBSERVACIONES[^\n]*\n\s*([^\n]+)/i);
        const value = obsMatch && obsMatch[1].trim();
        if (value && !/^(ninguna|sin observaciones|n\/a)$/i.test(value)) observaciones = value;
    }

    const total = parseAmount(grab(text, ['TOTAL', 'Total']));
    const subtotal = parseAmount(grab(text, ['Subtotal']));
    // "Envíos 3000" — en plural y sin dos puntos, como se escribe a mano
    const envioRaw = grab(text, ['Env[íi]os?', 'Flete'], { sinDosPuntos: true });
    const costoEnvio = /confirmar/i.test(envioRaw || '') ? 0 : (parseAmount(envioRaw) ?? 0);
    const descuento = parseAmount(grab(text, ['Descuento'])) ?? 0;

    const fechasEntrega = grabDeliveryDates(text, hoy);
    const { items, consumidas } = grabItems(text);

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
                linea !== (metodoPago || '').trim()
            ))
            .map(({ linea }) => linea);

        if (sueltas.length > 0) observaciones = sueltas.join(' · ');
    }

    // Lo que la cocina y las reglas de Firestore necesitan sí o sí
    if (!cliente) warnings.push('Falta el nombre del cliente.');
    if (!telefono) warnings.push('Falta el teléfono.');
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

    return {
        numeroOrden, cliente, telefono, correo, cedula,
        zona, direccion, referencias, observaciones,
        items, subtotal, descuento, costoEnvio, total,
        fechasEntrega, metodoPago,
        warnings
    };
};

