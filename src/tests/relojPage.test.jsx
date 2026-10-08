import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RelojPage from '../pages/RelojPage';
import { filasDelResumen, filasDelDetalle } from '../utils/excelPlanilla';
import { planillaDe, diasDeLaSemana, momentoCR } from '../utils/planilla';

/**
 * El reloj del iPad (Jan, 8 oct 2026): cada persona toca su nombre y marca.
 * Tiene que ser obvio qué va a marcar (entrada o salida) y confirmar en grande.
 */
vi.mock('../firebase/config', () => ({ auth: { currentUser: null } }));
vi.mock('../components/SEOHead', () => ({ default: () => null }));

const fetchEspia = vi.fn();
const responder = (status, cuerpo) => Promise.resolve({ ok: status < 400, status, json: async () => cuerpo });

const EMPLEADOS = [
    { id: 'rosa', nombre: 'Rosa Mora', color: 'emerald', tienePin: false, adentro: false, desde: null },
    { id: 'tannia', nombre: 'Tannia', color: 'sky', tienePin: true, adentro: true, desde: '2026-10-08T13:00:00.000Z' }
];

const montar = () => render(
    <MemoryRouter initialEntries={['/reloj/ABC']}>
        <Routes><Route path="/reloj/:codigo" element={<RelojPage />} /></Routes>
    </MemoryRouter>
);

beforeEach(() => {
    fetchEspia.mockReset();
    globalThis.fetch = fetchEspia;
});

describe('el reloj del iPad', () => {
    it('muestra a cada persona y si está adentro', async () => {
        fetchEspia.mockImplementation(() => responder(200, { hoy: '2026-10-08', empleados: EMPLEADOS }));
        montar();
        expect(await screen.findByText('Rosa Mora')).toBeTruthy();
        expect(screen.getByText(/Adentro desde 7:00 a\. m\./)).toBeTruthy();
        expect(screen.getByText('1 persona adentro')).toBeTruthy();
        expect(JSON.parse(fetchEspia.mock.calls[0][1].body)).toEqual({ accion: 'reloj', codigo: 'ABC' });
    });

    it('tocar el nombre pide confirmar y marca la ENTRADA en grande', async () => {
        fetchEspia.mockImplementation((url, { body }) => JSON.parse(body).accion === 'marcar'
            ? responder(200, { tipo: 'entrada', en: '2026-10-08T13:02:00.000Z', nombre: 'Rosa Mora' })
            : responder(200, { hoy: '2026-10-08', empleados: EMPLEADOS }));
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /Rosa Mora: marcar entrada/ }));
        expect(screen.getByText('Vas a marcar tu ENTRADA')).toBeTruthy();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Marcar entrada/ })); });
        expect(await screen.findByText('¡Buenos días, Rosa!')).toBeTruthy();
        expect(screen.getByText('Entrada marcada a las 7:02 a. m.')).toBeTruthy();
        const marca = fetchEspia.mock.calls.map(c => JSON.parse(c[1].body)).find(b => b.accion === 'marcar');
        expect(marca).toEqual({ accion: 'marcar', codigo: 'ABC', empleadoId: 'rosa', pin: '' });
    });

    it('con PIN: teclado, y al cuarto número marca la salida con el turno', async () => {
        fetchEspia.mockImplementation((url, { body }) => JSON.parse(body).accion === 'marcar'
            ? responder(200, { tipo: 'salida', en: '2026-10-08T21:00:00.000Z', nombre: 'Tannia' })
            : responder(200, { hoy: '2026-10-08', empleados: EMPLEADOS }));
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /Tannia: marcar salida/ }));
        expect(screen.getByText('Vas a marcar tu SALIDA')).toBeTruthy();
        for (const n of ['1', '2', '3']) fireEvent.click(screen.getByRole('button', { name: n }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: '4' })); });
        expect(await screen.findByText('¡Gracias, Tannia!')).toBeTruthy();
        expect(screen.getByText('Este turno: 8 h')).toBeTruthy();
    });

    it('PIN malo: lo dice y deja volver a escribirlo', async () => {
        fetchEspia.mockImplementation((url, { body }) => JSON.parse(body).accion === 'marcar'
            ? responder(403, { error: 'El PIN no es correcto.' })
            : responder(200, { hoy: '2026-10-08', empleados: EMPLEADOS }));
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /Tannia/ }));
        for (const n of ['9', '9', '9']) fireEvent.click(screen.getByRole('button', { name: n }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: '9' })); });
        expect((await screen.findByRole('alert')).textContent).toBe('El PIN no es correcto.');
        expect(screen.getByLabelText('0 de 4 números')).toBeTruthy();
    });

    it('si ya había marcado, se lo dice en vez de marcar otra vez', async () => {
        fetchEspia.mockImplementation((url, { body }) => JSON.parse(body).accion === 'marcar'
            ? responder(409, { error: 'Ya marcaste hace un momento.', tipo: 'entrada', en: '2026-10-08T13:02:00.000Z' })
            : responder(200, { hoy: '2026-10-08', empleados: EMPLEADOS }));
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /Rosa Mora/ }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Marcar entrada/ })); });
        expect(await screen.findByText('Ya habías marcado')).toBeTruthy();
    });

    it('con un link malo lo dice claro', async () => {
        fetchEspia.mockImplementation(() => responder(404, { error: 'Este link del reloj no es válido. Pedile uno nuevo a Jan.' }));
        montar();
        expect((await screen.findByRole('alert')).textContent).toMatch(/link del reloj no es válido/);
    });
});

describe('el Excel de la planilla', () => {
    const m = (tipo, fecha, hora, empleadoId = 'rosa') => ({ tipo, fecha, en: momentoCR(fecha, hora), empleadoId });

    it('resume horas por día, extras y total; el detalle marca la salida que falta', () => {
        const dias = diasDeLaSemana('2026-10-05');
        const planilla = planillaDe([{ id: 'rosa', nombre: 'Rosa', tarifaHora: 1500 }], [
            m('entrada', '2026-10-05', '06:00'), m('salida', '2026-10-05', '15:00'),
            m('entrada', '2026-10-06', '07:00')
        ], dias);
        const [fila] = filasDelResumen(planilla, dias);
        expect(fila).toMatchObject({ Empleado: 'Rosa', 'Lunes 05 (h)': 9, 'Martes 06 (h)': 0, 'Horas extra': 1, 'Total horas': 9, 'Total ₡': 14250 });
        const detalle = filasDelDetalle(planilla, dias);
        expect(detalle).toHaveLength(2);
        expect(detalle[1]).toMatchObject({ Fecha: '2026-10-06', Salida: 'FALTA' });
    });
});
