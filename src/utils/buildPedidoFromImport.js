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

import { calcularPuntos } from '../config/loyalty';
import { individualesData } from '../data/individualesData';
import { SHIPPING_ZONES } from '../data/shippingZones';

const sinTildes = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

/** Dominio de los correos inventados, para poder reconocerlos después. */
export const DOMINIO_SIN_CORREO = 'sin-correo.bikitchen.cr';

/**
 * Los pedidos que llegan por WhatsApp casi nunca traen correo, pero la regla de
 * creación de Firestore lo exige (`correo.size() > 4`). En vez de bloquear el
 * pedido o de obligar a inventar uno a mano, se arma a partir del teléfono.
 *
 * Se deriva del teléfono a propósito: el mismo cliente siempre genera el mismo
 * correo, así que sus pedidos quedan agrupados igual que si tuviera uno real.
 *
 * @returns {{ correo: string, esPlaceholder: boolean }}
 */
export const resolverCorreo = (correoCrudo, telefono, cliente = '', numeroOrden = '') => {
    const correo = String(correoCrudo || '').toLowerCase().trim();
    if (correo.length > 4) return { correo, esPlaceholder: false };

    const digitos = String(telefono || '').replace(/\D/g, '');
    if (digitos.length >= 7) return { correo: `${digitos}@${DOMINIO_SIN_CORREO}`, esPlaceholder: true };

    const nameSlug = sinTildes(String(cliente || 'cliente')).toLowerCase().replace(/[^a-z0-9]/g, '');
    const idSlug = String(numeroOrden || Date.now()).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(-6);
    const fallback = `${nameSlug || 'cliente'}.${idSlug || 'order'}@${DOMINIO_SIN_CORREO}`;

    return { correo: fallback, esPlaceholder: true };
};

/**
 * @param {object} parsed - salida de parseOrderBlock()
 * @param {object} [options] - { createdBy, orderNumber }
 * @returns {object} documento listo para addDoc(collection(db,'pedidos'), ...)
 */
/**
 * ¿El pedido es de platos individuales y no de un pack?
 *
 * Importa para la hoja de cocina: los packs se buscan en el Menú Semanal, los
 * individuales no. Si un plato suelto se guarda como pack, la hoja va a buscar
 * un menú que no existe y sale el aviso rojo de "Falta configurar el Menú Semanal".
 *
 * La regla es simple a propósito: si el nombre no dice "pack", es un plato suelto.
 * El usuario puede corregirlo en la vista previa.
 */
export const pareceIndividual = (items = []) => {
    const nombres = items.map(i => String(i?.nombre || ''));
    if (nombres.length === 0) return false;
    return !nombres.some(n => /\bpacks?\b/i.test(n));
};

/** Nombre bajo el que la hoja de cocina agrupa los platos sueltos. */
export const PLAN_INDIVIDUALES = 'Individuales';

export const buildPedidoFromImport = (parsed, options = {}) => {
    const { createdBy = 'admin', orderNumber, nivelCliente = null } = options;
    const esIndividual = options.esIndividual ?? pareceIndividual(parsed?.items);

    const fechas = Array.isArray(parsed?.fechasEntrega) ? parsed.fechasEntrega.filter(Boolean) : [];
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

    // La cocina no lee `fechas_entrega` directamente: pasa por getScheduleFromOrder(),
    // que deduce cuántas entregas tocan mirando el plan del ítem. Sin esta etiqueta,
    // un pedido con 4 fechas guardadas se vería en la hoja SOLO la primera semana.
    const planPorEntregas = fechas.length >= 4 ? 'monthly'
        : fechas.length === 2 ? 'biweekly'
            : null;

    let costoEnvio = num(parsed?.costoEnvio);
    const zonaEnvio = parsed?.zona || 'No especificada';

    // Si no viene costo de envío pero sí la zona, auto-completar desde SHIPPING_ZONES
    if (!costoEnvio && zonaEnvio && zonaEnvio !== 'No especificada') {
        const cleanZone = sinTildes(zonaEnvio.toLowerCase());
        const zoneMatch = SHIPPING_ZONES.find(z => {
            const zName = sinTildes(z.name.toLowerCase());
            const hasArea = z.areas.some(a => cleanZone.includes(sinTildes(a.toLowerCase())));
            return zName.includes(cleanZone) || hasArea;
        });
        if (zoneMatch) {
            costoEnvio = zoneMatch.cost;
        }
    }

    const items = rawItems.map((item) => {
        const cantidad = num(item?.cantidad, 1) || 1;
        let precio = num(item?.precio);

        // Si el precio del ítem viene en 0 o null, auto-completar desde el catálogo individualesData
        if (!precio && item?.nombre) {
            const cleanName = sinTildes(String(item.nombre).toLowerCase());
            const match = individualesData.find(prod => {
                const prodName = sinTildes(prod.nombre.toLowerCase());
                const cleanItemName = cleanName.replace(/\([^)]*\)/g, '').trim();
                return cleanName.includes(prodName) || prodName.includes(cleanItemName);
            });
            if (match) {
                if (cleanName.includes('kg') || cleanName.includes('kilo') || cleanName.includes('1 kg')) {
                    precio = match.precio1kg || match.precio500 || 0;
                } else if (cleanName.includes('500') || cleanName.includes('500g')) {
                    precio = match.precio500 || match.precio1kg || 0;
                } else {
                    precio = match.precio1kg || match.precio500 || 0;
                }
            }
        }

        const proteinas = Array.isArray(item?.proteinas) && item.proteinas.length > 0
            ? item.proteinas
            : null; // null y no undefined: Firestore rechaza undefined

        return {
            nombre: item?.nombre || '',
            cantidad,
            precio,
            total: num(item?.total) || (precio * cantidad),
            proteinas,
            proteina: '',
            carbo: '',
            ensalada: '',
            category: esIndividual ? 'individuales' : null,
            categoryLabel: esIndividual ? 'Individuales' : null,
            // Marca el plan para que la hoja de producción vea TODAS las entregas
            plan: planPorEntregas,
            planLabel: planPorEntregas === 'monthly' ? 'Mensual'
                : planPorEntregas === 'biweekly' ? 'Quincenal' : null,
            desc: ''
        };
    });

    const subtotalCalculado = items.reduce((acc, i) => acc + (i.total || 0), 0);
    const subtotal = num(parsed?.subtotal) || num(parsed?.total) || subtotalCalculado;
    const totalCalculado = subtotalCalculado > 0 ? (subtotalCalculado + costoEnvio - num(parsed?.descuento)) : 0;
    const total = num(parsed?.total) || totalCalculado || subtotal;
    const numeroOrdenFinal = orderNumber || parsed?.numeroOrden || generateImportOrderNumber();
    const { correo, esPlaceholder } = resolverCorreo(parsed?.correo, parsed?.telefono, parsed?.cliente, numeroOrdenFinal);

    return {
        numeroOrden: orderNumber || parsed?.numeroOrden || generateImportOrderNumber(),
        cliente: parsed?.cliente || '',
        telefono: parsed?.telefono || '',
        correo,
        // Deja rastro de que el correo se inventó a partir del teléfono
        correoEsPlaceholder: esPlaceholder,
        cedula: parsed?.cedula || '-',
        direccion: parsed?.direccion || '',
        referencias: parsed?.referencias || '',

        zona_envio: zonaEnvio,
        zona_id: null,
        costo_envio: costoEnvio,
        envio_por_confirmar: false,

        // La hoja de cocina agrupa por este campo. Los platos sueltos van todos bajo
        // "Individuales" para que NO se busque un Menú Semanal que no existe.
        plan: esIndividual ? PLAN_INDIVIDUALES : (items[0]?.nombre || 'Pedido WhatsApp'),
        esIndividual,
        fecha_entrega: fechas[0] || null,
        fechas_entrega: fechas,
        horario_preferido: '9:00 AM - 2:00 PM',
        observaciones: parsed?.observaciones || '',

        items,
        subtotal,
        descuento: num(parsed?.descuento),
        cupon: null,
        metodo_pago: parsed?.metodoPago || 'WhatsApp',
        total,

        // Se confirma después con updateOrderStatus() para no saltarse los puntos
        status: 'pending_payment',
        paymentConfirmed: false,
        pointsAwarded: false,
        // Si el cliente ya tiene cuenta, se usa su nivel; si no, tasa base
        pointsToAward: calcularPuntos(total, nivelCliente),
        // Dónde se acreditan. Un correo inventado no corresponde a ninguna cuenta,
        // así que en ese caso no hay a quién acreditarle.
        correoPuntos: esPlaceholder ? null : correo,

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
    // El correo se arma solo a partir del teléfono, así que basta con el teléfono
    if (!pedido?.telefono) problems.push('Falta el teléfono (de ahí sale el correo también).');
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
