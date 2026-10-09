import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PantallaPlanilla from '../components/planilla/PantallaPlanilla';
import { fechaCR, momentoCR } from '../utils/planilla';

/**
 * Gina ve la planilla (en el panel como admin, o con su link) pero no la
 * cambia: sin agregar empleados, sin marcar en grupo, sin corregir marcas.
 * Jan ve lo mismo y además puede cambiar todo.
 */
vi.mock('../utils/planillaClient', () => ({ pedirALaPlanilla: vi.fn(), pedirAlReloj: vi.fn(), pedirGastosDelPanel: vi.fn() }));

const hoy = fechaCR();
const datos = {
    empleados: [{ id: 'rosa', nombre: 'Rosa', tarifaHora: 2000, color: 'emerald', activo: true }],
    marcas: [{ id: 'm1', empleadoId: 'rosa', tipo: 'entrada', fecha: hoy, en: momentoCR(hoy, '07:15') }]
};
const cargarDatos = vi.fn(async () => datos);

describe('la planilla solo para ver (Gina)', () => {
    it('muestra la semana y quién está trabajando, sin nada para cambiar', async () => {
        render(<PantallaPlanilla cargarDatos={cargarDatos} />);
        expect(await screen.findByText('Hoy en la cocina')).toBeTruthy();
        expect(screen.getAllByText('Rosa').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /Descargar Excel/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Agregar empleado/ })).toBeNull();
        expect(screen.queryByText('Marcar a varias a la vez')).toBeNull();
        expect(screen.queryByText('El reloj del iPad')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Rosa, ${hoy}`) }));
        expect(screen.getByText(/Está trabajando desde las 7:15 a\. m\./)).toBeTruthy();
        expect(screen.queryByText('Agregar una marca olvidada')).toBeNull();
        expect(screen.queryByRole('button', { name: /Borrar/ })).toBeNull();
    });
});

describe('si no se puede cargar', () => {
    it('con un link malo se ve el aviso solo, no una planilla en cero que parece "todo bien"', async () => {
        render(<PantallaPlanilla cargarDatos={async () => { throw new Error('Este link no es válido. Pedile uno nuevo a Jan.'); }} />);
        expect((await screen.findByRole('alert')).textContent).toMatch(/Este link no es válido/);
        expect(screen.queryByText('Todo bien')).toBeNull();
        expect(screen.queryByText('A pagar esta semana')).toBeNull();
        expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy();
    });
});

describe('la planilla de Jan', () => {
    it('tiene todo: agregar empleado arriba, marcar en grupo, los dos links y corregir', async () => {
        render(<PantallaPlanilla cargarDatos={cargarDatos} puedeEditar />);
        expect(await screen.findByText('Marcar a varias a la vez')).toBeTruthy();
        expect(screen.getByText('El reloj del iPad')).toBeTruthy();
        expect(screen.getByText('Link para Gina')).toBeTruthy();

        Element.prototype.scrollIntoView = vi.fn();
        fireEvent.click(screen.getAllByRole('button', { name: /Agregar empleado/ })[0]);
        expect(screen.getByText('Agregar empleado', { selector: 'h3' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Rosa, ${hoy}`) }));
        expect(screen.getByText('Agregar una marca olvidada')).toBeTruthy();
        expect(within(screen.getByRole('dialog')).getByLabelText('Qué marca').value).toBe('salida');   // está en turno: lo que falta es la salida
    });
});
