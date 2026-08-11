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
const grab = (text, labels) => {
    for (const label of labels) {
        const re = new RegExp(`^[^\\p{L}\\n]*\\*?\\s*${label}\\s*\\*?\\s*:\\s*(.+)$`, 'imu');
        const match = text.match(re);
        if (match) {
            const value = match[1].replace(/\*/g, '').trim();
            if (value && !ES_RELLENO.test(value)) return value;
        }
    }
    return null;
};

const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}/;

/** Fecha única ("Fecha de Entrega: 2026-08-12") o lista (" • Entrega 1: ...") */
const grabDeliveryDates = (text) => {
    const multi = [...text.matchAll(/•\s*Entrega\s*\d+\s*:\s*(.+)/gi)]
        .map(m => (m[1].match(ISO_DATE_RE) || [])[0])
        .filter(Boolean);
    if (multi.length > 0) return multi;

    // 'ENTREGA' cubre el formato de WhatsApp: "🚚 *ENTREGA*: 2026-08-12"
    const single = grab(text, ['Fecha de Entrega', 'Fecha Entrega', 'ENTREGA']);
    const iso = single && (single.match(ISO_DATE_RE) || [])[0];
    return iso ? [iso] : [];
};

/**
 * Extrae los ítems. formatItemsForEmail() los escribe así:
 *   1× Pack de Proteínas - Pack 3 Proteínas (250g) (Semanal) - ₡13.500
 *   └ Proteínas: Carne mechada, Pollo al pesto
 *
 * El nombre se conserva ENTERO (con el "(250g)") porque logisticsUtils saca los
 * gramos por porción justamente de ahí.
 */
const grabItems = (text) => {
    const items = [];
    const lines = text.split('\n');

    for (const line of lines) {
        // La viñeta "• " solo aparece en el formato de WhatsApp
        const itemMatch = line.match(/^[\s•·*-]*(\d+)\s*[×x]\s*(.+)$/i);
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
                precio: precio,
                proteinas: []
            });
            continue;
        }

        if (items.length === 0) continue;
        const ultimo = items[items.length - 1];

        // Líneas de detalle "└ ...", pertenecen al último ítem leído
        const protMatch = line.match(/└\s*Prote[íi]nas?\s*:\s*(.+)/i);
        if (protMatch) {
            ultimo.proteinas = protMatch[1]
                .split(',')
                .map(p => p.replace(/\*/g, '').trim())
                .filter(Boolean);
            continue;
        }

        // Formato WhatsApp: el precio del ítem va en su propia línea "   └ ₡13.500"
        const precioSuelto = line.match(/└\s*₡\s*([\d.,\s]+)$/);
        if (precioSuelto && ultimo.precio === null) {
            ultimo.precio = parseAmount(precioSuelto[1]);
        }
    }

    return items;
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
export const parseOrderBlock = (text) => {
    const warnings = [];
    if (!text || typeof text !== 'string') {
        return { warnings: ['El texto está vacío.'], items: [], fechasEntrega: [] };
    }

    // Las etiquetas cubren los dos formatos: el del correo y el de WhatsApp
    const numeroOrden = extractOrderNumbers(text)[0] || null;
    const cliente = grab(text, ['Nombre', 'CLIENTE', 'Cliente']);
    const telefono = grab(text, ['Tel[ée]fono', 'Tel']);
    const correo = grab(text, ['Email', 'Correo', 'E-mail']);
    const cedula = grab(text, ['C[ée]dula']);
    const zona = grab(text, ['Zona']);
    const direccion = grab(text, ['Direcci[óo]n']);
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
    const envioRaw = grab(text, ['Env[íi]o']);
    const costoEnvio = /confirmar/i.test(envioRaw || '') ? 0 : (parseAmount(envioRaw) ?? 0);
    const descuento = parseAmount(grab(text, ['Descuento'])) ?? 0;

    const fechasEntrega = grabDeliveryDates(text);
    const items = grabItems(text);

    // WhatsApp lo trae como "💳 *PAGO*: SINPE"; el correo lo pone en la línea
    // siguiente al encabezado "MÉTODO DE PAGO".
    let metodoPago = grab(text, ['PAGO', 'M[ée]todo de pago']);
    if (!metodoPago) {
        const payMatch = text.match(/M[ÉE]TODO DE PAGO[^\n]*\n[━\-=\s]*\n?\s*([^\n]+)/i);
        if (payMatch) metodoPago = payMatch[1].replace(/\*/g, '').trim();
    }

    // Lo que la cocina y las reglas de Firestore necesitan sí o sí
    if (!cliente) warnings.push('Falta el nombre del cliente.');
    if (!telefono) warnings.push('Falta el teléfono.');
    if (!correo) warnings.push('Falta el correo — Firestore lo exige para crear el pedido.');
    if (!total || total <= 0) warnings.push('Falta el TOTAL o quedó en cero.');
    if (items.length === 0) warnings.push('No pude leer ningún ítem del pedido.');
    if (fechasEntrega.length === 0) warnings.push('Falta la fecha de entrega en formato AAAA-MM-DD — sin ella el pedido no sale en la hoja de producción.');

    return {
        numeroOrden, cliente, telefono, correo, cedula,
        zona, direccion, referencias, observaciones,
        items, subtotal, descuento, costoEnvio, total,
        fechasEntrega, metodoPago,
        warnings
    };
};

