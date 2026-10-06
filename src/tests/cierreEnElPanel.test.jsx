import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Listas de Difusión: el cierre de pedidos automático (6 oct 2026). Jan tiene
 * que ver ANTES de prenderlo a quién le llegaría, si Kommo está conectado y
 * cuánto va gastado de los US$200 del mes.
 */

vi.mock('../firebase/config', () => ({ db: {}, auth: { currentUser: { getIdToken: async () => 't' } }, storage: {} }));
vi.mock('../utils/kommoClient', () => ({
    leerEnviosAutomaticos: async () => ({
        modos: { 'cierre-pedidos': { modo: 'prueba', botListo: true, numeroDePrueba: '…0000' } },
        registro: [],
        conexion: { ultimaVuelta: '2026-10-12T19:50:00.000Z', alDia: true, leidoHasta: '', totalEventos: 900 },
        marketingDelMes: { mes: '2026-10', mensajes: 100 }
    })
}));

const { default: EnviosAutomaticos } = await import('../components/admin/EnviosAutomaticos');

const pedido = (id, cliente, telefono, fechas) => ({
    id, cliente, telefono, status: 'confirmed', plan: 'Pack Bajo Calorías',
    items: [{ nombre: 'Pack Bajo Calorías', cantidad: 1 }], fecha_entrega: fechas[0], fechas_entrega: fechas
});

describe('el cierre de pedidos en Listas de Difusión', () => {
    beforeAll(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-12T15:00:00Z'));   // lunes 9 a. m. en CR → cierre del miércoles 14
    });
    afterAll(() => vi.useRealTimers());

    it('muestra a quién le llegaría el cierre del miércoles, la conexión y el gasto del mes', async () => {
        render(<MemoryRouter><EnviosAutomaticos orders={[
            pedido('a', 'Ana', '8811-0001', ['2026-10-07']),                 // le toca
            pedido('b', 'Beto', '8811-0002', ['2026-10-07', '2026-10-14']),  // ya tiene el 14
            pedido('c', 'Caro', '8811-0003', ['2026-10-10'])                 // es de sábado
        ]} /></MemoryRouter>);

        const cierre = await screen.findByRole('region', { name: 'Cierre de pedidos' });
        expect(within(cierre).getByText('Ana')).toBeTruthy();
        expect(within(cierre).queryByText('Beto')).toBeNull();
        expect(within(cierre).queryByText('Caro')).toBeNull();

        expect(screen.getByText(/al día/)).toBeTruthy();
        expect(screen.getByText(/100 mensajes ≈ US\$7\.40 de US\$200/)).toBeTruthy();
    });
});
