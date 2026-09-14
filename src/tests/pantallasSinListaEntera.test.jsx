import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Las pantallas del día a día cargan sin pedir la colección entera de pedidos.
 * Si alguna vuelve a llamar a useOrders(), esta prueba falla: esa llamada es la
 * que baja los ~600 pedidos.
 */

const fechasPedidas = [];
// El MISMO objeto en cada dibujo, como el hook real (vive en un useState). Una
// lista nueva por dibujo haria que los efectos que dependen de ella corran sin
// parar, y eso no pasa en la app.
const ESTADO = { pedidos: [], cargando: false, sinServidor: false, error: null };
vi.mock('../hooks/usePedidosDeFechas', () => ({
    default: (fechas, motivo) => {
        fechasPedidas.push({ fechas, motivo });
        return ESTADO;
    }
}));
vi.mock('../context/OrdersContext', () => ({
    useAccionesDePedidos: () => ({ updateOrderStatus: async () => {} }),
    useOrders: () => { throw new Error('Esta pantalla no debería pedir la lista entera de pedidos'); }
}));
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ currentUser: { email: 'admin@test.com' }, isSuperAdmin: () => true, isAdmin: true })
}));
vi.mock('../firebase/config', () => ({ db: {}, auth: {}, storage: {} }));
vi.mock('../utils/firestoreMenus', async (original) => ({ ...(await original()), getOfficialMenus: async () => null }));
vi.mock('framer-motion', () => ({
    motion: new Proxy({}, { get: (_t, tag) => ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, ...rest }) => React.createElement(tag, rest, children) }),
    AnimatePresence: ({ children }) => children
}));

const montar = async (Pantalla) => {
    await act(async () => { render(<MemoryRouter><Pantalla /></MemoryRouter>); });
};

describe('pantallas del día a día sin la lista entera', () => {
    it('Hoja de despacho', async () => {
        const { default: Pantalla } = await import('../pages/admin/DispatchSheetView');
        await montar(Pantalla);
        expect(fechasPedidas.some(x => x.motivo === 'Hoja de despacho' && x.fechas.length === 1)).toBe(true);
        expect(screen.getByLabelText('Elegir otro día')).toBeTruthy();
    });

    it('Impresión de etiquetas', async () => {
        const { default: Pantalla } = await import('../pages/admin/PrinterView');
        await montar(Pantalla);
        expect(fechasPedidas.some(x => x.motivo === 'Etiquetas' && x.fechas.length === 1)).toBe(true);
    });

    it('Importar WhatsApp (sin borrador no consulta fechas)', async () => {
        const { default: Pantalla } = await import('../pages/admin/WhatsAppImportView');
        await montar(Pantalla);
        const delImportador = fechasPedidas.filter(x => x.motivo === 'Importar WhatsApp');
        expect(delImportador.length).toBeGreaterThan(0);
        expect(delImportador.every(x => x.fechas.length === 0)).toBe(true);
    });
});
