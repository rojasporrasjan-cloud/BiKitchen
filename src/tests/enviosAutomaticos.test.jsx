import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Listas de Difusión → "WhatsApp automáticos": lo que Jan mira para saber qué
 * salió y qué falta. Tiene que decir la verdad: enviado, pendiente o sin teléfono.
 */

vi.mock('../firebase/config', () => ({ db: {}, auth: { currentUser: { getIdToken: async () => 't' } }, storage: {} }));
vi.mock('../utils/kommoClient', () => ({
    leerEnviosAutomaticos: async () => ({
        modos: {
            cambios: { modo: 'prueba', botListo: true, numeroDePrueba: '…0000' },
            renovacion: { modo: 'si', botListo: true, numeroDePrueba: '…0000' },
            'recordatorio-pago': { modo: 'no', botListo: false, numeroDePrueba: '…0000' },
            'pago-recibido': { modo: 'prueba', botListo: true, numeroDePrueba: '…0000' }
        },
        registro: [{
            id: 'e1', tipo: 'renovacion', modo: 'si', estado: 'enviado', cuando: '2026-09-26T16:00:00.000Z',
            enviados: [{ nombre: 'Ana', telefono: '88110001', fecha: '2026-10-03', muestra: false }], lesHabriaLlegado: []
        }]
    })
}));

const { default: EnviosAutomaticos } = await import('../components/admin/EnviosAutomaticos');

const pedido = (id, cliente, telefono, fechas, extra = {}) => ({
    id, cliente, telefono, status: 'confirmed', plan: 'Pack Mensual Keto',
    items: [{ nombre: 'Pack Mensual Keto', cantidad: 1 }],
    fecha_entrega: fechas[0], fechas_entrega: fechas, calendarioFijo: true, ...extra
});

const PEDIDOS = [
    pedido('a', 'Ana', '8811-0001', ['2026-09-26', '2026-10-03']),                              // termina el sábado
    pedido('b', 'Beto', '8811-0002', ['2026-10-03'], { status: 'pending_payment' }),            // debe
    pedido('c', 'Caro', '8888-8888', ['2026-10-05'], { status: 'pending_payment' }),            // relleno
    pedido('d', 'Dani', '8811-0004', ['2026-10-03'], { avisoPagoRecibido: '2026-10-01T22:00:00.000Z' })
];

describe('WhatsApp automáticos en Listas de Difusión', () => {
    beforeAll(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-02T15:00:00Z'));   // viernes 9 a. m. en CR
    });
    afterAll(() => vi.useRealTimers());

    it('dice qué está prendido y, por cliente, qué salió y qué falta', async () => {
        render(<MemoryRouter><EnviosAutomaticos orders={PEDIDOS} /></MemoryRouter>);

        const renovacion = await screen.findByRole('region', { name: 'Renovación del pack' });
        expect(within(renovacion).getByText('Prendido: les llega a los clientes')).toBeTruthy();
        expect(within(renovacion).getByText('Ana')).toBeTruthy();
        expect(within(renovacion).getByText(/^Enviado ·/)).toBeTruthy();

        const recordatorio = screen.getByRole('region', { name: 'Recordatorio de pago' });
        expect(within(recordatorio).getByText('Apagado · falta el bot en Kommo')).toBeTruthy();
        expect(within(recordatorio).getByText('Beto')).toBeTruthy();
        expect(within(recordatorio).getByText('No se le ha enviado')).toBeTruthy();
        expect(within(recordatorio).getByText('Sin teléfono válido: no le llega')).toBeTruthy();

        const pago = screen.getByRole('region', { name: 'Pago recibido' });
        expect(within(pago).getByText('Prueba: solo a tu número …0000')).toBeTruthy();
        expect(within(pago).getByText('Dani')).toBeTruthy();

        const cambios = screen.getByRole('region', { name: 'Menú y cambios de la semana' });
        expect(within(cambios).getByRole('link', { name: 'Cambios de la semana' }).getAttribute('href')).toBe('/admin/cambios-semana');
    });
});
