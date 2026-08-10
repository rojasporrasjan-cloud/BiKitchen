/**
 * Arma el documento de Firestore para un pedido importado del chat.
 *
 * REGLA DE ORO: para la cocina, un pedido importado tiene que verse idéntico a uno
 * hecho en la web. Por eso este objeto replica el que escribe CheckoutSteps.jsx en
 * la colección `pedidos` (NO `orders`, que es una colección vieja que ya nadie escribe).
 *
 * Lo que la cocina lee de acá:
 *  - `fecha_entrega` en AAAA-MM-DD → la consulta de PrintProductionView filtra por eso
 *  - `fechas_entrega` → getScheduleFromOrder() arma el calendario multi-entrega
 *  - `status` → solo salen los confirmados
 *  - `items[].nombre` → de ahí se sacan los gramos por porción (ej: "(250g)")
 *  - `items[].proteinas` → genera un plato por proteína
 *
 * El pedido se crea en `pending_payment` A PROPÓSITO: confirmarlo pasa después por
 * updateOrderStatus(), que es lo único que otorga BiPuntos y bono de referido.
 * Si lo creáramos ya confirmado, el cliente perdería sus puntos en silencio.
 */

/** Mismo formato que generateOrderNumber() en CheckoutSteps.jsx (ahí es privada). */
export const generateImportOrderNumber = () => {
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `#ORD-${ts}${rand}`;
};

const num = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * @param {object} parsed - salida de parseOrderBlock()
 * @param {object} [options] - { createdBy, orderNumber }
 * @returns {object} documento listo para addDoc(collection(db,'pedidos'), ...)
 */
export const buildPedidoFromImport = (parsed, options = {}) => {
    const { createdBy = 'admin', orderNumber } = options;

    const total = num(parsed?.total);
    const fechas = Array.isArray(parsed?.fechasEntrega) ? parsed.fechasEntrega.filter(Boolean) : [];
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

    const items = rawItems.map((item) => {
        const cantidad = num(item?.cantidad, 1) || 1;
        const precio = num(item?.precio);
        const proteinas = Array.isArray(item?.proteinas) && item.proteinas.length > 0
            ? item.proteinas
            : null; // null y no undefined: Firestore rechaza undefined

        return {
            nombre: item?.nombre || '',
            cantidad,
            precio,
            total: precio * cantidad,
            proteinas,
            proteina: '',
            carbo: '',
            ensalada: '',
            category: null,
            categoryLabel: null,
            planLabel: null,
            desc: ''
        };
    });

    return {
        numeroOrden: orderNumber || parsed?.numeroOrden || generateImportOrderNumber(),
        cliente: parsed?.cliente || '',
        telefono: parsed?.telefono || '',
        correo: (parsed?.correo || '').toLowerCase().trim(),
        cedula: parsed?.cedula || '-',
        direccion: parsed?.direccion || '',
        referencias: parsed?.referencias || '',

        zona_envio: parsed?.zona || 'No especificada',
        zona_id: null,
        costo_envio: num(parsed?.costoEnvio),
        envio_por_confirmar: false,

        plan: items[0]?.nombre || 'Pedido WhatsApp',
        fecha_entrega: fechas[0] || null,
        fechas_entrega: fechas,
        horario_preferido: '9:00 AM - 2:00 PM',
        observaciones: parsed?.observaciones || '',

        items,
        subtotal: num(parsed?.subtotal) || total,
        descuento: num(parsed?.descuento),
        cupon: null,
        metodo_pago: parsed?.metodoPago || 'WhatsApp',
        total,

        // Se confirma después con updateOrderStatus() para no saltarse los puntos
        status: 'pending_payment',
        paymentConfirmed: false,
        pointsAwarded: false,
        pointsToAward: Math.floor(total * 0.02),

        fuente: 'Importado de WhatsApp',
        source: 'whatsapp-import',
        createdBy,
        createdAt: new Date().toISOString()
    };
};

/**
 * Verifica que el documento cumpla las reglas de creación de Firestore
 * (`match /pedidos/` en firestore.rules). Si falla, Firebase lo rechaza con
 * "permission-denied" sin explicar por qué — así el usuario ve el motivo real.
 *
 * @returns {string[]} lista de problemas; vacía significa que pasa
 */
export const validatePedidoForFirestore = (pedido) => {
    const problems = [];
    if (!pedido?.cliente) problems.push('Falta el nombre del cliente.');
    if (!pedido?.telefono) problems.push('Falta el teléfono.');
    if (typeof pedido?.correo !== 'string' || pedido.correo.length <= 4) {
        problems.push('El correo falta o es demasiado corto.');
    }
    if (typeof pedido?.total !== 'number' || pedido.total <= 0) {
        problems.push('El total tiene que ser un número mayor a cero.');
    }
    if (!Array.isArray(pedido?.items) || pedido.items.length === 0) {
        problems.push('El pedido no tiene ítems.');
    }
    return problems;
};
