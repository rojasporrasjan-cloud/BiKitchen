import { describe, it, expect } from 'vitest';
import { puedeCerrarsePedido } from '../utils/subscriptionProgress';

/**
 * El 24 de agosto de 2026 había 33 pedidos marcados "Entregado" que todavía tenían
 * entregas por delante: 27 de ellos con entrega ese mismo lunes. Al caer al
 * historial, la hoja de producción dejaba de verlos y esos clientes — que ya habían
 * pagado el mes completo — no recibían.
 *
 * Estos tests fijan la regla: un pedido solo se cierra cuando ya no le queda
 * ninguna fecha futura.
 */

const HOY = new Date('2026-08-24T10:00:00');

/** Pedido tal como sale de Firestore. Las fechas mandan sobre el plan del ítem. */
const pedido = (fechas, extra = {}) => ({
    id: 'p1',
    cliente: 'Cliente Uno',
    status: 'in_transit',
    fechas_entrega: fechas,
    items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1, plan: 'monthly' }],
    ...extra
});

describe('puedeCerrarsePedido', () => {
    it('deja cerrar un pedido de una sola entrega que ya pasó', () => {
        const r = puedeCerrarsePedido(pedido(['2026-08-24']), HOY);
        expect(r.puede).toBe(true);
        expect(r.restantes).toEqual([]);
    });

    it('NO deja cerrar un pack mensual al que le faltan tres semanas', () => {
        const r = puedeCerrarsePedido(
            pedido(['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14']),
            HOY
        );
        expect(r.puede).toBe(false);
        expect(r.restantes).toEqual(['2026-08-31', '2026-09-07', '2026-09-14']);
        expect(r.proxima).toBe('2026-08-31');
    });

    it('NO deja cerrar un quincenal al que le falta la segunda entrega', () => {
        const r = puedeCerrarsePedido(pedido(['2026-08-24', '2026-08-31']), HOY);
        expect(r.puede).toBe(false);
        expect(r.restantes).toHaveLength(1);
        expect(r.motivo).toContain('2026-08-31');
    });

    it('deja cerrar el pack cuando la última entrega es HOY', () => {
        // Cerrar el día es justo lo que se hace al terminar la ruta: la entrega de
        // hoy no puede bloquear su propio cierre.
        const r = puedeCerrarsePedido(
            pedido(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24']),
            HOY
        );
        expect(r.puede).toBe(true);
    });

    it('deja cerrar un pack que ya terminó todas sus entregas', () => {
        const r = puedeCerrarsePedido(pedido(['2026-08-03', '2026-08-10']), HOY);
        expect(r.puede).toBe(true);
    });

    it('no se cae con un pedido sin fechas', () => {
        const r = puedeCerrarsePedido(pedido([]), HOY);
        expect(r.puede).toBe(true);
    });

    it('reproduce el caso real de Tatiana Soto (#ORD-VAA1X2OH1G)', () => {
        // 4 envíos, la del 17 ya salió y la del 24 estaba pendiente. Se cerró igual
        // y el pedido desapareció de la hoja del lunes.
        const cierreDelDia17 = new Date('2026-08-17T20:00:00');
        const r = puedeCerrarsePedido(
            pedido(['2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']),
            cierreDelDia17
        );
        expect(r.puede).toBe(false);
        expect(r.proxima).toBe('2026-08-24');
    });
});
