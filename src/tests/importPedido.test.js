import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';

// Bloque con la forma exacta que produce generateStyledSummary() en emailNotifications.js
const PEDIDO_COMPLETO = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PEDIDO: #ORD-MLMPMVGE99
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha del Pedido: 7/8/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 INFORMACIÓN DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: Jairo Monge
Teléfono: 88670025
Email: jai.mv@hotmail.com
Cédula: 1-1234-5678

📦 ITEMS DEL PEDIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1× Pack de Proteínas - Pack 3 Proteínas (250g) (Semanal) - ₡13.500

2× Tortas maduro con queso - ₡3.000

💰 RESUMEN DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: ₡16.500
Descuento: Sin descuento
Envio: ₡3.000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ₡19.500

🚚 INFORMACIÓN DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zona: Moravia
Dirección: 150 mts norte del parque
Referencias: Portón verde
Fecha de Entrega: 2026-08-12

💳 MÉTODO DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SINPE MÓVIL

📝 OBSERVACIONES DEL CLIENTE
Sin cebolla por favor`;

describe('parseOrderBlock', () => {
    const parsed = parseOrderBlock(PEDIDO_COMPLETO);

    it('lee los datos del cliente', () => {
        expect(parsed.numeroOrden).toBe('#ORD-MLMPMVGE99');
        expect(parsed.cliente).toBe('Jairo Monge');
        expect(parsed.telefono).toBe('88670025');
        expect(parsed.correo).toBe('jai.mv@hotmail.com');
        expect(parsed.cedula).toBe('1-1234-5678');
    });

    it('lee los montos ignorando el separador de miles', () => {
        expect(parsed.total).toBe(19500);
        expect(parsed.subtotal).toBe(16500);
        expect(parsed.costoEnvio).toBe(3000);
        expect(parsed.descuento).toBe(0);
    });

    it('lee la entrega y las observaciones', () => {
        expect(parsed.zona).toBe('Moravia');
        expect(parsed.direccion).toBe('150 mts norte del parque');
        expect(parsed.fechasEntrega).toEqual(['2026-08-12']);
        expect(parsed.observaciones).toBe('Sin cebolla por favor');
        expect(parsed.metodoPago).toBe('SINPE MÓVIL');
    });

    it('lee los ítems conservando el nombre completo (los gramos salen de ahí)', () => {
        expect(parsed.items).toHaveLength(2);

        expect(parsed.items[0].cantidad).toBe(1);
        expect(parsed.items[0].precio).toBe(13500);
        // El "(250g)" tiene que sobrevivir: logisticsUtils saca de ahí la porción
        expect(parsed.items[0].nombre).toContain('(250g)');
        expect(parsed.items[0].proteinas).toEqual([]);

        expect(parsed.items[1].cantidad).toBe(2);
        expect(parsed.items[1].precio).toBe(3000);
    });

    it('asocia las proteínas al ítem correcto', () => {
        const conProteinas = parseOrderBlock(`
1× Pack de Proteínas - Pack 3 Proteínas (250g) - ₡13.500
└ Proteínas: Carne mechada en salsa, Pollo al pesto, Pollo mediterraneo
2× Otro pack - ₡5.000
`);
        expect(conProteinas.items[0].proteinas).toEqual([
            'Carne mechada en salsa', 'Pollo al pesto', 'Pollo mediterraneo'
        ]);
        expect(conProteinas.items[1].proteinas).toEqual([]);
    });

    it('lee varias fechas de entrega en packs multi-semana', () => {
        const multi = parseOrderBlock(`
Fechas de Entrega:
 • Entrega 1: 2026-08-12
 • Entrega 2: 2026-08-19
 • Entrega 3: 2026-08-26
 • Entrega 4: 2026-09-02
`);
        expect(multi.fechasEntrega).toEqual([
            '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02'
        ]);
    });

    it('avisa de lo que falta en vez de inventarlo', () => {
        const incompleto = parseOrderBlock('Nombre: Ana\nTOTAL: ₡5.000');
        expect(incompleto.cliente).toBe('Ana');
        expect(incompleto.warnings.join(' ')).toMatch(/tel[ée]fono/i);
        expect(incompleto.warnings.join(' ')).toMatch(/fecha de entrega/i);
        // El correo NO se reclama: se arma a partir del teléfono
        expect(incompleto.warnings.join(' ')).not.toMatch(/correo/i);
    });

    it('no revienta con basura', () => {
        expect(() => parseOrderBlock('')).not.toThrow();
        expect(() => parseOrderBlock(null)).not.toThrow();
        expect(parseOrderBlock(null).warnings.length).toBeGreaterThan(0);
    });
});

// Formato EXACTO del mensaje que arma CheckoutSteps.jsx y se manda por WhatsApp.
// Es distinto al del correo: viñetas, negritas con asteriscos, emojis como
// etiqueta, precio en su propia línea, y sin teléfono ni correo.
const WHATSAPP_REAL = `🛒 *NUEVO PEDIDO #ORD-WSAP12345*

━━━━━━━━━━━━━━━━━━━━
📦 *ITEMS DEL PEDIDO*

• 1× Pack Bajo Calorías (Two Pack · Semanal)
   └ Proteínas: Pollo al pesto, Res en salsa
   └ ₡122.390

• 2× Tortas maduro con queso
   └ ₡6.000

━━━━━━━━━━━━━━━━━━━━
💰 *RESUMEN*
Total: ₡128.390

👤 *CLIENTE*: Priscilla Montoya
🚚 *ENTREGA*: 2026-08-12
💳 *PAGO*: SINPE
📝 *NOTAS*: Sin cebolla`;

describe('parseOrderBlock con el formato de WhatsApp', () => {
    const parsed = parseOrderBlock(WHATSAPP_REAL);

    it('lee el cliente aunque venga con emoji y negritas', () => {
        expect(parsed.cliente).toBe('Priscilla Montoya');
        expect(parsed.numeroOrden).toBe('#ORD-WSAP12345');
    });

    it('lee la fecha de la etiqueta ENTREGA', () => {
        expect(parsed.fechasEntrega).toEqual(['2026-08-12']);
    });

    it('lee el total, el pago y las notas', () => {
        expect(parsed.total).toBe(128390);
        expect(parsed.metodoPago).toBe('SINPE');
        expect(parsed.observaciones).toBe('Sin cebolla');
    });

    it('lee los ítems con viñeta y el precio de la línea de abajo', () => {
        expect(parsed.items).toHaveLength(2);

        expect(parsed.items[0].cantidad).toBe(1);
        expect(parsed.items[0].nombre).toContain('Pack Bajo Calorías');
        expect(parsed.items[0].precio).toBe(122390);
        expect(parsed.items[0].proteinas).toEqual(['Pollo al pesto', 'Res en salsa']);

        expect(parsed.items[1].cantidad).toBe(2);
        expect(parsed.items[1].precio).toBe(6000);
    });

    it('pide el teléfono, que WhatsApp tampoco manda', () => {
        expect(parsed.telefono).toBeNull();
        expect(parsed.correo).toBeNull();
        expect(parsed.warnings.join(' ')).toMatch(/tel[ée]fono/i);
        // El correo no se reclama: se arma con el teléfono
        expect(parsed.warnings.join(' ')).not.toMatch(/correo/i);
    });
});

describe('buildPedidoFromImport', () => {
    const pedido = buildPedidoFromImport(parseOrderBlock(PEDIDO_COMPLETO), { createdBy: 'jan' });

    it('arma el documento con la forma que lee la cocina', () => {
        expect(pedido.numeroOrden).toBe('#ORD-MLMPMVGE99');
        expect(pedido.fecha_entrega).toBe('2026-08-12');
        expect(pedido.fechas_entrega).toEqual(['2026-08-12']);
        expect(pedido.zona_envio).toBe('Moravia');
        expect(pedido.items).toHaveLength(2);
        expect(pedido.items[0].total).toBe(13500);
        expect(pedido.items[1].total).toBe(6000); // 2 × 3000
    });

    it('nace pendiente de pago para que los puntos pasen por updateOrderStatus', () => {
        expect(pedido.status).toBe('pending_payment');
        expect(pedido.pointsAwarded).toBe(false);
        expect(pedido.pointsToAward).toBe(390); // 2% de 19500
    });

    it('queda marcado como importado, para poder rastrearlo', () => {
        expect(pedido.source).toBe('whatsapp-import');
        expect(pedido.createdBy).toBe('jan');
    });

    it('nunca deja campos undefined (Firestore los rechaza)', () => {
        const conVacios = buildPedidoFromImport({ total: 1000, items: [{ nombre: 'X' }] });
        const undefineds = Object.entries(conVacios).filter(([, v]) => v === undefined);
        expect(undefineds).toEqual([]);
        expect(conVacios.items[0].proteinas).toBeNull();
    });

    it('genera número de pedido cuando el chat no trae uno', () => {
        const sinId = buildPedidoFromImport({ total: 1000, items: [{ nombre: 'X' }] });
        expect(sinId.numeroOrden).toMatch(/^#ORD-[A-Z0-9]+$/);
    });
});

describe('BiPuntos en un pedido metido a mano', () => {
    const base = parseOrderBlock(PEDIDO_COMPLETO);

    it('sin cuenta conocida usa la tasa base', () => {
        const pedido = buildPedidoFromImport(base);
        expect(pedido.pointsToAward).toBe(390); // 2% de 19.500
    });

    it('si el cliente ya tiene nivel, se le da lo que le corresponde', () => {
        const oro = { name: 'Oro', minPoints: 5000, multiplier: 1.5 };
        const pedido = buildPedidoFromImport(base, { nivelCliente: oro });
        expect(pedido.pointsToAward).toBe(585); // 390 x 1.5
    });

    it('los puntos se acreditan al correo real del cliente', () => {
        const pedido = buildPedidoFromImport(base);
        expect(pedido.correoPuntos).toBe('jai.mv@hotmail.com');
    });

    it('con correo inventado NO se acredita a ninguna cuenta', () => {
        // El correo armado con el teléfono no corresponde a ningún usuario:
        // acreditarle puntos sería dejarlos en una cuenta fantasma.
        const sinCorreo = buildPedidoFromImport({
            ...base, correo: null, telefono: '8888-1111'
        });
        expect(sinCorreo.correoEsPlaceholder).toBe(true);
        expect(sinCorreo.correoPuntos).toBeNull();
    });
});

describe('validatePedidoForFirestore', () => {
    it('aprueba un pedido bien formado', () => {
        const ok = buildPedidoFromImport(parseOrderBlock(PEDIDO_COMPLETO));
        expect(validatePedidoForFirestore(ok)).toEqual([]);
    });

    it('rechaza lo mismo que rechazarían las reglas de Firestore', () => {
        expect(validatePedidoForFirestore({
            cliente: 'Ana', telefono: '88888888', correo: 'a@b.com',
            total: 0, items: [{ nombre: 'X' }]
        })).toContain('El total tiene que ser un número mayor a cero.');

        expect(validatePedidoForFirestore({
            cliente: 'Ana', telefono: '88888888', correo: 'a@b.com',
            total: 100, items: []
        })).toContain('El pedido no tiene ítems.');

        expect(validatePedidoForFirestore({
            cliente: 'Ana', telefono: '88888888', correo: 'a@b',
            total: 100, items: [{ nombre: 'X' }]
        })).toContain('El correo falta o es demasiado corto.');
    });
});
