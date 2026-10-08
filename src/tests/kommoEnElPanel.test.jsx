import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** Jan, 8 oct 2026: una pantalla de Kommo con lo activo, lo enviado y el gasto. */

const hoy = new Date().toISOString();
vi.mock('../utils/kommoClient', () => ({
    leerEnviosAutomaticos: async () => ({
        modos: { renovacion: { modo: 'si', bots: ['117251'] }, 'cierre-pedidos': { modo: 'prueba', bots: ['117640'] } },
        registro: [
            { id: '1', tipo: 'renovacion', modo: 'si', cuando: hoy, enviados: [{ telefono: '88110001' }, { telefono: '88110002' }] },
            { id: '2', tipo: 'difusion', nombre: 'Promo HOY5', modo: 'si', cuando: '2026-10-06T16:00:00Z', enviados: [{ telefono: '88110003' }] }
        ],
        conexion: { ultimaVuelta: hoy, alDia: true },
        marketingDelMes: { mes: '2026-10', mensajes: 100 },
        ventas: { dias: 30, porTipo: [{ tipo: 'renovacion', enviados: 2, compraron: 1, monto: 77500 }], envios: [] }
    }),
    recalcularVentasPorEnvio: async () => ({})
}));

const { default: KommoView } = await import('../pages/admin/KommoView');

describe('WhatsApp (Kommo) en el panel', () => {
    it('muestra lo prendido, lo que salió, el gasto y la conexión', async () => {
        render(<MemoryRouter><KommoView /></MemoryRouter>);

        const prendidos = (await screen.findByText('Envíos prendidos')).closest('div');
        expect(within(prendidos).getByText('1')).toBeTruthy();
        expect(within(prendidos).getByText(/1 en prueba/)).toBeTruthy();

        const hoyCaja = screen.getByText('Mensajes hoy').closest('div');
        expect(within(hoyCaja).getByText('2')).toBeTruthy();

        expect(screen.getByText('US$7.40')).toBeTruthy();
        expect(screen.getByText('Al día')).toBeTruthy();
        expect(screen.getByText('Difusión a mano: Promo HOY5')).toBeTruthy();
        expect(screen.getByText('A 2 clientes')).toBeTruthy();
        expect(screen.getByText('Cronograma de los WhatsApp')).toBeTruthy();
    });
});
