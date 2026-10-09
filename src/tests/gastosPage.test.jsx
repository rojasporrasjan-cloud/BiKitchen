import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GastosPage from '../pages/GastosPage';
import { leerMonto, validarGasto, totalesDeGastos, gastosPorDia } from '../utils/gastos';
import { fechaCR } from '../utils/planilla';

/**
 * Gina anota un gasto en el celular en 10 segundos: monto, categoría, guardar.
 * Si se cae la señal, el gasto no se pierde ni se duplica al reintentar.
 */
vi.mock('../firebase/config', () => ({ auth: { currentUser: null } }));
vi.mock('../components/SEOHead', () => ({ default: () => null }));

const fetchEspia = vi.fn();
const responder = (status, cuerpo) => Promise.resolve({ ok: status < 400, status, json: async () => cuerpo });
const cuerpos = (accion) => fetchEspia.mock.calls.map(c => JSON.parse(c[1].body)).filter(b => b.accion === accion);
const montar = () => render(
    <MemoryRouter initialEntries={['/gastos/ABC']}><Routes><Route path="/gastos/:codigo" element={<GastosPage />} /></Routes></MemoryRouter>
);

beforeEach(() => { fetchEspia.mockReset(); globalThis.fetch = fetchEspia; });

describe('el link de gastos', () => {
    it('anotar un gasto: monto, categoría y guardar; el botón dice cuánto y en qué', async () => {
        fetchEspia.mockImplementation((u, { body }) => (JSON.parse(body).accion === 'guardar'
            ? responder(200, { id: 'x' }) : responder(200, { gastos: [] })));
        montar();
        fireEvent.change(await screen.findByLabelText('¿Cuánto?'), { target: { value: '45000' } });
        fireEvent.click(screen.getByRole('button', { name: /Carnes/ }));
        expect(screen.getByRole('button', { name: /Guardar ₡45\s?000 en Carnes/ })).toBeTruthy();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Guardar ₡45/ })); });
        expect((await screen.findByRole('status')).textContent).toMatch(/Guardado: ₡45\s?000 en Carnes/);
        expect(cuerpos('guardar')[0]).toMatchObject({ codigo: 'ABC', gasto: { monto: 45000, categoria: 'carnes', fecha: fechaCR() } });
    });

    it('sin categoría o en «Otros» sin decir qué fue, avisa y no manda nada', async () => {
        fetchEspia.mockImplementation(() => responder(200, { gastos: [] }));
        montar();
        fireEvent.change(await screen.findByLabelText('¿Cuánto?'), { target: { value: '5000' } });
        fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
        expect(screen.getByRole('alert').textContent).toMatch(/categoría/);
        fireEvent.click(screen.getByRole('button', { name: /Otros/ }));
        fireEvent.click(screen.getByRole('button', { name: /Guardar ₡5/ }));
        expect(screen.getByRole('alert').textContent).toMatch(/Otros/);
        expect(cuerpos('guardar')).toHaveLength(0);
    });

    it('si no hay señal, no se pierde lo escrito y al reintentar va con el MISMO id (no se duplica)', async () => {
        let intento = 0;
        fetchEspia.mockImplementation((u, { body }) => {
            if (JSON.parse(body).accion !== 'guardar') return responder(200, { gastos: [] });
            intento += 1;
            return intento === 1 ? Promise.reject(new TypeError('Failed to fetch')) : responder(200, { id: 'x' });
        });
        montar();
        fireEvent.change(await screen.findByLabelText('¿Cuánto?'), { target: { value: '12000' } });
        fireEvent.click(screen.getByRole('button', { name: /Verduras/ }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Guardar ₡12/ })); });
        expect((await screen.findByRole('alert')).textContent).toMatch(/no hay internet/);
        expect(screen.getByLabelText('¿Cuánto?').value).toMatch(/12/);       // lo escrito sigue ahí
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Guardar ₡12/ })); });
        const [a, b] = cuerpos('guardar');
        expect(a.idGasto).toBe(b.idGasto);
    });
});

describe('las cuentas de los gastos', () => {
    it('lee montos como los escribe la gente', () => {
        expect(leerMonto('₡45.000')).toBe(45000);
        expect(leerMonto('45 000')).toBe(45000);
        expect(leerMonto('')).toBe(0);
    });

    it('limpia lo que entra', () => {
        const { gasto } = validarGasto({ fecha: '2026-10-09', categoria: 'carnes', monto: '45000', que: '  pollo   20 kg ', pago: 'Bitcoin' });
        expect(gasto).toMatchObject({ monto: 45000, que: 'pollo 20 kg', pago: '' });
    });

    it('suma por categoría y agrupa por día', () => {
        const lista = [
            { id: '1', fecha: '2026-10-09', categoria: 'carnes', monto: 45000 },
            { id: '2', fecha: '2026-10-09', categoria: 'verduras', monto: 12000 },
            { id: '3', fecha: '2026-10-08', categoria: 'carnes', monto: 30000 }
        ];
        const { porCategoria, total } = totalesDeGastos(lista);
        expect(total).toBe(87000);
        expect(porCategoria.map(c => [c.id, c.total])).toEqual([['carnes', 75000], ['verduras', 12000]]);
        expect(gastosPorDia(lista).map(d => [d.fecha, d.total])).toEqual([['2026-10-09', 57000], ['2026-10-08', 30000]]);
    });
});
