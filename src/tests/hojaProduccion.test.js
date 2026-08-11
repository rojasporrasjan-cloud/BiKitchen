import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';
import { getScheduleFromOrder } from '../utils/orderDates';

/**
 * Prueba de punta a punta del camino que importa de verdad:
 *
 *   texto de la factura → parseo → documento de Firestore → hoja de cocina
 *
 * Si esta prueba pasa, un pedido metido a mano sale bien en la hoja que usan
 * cocina y empaque. Es la unica que valida la cadena completa.
 */

const FACTURA = `📦 PEDIDO: #ORD-TESTHOJA1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 INFORMACIÓN DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: Marta Solano
Teléfono: 87654321
Email: marta.solano@gmail.com

📦 ITEMS DEL PEDIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1× Pack de Proteínas - Pack 3 Proteínas (250g) (Semanal) - ₡13.500
└ Proteínas: Carne mechada en salsa, Pollo al pesto, Pollo mediterraneo

💰 RESUMEN DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ₡16.500

🚚 INFORMACIÓN DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zona: Moravia
Dirección: 150 mts norte del parque
Fecha de Entrega: 2026-08-12

💳 MÉTODO DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SINPE MÓVIL

📝 OBSERVACIONES DEL CLIENTE
Sin cebolla`;

describe('De la factura a la hoja de cocina', () => {
    const pedido = buildPedidoFromImport(parseOrderBlock(FACTURA));
    // Así llega el documento desde Firestore (con su id)
    const [hoja] = mapPedidosFromLegacy([{ id: 'doc-1', ...pedido }]);

    it('el pedido cae en la fecha de entrega correcta', () => {
        // La hoja filtra por esto: schedule.includes(fechaSeleccionada)
        expect(getScheduleFromOrder(pedido)).toContain('2026-08-12');
        expect(pedido.fecha_entrega).toBe('2026-08-12');
    });

    it('la hoja muestra los datos del cliente', () => {
        expect(hoja.cliente).toBe('Marta Solano');
        expect(hoja.telefono).toBe('87654321');
        expect(hoja.direccion).toBe('150 mts norte del parque');
        expect(hoja.observaciones).toBe('Sin cebolla');
    });

    it('genera un plato por cada proteína pedida', () => {
        expect(hoja.platos).toHaveLength(3);
        expect(hoja.platos.map(p => p.proteina.nombre)).toEqual([
            'Carne mechada en salsa',
            'Pollo al pesto',
            'Pollo mediterraneo'
        ]);
    });

    it('saca los gramos por porción del nombre del pack', () => {
        // "(250g)" viene dentro del nombre; si se perdiera, la cocina no sabría
        // cuánto pesar y saldría 0.
        hoja.platos.forEach(plato => {
            expect(plato.proteina.gramosPorPorcion).toBe(250);
        });
    });

    it('los platos van numerados para la hoja de empaque', () => {
        expect(hoja.platos.map(p => p.numero)).toEqual([1, 2, 3]);
    });

    it('el tipo de menú no queda en "Desconocido"', () => {
        expect(hoja.tipoMenu).not.toBe('Desconocido');
        expect(hoja.tipoMenu).toContain('Pack 3 Proteínas');
    });
});

describe('Pedido importado de varias semanas', () => {
    const FACTURA_MENSUAL = `📦 PEDIDO: #ORD-MENSUAL01
Nombre: Carlos Vega
Teléfono: 89991111
Email: carlos.vega@gmail.com

1× Pack 5 Comidas Mensual - ₡100.000
└ Proteínas: Pollo, Res, Cerdo

TOTAL: ₡100.000
Zona: Escazú
Fechas de Entrega:
 • Entrega 1: 2026-08-05
 • Entrega 2: 2026-08-12
 • Entrega 3: 2026-08-19
 • Entrega 4: 2026-08-26`;

    const pedido = buildPedidoFromImport(parseOrderBlock(FACTURA_MENSUAL));

    it('guarda las 4 fechas', () => {
        expect(pedido.fechas_entrega).toHaveLength(4);
        expect(pedido.fecha_entrega).toBe('2026-08-05');
    });

    it('la hoja lo ve en LAS CUATRO semanas, no solo en la primera', () => {
        // Sin la etiqueta de plan en el item, getScheduleFromOrder devolvería
        // solo 2026-08-05 y las semanas 2, 3 y 4 no se cocinarían.
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toEqual(['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26']);
    });

    it('un pedido de una sola entrega no se marca como mensual', () => {
        const simple = buildPedidoFromImport(parseOrderBlock(FACTURA));
        expect(simple.items[0].plan).toBeNull();
        expect(getScheduleFromOrder(simple)).toEqual(['2026-08-12']);
    });
});

describe('Packs de varias semanas en la hoja', () => {
    it('un pack mensual cae en sus 4 fechas, no solo en la primera', () => {
        const pedido = {
            cliente: 'Ana Ramírez',
            plan: 'monthly',
            fecha_entrega: '2026-08-05',
            fechas_entrega: ['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26'],
            items: [{ nombre: 'Pack 5 Comidas', plan: 'monthly', cantidad: 1, proteinas: ['Pollo'] }]
        };
        const schedule = getScheduleFromOrder(pedido);

        ['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26'].forEach(fecha => {
            expect(schedule).toContain(fecha);
        });
    });

    it('DEJA CONSTANCIA: sin etiqueta de plan, la hoja solo ve la primera semana', () => {
        // Mismo pedido pero sin nada que identifique el plan como mensual.
        // getScheduleFromOrder devuelve UNA sola fecha aunque haya cuatro guardadas,
        // y la cocina se pierde tres entregas. Por eso MonthlyPacksView lo marca
        // en rojo. Si algún día esto cambia, este test avisa.
        const sinEtiqueta = {
            cliente: 'Ana Ramírez',
            fecha_entrega: '2026-08-05',
            fechas_entrega: ['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26'],
            items: [{ nombre: 'Pack 5 Comidas', cantidad: 1 }]
        };
        const schedule = getScheduleFromOrder(sinEtiqueta);

        expect(schedule).toEqual(['2026-08-05']);
        expect(schedule).not.toContain('2026-08-12');
    });
});
