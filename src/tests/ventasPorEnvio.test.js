import { describe, it, expect } from 'vitest';
import {
    ventasDeEnvio, resumenDeVentas, totalesPorTipo, enviosQueCuentan, telefonosDelEnvio, msDeFecha
} from '../utils/ventasPorEnvio';
import { entradaDeRegistro } from '../utils/registroDeEnvios';
import { config as configCierre } from '../../netlify/functions/cierre-de-pedidos.js';

/**
 * 8 oct 2026, Jan: "deberíamos ver esas estadísticas desde nuestra página en el
 * panel admin". Se midió a mano: HOY5 a 201 personas → 3 usaron el cupón; promo
 * de proteínas a 92 → 1 compra clara. Esto lo hace solo.
 */

const envio = (extra = {}) => ({
    id: 'e1', tipo: 'cierre-pedidos', modo: 'si', estado: 'enviado', cuando: '2026-10-06T15:00:00.000Z',
    enviados: [
        { nombre: 'Kevin', telefono: '8888-4678' },
        { nombre: 'Ana', telefono: '+506 7000 1111' },
        { nombre: 'Muestra', telefono: '60000000', muestra: true }
    ],
    ...extra
});

const pedido = (extra = {}) => ({
    cliente: 'Kevin Cerdas', telefono: '88884678', total: 73625, status: 'confirmed',
    createdAt: { seconds: Date.parse('2026-10-07T12:00:00Z') / 1000 }, observaciones: 'Cupón HOY5 (5%)', ...extra
});

describe('cuánto vendió cada mensaje', () => {
    it('cuenta al que recibió el mensaje y pidió en las 72 horas siguientes, con su cupón', () => {
        const r = ventasDeEnvio(envio(), [pedido()]);
        expect(r.enviados).toBe(2);           // la muestra no cuenta
        expect(r.compraron).toBe(1);
        expect(r.monto).toBe(73625);
        expect(r.tasa).toBe(50);
        expect(r.pedidos[0]).toMatchObject({ cliente: 'Kevin Cerdas', cupon: 'HOY5' });
    });

    it('no cuenta lo que se pidió antes del mensaje, después de 72 h, cancelado o de alguien que no lo recibió', () => {
        const pedidos = [
            pedido({ createdAt: '2026-10-06T10:00:00Z' }),                        // antes
            pedido({ createdAt: { seconds: Date.parse('2026-10-10T16:00:00Z') / 1000 } }), // 73 h después
            pedido({ status: 'cancelled' }),
            pedido({ telefono: '85550000' })                                       // no estaba en la lista
        ];
        expect(ventasDeEnvio(envio(), pedidos).compraron).toBe(0);
    });

    it('dos pedidos de la misma persona: una persona que compró, la plata de los dos', () => {
        const r = ventasDeEnvio(envio(), [pedido(), pedido({ total: 21000 })]);
        expect(r.compraron).toBe(1);
        expect(r.monto).toBe(94625);
        expect(r.pedidos).toHaveLength(2);
    });

    it('las pruebas no cuentan; las difusiones a mano sí, con su nombre', () => {
        const registro = [
            envio({ id: 'p', modo: 'prueba', estado: 'prueba' }),
            { ...entradaDeRegistro({ tipo: 'difusion', modo: 'si', estado: 'enviado', nombre: 'Promo HOY5', enviados: [{ nombre: 'Kevin', telefono: '88884678' }], ahora: new Date('2026-10-06T15:00:00Z') }), id: 'd' }
        ];
        const cuentan = enviosQueCuentan(registro);
        expect(cuentan.map(e => e.id)).toEqual(['d']);
        const resumen = resumenDeVentas(registro, [pedido()]);
        expect(resumen[0]).toMatchObject({ tipo: 'difusion', nombre: 'Promo HOY5', compraron: 1 });
        expect(totalesPorTipo(resumen)[0]).toMatchObject({ nombre: 'Promo HOY5', veces: 1, monto: 73625, tasa: 100 });
    });

    it('teléfonos con formato distinto son la misma persona; los de relleno no cuentan', () => {
        expect(telefonosDelEnvio({ enviados: [{ telefono: '+506 8888-4678' }, { telefono: '88884678' }, { telefono: '88888888' }] }))
            .toEqual(['88884678']);
    });

    it('lee el createdAt como venga (Timestamp, segundos, texto)', () => {
        const t = Date.parse('2026-10-07T12:00:00Z');
        expect(msDeFecha({ toMillis: () => t })).toBe(t);
        expect(msDeFecha({ _seconds: t / 1000 })).toBe(t);
        expect(msDeFecha('2026-10-07T12:00:00Z')).toBe(t);
        expect(msDeFecha(null)).toBe(0);
    });
});

describe('cierre de pedidos a las 9 a. m. (Jan, 8 oct 2026)', () => {
    it('sale lunes, jueves y viernes a las 15:00 UTC = 9:00 a. m. de Costa Rica', () => {
        expect(configCierre.schedule).toBe('0 15 * * 1,4,5');
    });
});
