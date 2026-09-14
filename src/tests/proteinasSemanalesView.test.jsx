import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * La pantalla "Proteínas de la semana" montada de verdad, con los pedidos que
 * tendría el panel y Firestore de mentira. Lo que importa es lo que termina en
 * el pedido: si Guardar escribe en el pedido o la fecha equivocada, la hoja
 * cocina otra cosa y nadie lo nota.
 */

const escrituras = [];
vi.mock('firebase/firestore', () => ({
    doc: (_db, coleccion, id) => ({ ruta: `${coleccion}/${id}` }),
    updateDoc: vi.fn(async (ref, datos) => { escrituras.push({ ruta: ref.ruta, datos }); })
}));
vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('../utils/firestoreMenus', () => ({ getOfficialMenus: async () => ({ proteinasDisponibles: ['Tilapia empanizada'] }) }));
vi.mock('framer-motion', () => ({
    motion: new Proxy({}, { get: (_t, tag) => ({ children, initial, animate, transition, ...rest }) => React.createElement(tag, rest, children) })
}));

let pedidos = [];
vi.mock('../hooks/usePedidosDeFechas', () => ({ default: () => ({ pedidos, cargando: false, sinServidor: false, error: null }) }));

const { default: ProteinasSemanalesView } = await import('../pages/admin/ProteinasSemanalesView');

const COMPRA = ['Pollo teriyaki', 'Carne mechada', 'Tilapia empanizada', 'Pollo a la naranja', 'Lomo encebollado'];

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-18T10:00:00'));   // viernes
    escrituras.length = 0;
    pedidos = [
        {
            id: 'doc-xiomara', cliente: 'Xiomara Vilchez', plan: 'pack mensual proteínas 250 g', status: 'confirmed',
            fechas_entrega: ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'],
            items: [{ nombre: 'Pack 5 Proteínas (250g)', proteinas: COMPRA, plan: 'monthly' }]
        },
        {
            id: 'doc-kristy', cliente: 'Kristy Aguilar', plan: 'Pack de 3 proteínas de 500 gramos', status: 'confirmed',
            fechas_entrega: ['2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03'],
            proteinasPorEntrega: { '2026-09-19': ['Pollo al curry', 'Lomo', 'Tilapia'] },
            items: [{ nombre: 'Pack de 3 proteínas', proteinas: ['A', 'B', 'C'] }]
        },
        {
            id: 'doc-bajo', cliente: 'No es de proteínas', plan: 'Pack Bajo Calorías', status: 'confirmed',
            fechas_entrega: ['2026-09-19', '2026-09-21'], items: []
        }
    ];
});
afterEach(() => vi.useRealTimers());

const tarjetaDe = (nombre) => screen.getByRole('heading', { name: nombre, level: 3 }).closest('article');

describe('Proteínas de la semana', () => {
    it('muestra solo packs de proteínas, por día, con su estado', () => {
        render(<ProteinasSemanalesView />);
        expect(screen.queryByText('No es de proteínas')).toBeNull();
        expect(within(tarjetaDe('Kristy Aguilar')).getByText('Elegidas')).toBeTruthy();
        expect(within(tarjetaDe('Xiomara Vilchez')).getByText('Falta elegir')).toBeTruthy();
        expect(within(tarjetaDe('Xiomara Vilchez')).getByText(/entrega 2 de 4/)).toBeTruthy();
    });

    it('una entrega que falta arranca vacía y con 5 casillas', () => {
        render(<ProteinasSemanalesView />);
        const casillas = within(tarjetaDe('Xiomara Vilchez')).getAllByRole('combobox');
        expect(casillas).toHaveLength(5);
        expect(casillas.every(c => c.value === '')).toBe(true);
    });

    it('pegar la lista y guardar escribe SOLO esa fecha, en el pedido correcto', async () => {
        render(<ProteinasSemanalesView />);
        const t = tarjetaDe('Xiomara Vilchez');
        fireEvent.click(within(t).getByText('Pegar lista'));
        fireEvent.change(within(t).getByRole('textbox'), { target: { value: '1. Pollo caribeño\n- Tilapia x2\nLomo\nPollo al curry' } });
        fireEvent.click(within(t).getByText(/Usar esta lista/));
        expect(within(t).getByText('5 de 5 proteínas')).toBeTruthy();

        fireEvent.click(within(t).getByText('Guardar'));
        await waitFor(() => expect(escrituras).toHaveLength(1));
        expect(escrituras[0]).toEqual({
            ruta: 'pedidos/doc-xiomara',
            datos: { proteinasPorEntrega: { '2026-09-21': ['Pollo caribeño', 'Tilapia', 'Tilapia', 'Lomo', 'Pollo al curry'] } }
        });
    });

    it('"Repetir la semana anterior" copia la lista de la entrega de antes', () => {
        render(<ProteinasSemanalesView />);
        const t = tarjetaDe('Xiomara Vilchez');
        fireEvent.click(within(t).getByText('Repetir la semana anterior'));
        expect(within(t).getAllByRole('combobox').map(c => c.value)).toEqual(COMPRA);
    });

    it('guardar sin cambios está apagado, y "Quitar" borra la elección', async () => {
        render(<ProteinasSemanalesView />);
        const t = tarjetaDe('Kristy Aguilar');
        expect(within(t).getByText('Guardar').closest('button').disabled).toBe(true);
        fireEvent.click(within(t).getByText('Quitar'));
        await waitFor(() => expect(escrituras).toHaveLength(1));
        expect(escrituras[0]).toEqual({ ruta: 'pedidos/doc-kristy', datos: { proteinasPorEntrega: {} } });
    });

    it('el filtro de día deja solo el lunes', () => {
        render(<ProteinasSemanalesView />);
        fireEvent.click(screen.getByRole('button', { name: 'Lunes' }));
        expect(screen.queryByText('Kristy Aguilar')).toBeNull();
        expect(screen.getByText('Xiomara Vilchez')).toBeTruthy();
    });

    it('"solo los que faltan" esconde las que ya están elegidas', () => {
        render(<ProteinasSemanalesView />);
        fireEvent.click(screen.getByLabelText('Solo los que faltan'));
        expect(screen.queryByText('Kristy Aguilar')).toBeNull();
    });

    it('si Firestore falla, lo dice en la tarjeta', async () => {
        const { updateDoc } = await import('firebase/firestore');
        updateDoc.mockRejectedValueOnce(new Error('Sin conexión'));
        render(<ProteinasSemanalesView />);
        const t = tarjetaDe('Kristy Aguilar');
        fireEvent.click(within(t).getByText('Quitar'));
        expect(await within(t).findByRole('alert')).toHaveTextContent('Sin conexión');
    });
});
