import { describe, it, expect } from 'vitest';
import { getScheduleFromOrder, parseDateStr } from '../utils/orderDates';

/**
 * Las acciones por día del panel de Pedidos: mandar a la ruta y cerrar el día.
 *
 * La regla delicada es que un pack mensual tiene 4 fechas de entrega, así que
 * tiene que contar en las CUATRO. Si se mirara solo `fecha_entrega`, la semana 2
 * de un cliente nunca se podría despachar ni cerrar desde estos botones.
 *
 * Réplica de agruparPorFecha() de OrdersView. Vive acá porque el componente pasa
 * las 3500 líneas y no se puede importar en pruebas sin arrastrar Firebase.
 */
const MAX_FECHAS_SUGERIDAS = 8;

const agruparPorFecha = (pedidos, estado, diasAtras, hoyBase) => {
    const hoy = new Date(hoyBase); hoy.setHours(0, 0, 0, 0);
    const desde = new Date(hoy); desde.setDate(desde.getDate() - diasAtras);
    const conteo = new Map();

    pedidos.forEach(o => {
        if (o.status !== estado) return;
        getScheduleFromOrder(o).forEach(fecha => {
            const d = parseDateStr(fecha);
            if (!d || d < desde) return;
            conteo.set(fecha, (conteo.get(fecha) || 0) + 1);
        });
    });

    return [...conteo.entries()]
        .map(([fecha, cantidad]) => ({ fecha, cantidad }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, MAX_FECHAS_SUGERIDAS);
};

const HOY = new Date('2026-08-17T12:00:00');

const pedido = (over = {}) => ({
    id: 'x',
    status: 'confirmed',
    fecha_entrega: '2026-08-17',
    fechas_entrega: ['2026-08-17'],
    items: [{ nombre: 'Pack Keto', plan: null }],
    ...over
});

describe('Cerrar el día: solo toca los que van en ruta', () => {
    const pedidos = [
        pedido({ id: 'a', status: 'in_transit' }),
        pedido({ id: 'b', status: 'in_transit' }),
        pedido({ id: 'c', status: 'confirmed' }),   // todavía no sale
        pedido({ id: 'd', status: 'delivered' }),   // ya cerrado
        pedido({ id: 'e', status: 'cancelled' })
    ];

    it('cuenta solo los in_transit', () => {
        const fechas = agruparPorFecha(pedidos, 'in_transit', 10, HOY);
        expect(fechas).toEqual([{ fecha: '2026-08-17', cantidad: 2 }]);
    });

    it('mandar a la ruta cuenta solo los confirmados', () => {
        const fechas = agruparPorFecha(pedidos, 'confirmed', 3, HOY);
        expect(fechas).toEqual([{ fecha: '2026-08-17', cantidad: 1 }]);
    });

    it('un día sin pedidos en ruta no ofrece botón', () => {
        const soloConfirmados = [pedido({ status: 'confirmed' })];
        expect(agruparPorFecha(soloConfirmados, 'in_transit', 10, HOY)).toEqual([]);
    });
});

describe('Un pack mensual cuenta en sus 4 semanas', () => {
    const mensual = pedido({
        status: 'in_transit',
        fecha_entrega: '2026-08-17',
        fechas_entrega: ['2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07'],
        items: [{ nombre: 'Pack Keto Mensual', plan: 'monthly' }]
    });

    it('aparece en las cuatro fechas, no solo en la primera', () => {
        const fechas = agruparPorFecha([mensual], 'in_transit', 10, HOY);
        expect(fechas.map(f => f.fecha)).toEqual([
            '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07'
        ]);
    });

    it('se suma a los semanales de esa misma fecha', () => {
        const semanal = pedido({ id: 's', status: 'in_transit' });
        const fechas = agruparPorFecha([mensual, semanal], 'in_transit', 10, HOY);
        expect(fechas[0]).toEqual({ fecha: '2026-08-17', cantidad: 2 });
    });
});

describe('Qué fechas se ofrecen', () => {
    it('cerrar el día alcanza 10 días atrás: se cierra después, no en el momento', () => {
        const haceUnaSemana = pedido({
            status: 'in_transit',
            fecha_entrega: '2026-08-10',
            fechas_entrega: ['2026-08-10']
        });
        expect(agruparPorFecha([haceUnaSemana], 'in_transit', 10, HOY)).toHaveLength(1);
    });

    it('mandar a la ruta solo mira 3 días atrás', () => {
        const viejo = pedido({ fecha_entrega: '2026-08-10', fechas_entrega: ['2026-08-10'] });
        expect(agruparPorFecha([viejo], 'confirmed', 3, HOY)).toEqual([]);
    });

    it('lo muy viejo no se ofrece ni para cerrar', () => {
        const muyViejo = pedido({
            status: 'in_transit',
            fecha_entrega: '2026-06-01',
            fechas_entrega: ['2026-06-01']
        });
        expect(agruparPorFecha([muyViejo], 'in_transit', 10, HOY)).toEqual([]);
    });

    it('salen ordenadas de la más vieja a la más nueva', () => {
        const pedidos = [
            pedido({ status: 'in_transit', fecha_entrega: '2026-08-22', fechas_entrega: ['2026-08-22'] }),
            pedido({ status: 'in_transit', fecha_entrega: '2026-08-15', fechas_entrega: ['2026-08-15'] }),
            pedido({ status: 'in_transit', fecha_entrega: '2026-08-19', fechas_entrega: ['2026-08-19'] })
        ];
        expect(agruparPorFecha(pedidos, 'in_transit', 10, HOY).map(f => f.fecha))
            .toEqual(['2026-08-15', '2026-08-19', '2026-08-22']);
    });

    it('nunca ofrece más de 8 días de una vez', () => {
        const muchos = Array.from({ length: 15 }, (_, i) => {
            const dia = String(17 + i).padStart(2, '0');
            const fecha = i < 15 ? `2026-08-${dia}` : null;
            return pedido({ status: 'in_transit', fecha_entrega: fecha, fechas_entrega: [fecha] });
        }).filter(p => p.fecha_entrega);

        expect(agruparPorFecha(muchos, 'in_transit', 10, HOY).length)
            .toBeLessThanOrEqual(MAX_FECHAS_SUGERIDAS);
    });
});
