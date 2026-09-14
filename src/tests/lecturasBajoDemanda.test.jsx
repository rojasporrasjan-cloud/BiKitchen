import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Las lecturas de Firebase: la colección entera de pedidos solo se baja cuando
 * una pantalla la pide, y Producción ya no la pide.
 */

const suscripciones = [];
vi.mock('../firebase/config', () => ({ db: {}, auth: {} }));
vi.mock('firebase/auth', () => ({
    onAuthStateChanged: (_auth, cb) => { cb({ email: 'admin@test.com', uid: 'u' }); return () => {}; }
}));
vi.mock('../config/admins', () => ({ ADMIN_EMAILS: ['admin@test.com'] }));
vi.mock('firebase/firestore', async () => {
    const vacio = () => ({});
    return {
        collection: vacio, query: (...a) => ({ a }), where: (...a) => ({ where: a }), orderBy: vacio, limit: vacio,
        doc: vacio, addDoc: vacio, updateDoc: vacio, getDoc: async () => ({ exists: () => false }), setDoc: vacio,
        increment: vacio, deleteDoc: vacio, getDocs: async () => ({ docs: [] }), runTransaction: vacio, writeBatch: vacio,
        Timestamp: { fromDate: (d) => d, now: () => new Date() },
        onSnapshot: (q, ...resto) => {
            suscripciones.push(q);
            const cb = resto.find(x => typeof x === 'function');
            cb({ docs: [], docChanges: () => [], metadata: { fromCache: false } });
            return () => {};
        }
    };
});

const { OrdersProvider, useOrders, useAccionesDePedidos } = await import('../context/OrdersContext');

beforeEach(() => { suscripciones.length = 0; });

const UsaLaLista = () => { const { orders } = useOrders(); return <p>lista: {orders.length}</p>; };
const SoloAcciones = () => { const { updateOrderStatus } = useAccionesDePedidos(); return <p>acciones: {typeof updateOrderStatus}</p>; };

describe('la colección entera de pedidos, bajo demanda', () => {
    /** Antes: ~600 lecturas en CADA página del panel, la necesitara o no. */
    it('si ninguna pantalla la pide, no se baja', async () => {
        await act(async () => { render(<OrdersProvider><p>hoja de producción</p></OrdersProvider>); });
        expect(suscripciones).toHaveLength(0);
    });

    it('con solo las acciones (confirmar) tampoco se baja', async () => {
        await act(async () => { render(<OrdersProvider><SoloAcciones /></OrdersProvider>); });
        expect(screen.getByText('acciones: function')).toBeTruthy();
        expect(suscripciones).toHaveLength(0);
    });

    /**
     * El error del 14 de setiembre: se entraba primero a una pantalla sin la
     * lista y después a Pedidos, y Pedidos se quedaba en "cargando" para siempre.
     */
    it('si la lista se pide DESPUÉS, igual arranca', async () => {
        const Pantalla = ({ conLista }) => (conLista ? <UsaLaLista /> : <p>importar whatsapp</p>);
        let vista;
        await act(async () => { vista = render(<OrdersProvider><Pantalla conLista={false} /></OrdersProvider>); });
        expect(suscripciones).toHaveLength(0);
        await act(async () => { vista.rerender(<OrdersProvider><Pantalla conLista /></OrdersProvider>); });
        expect(suscripciones).toHaveLength(1);
    });

    it('una pantalla que usa la lista la pide, y se baja UNA vez', async () => {
        await act(async () => {
            render(<OrdersProvider><UsaLaLista /><UsaLaLista /></OrdersProvider>);
        });
        expect(suscripciones).toHaveLength(1);
        expect(screen.getAllByText('lista: 0')).toHaveLength(2);
    });
});

describe('Producción (SheetsView) sin la lista entera', () => {
    it('carga, no pide la lista y ofrece lunes, miércoles y sábado', async () => {
        vi.resetModules();
        vi.doMock('../hooks/usePedidosDeFechas', () => ({
            default: (fechas) => ({
                pedidos: [{ id: 'a', cliente: 'Ana', status: 'confirmed', fecha_entrega: fechas[0], fechas_entrega: [fechas[0]], plan: 'Individuales', items: [] }],
                cargando: false, sinServidor: false, error: null
            })
        }));
        vi.doMock('../context/OrdersContext', () => ({
            useAccionesDePedidos: () => ({ updateOrderStatus: async () => {} }),
            useOrders: () => { throw new Error('Producción no debería pedir la lista entera'); }
        }));
        vi.doMock('framer-motion', () => ({
            motion: new Proxy({}, { get: (_t, tag) => ({ children, initial, animate, transition, whileHover, whileTap, ...rest }) => React.createElement(tag, rest, children) })
        }));
        const { default: SheetsView } = await import('../pages/admin/SheetsView');

        await act(async () => { render(<MemoryRouter><SheetsView /></MemoryRouter>); });
        expect(screen.getByText(/1 pedido para esta fecha/)).toBeTruthy();
        const opciones = [...document.querySelectorAll('select option')].map(o => o.value).filter(v => /^\d{4}-/.test(v));
        expect(opciones.length).toBeGreaterThan(10);
        expect(opciones.every(v => [1, 3, 6].includes(new Date(`${v}T12:00:00`).getDay()))).toBe(true);
    });
});
