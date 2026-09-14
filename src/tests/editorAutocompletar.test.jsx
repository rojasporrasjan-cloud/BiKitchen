import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditorDePedido from '../components/admin/EditorDePedido';

/**
 * El autocompletar en "Arreglar" de la hoja de producción.
 *
 * "yo pongo tilapia, me pongan todas las tilapias que hay para yo poder
 *  seleccionarla" — Jan, 14 de setiembre de 2026.
 */

const SUGERENCIAS = ['Tilapia empanizada', 'Pollo caribeño', 'Filet de tilapia al ajillo', 'Fajitas de cerdo encebolladas'];

const pack = {
    id: 'doc-patrick',
    cliente: 'Patrick',
    plan: 'Pack 5 Proteínas (500g)',
    observaciones: '',
    proteinas: ['Pollo caribeño'],
    cuantasProteinas: 3
};

const abrir = (pedido, onGuardar = vi.fn(async () => {})) => {
    render(<EditorDePedido pedido={pedido} onGuardar={onGuardar} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} sugerencias={SUGERENCIAS} />);
    return onGuardar;
};

describe('proteínas con autocompletar', () => {

    it('un campo por proteína, con lo que ya tenía', () => {
        abrir(pack);
        expect(screen.getByLabelText('Proteína 1').value).toBe('Pollo caribeño');
        expect(screen.getByLabelText('Proteína 2').value).toBe('');
        expect(screen.getByLabelText('Proteína 3').value).toBe('');
    });

    it('escribir "tilapia" muestra TODAS las tilapias y elegir una la deja escrita igual que el menú', async () => {
        const onGuardar = abrir(pack);
        const campo = screen.getByLabelText('Proteína 2');
        fireEvent.change(campo, { target: { value: 'tilapia' } });

        const opciones = screen.getAllByRole('option').map(o => o.textContent);
        expect(opciones).toEqual(['Tilapia empanizada', 'Filet de tilapia al ajillo']);

        fireEvent.mouseDown(screen.getByRole('option', { name: 'Tilapia empanizada' }));
        expect(campo.value).toBe('Tilapia empanizada');
        expect(screen.queryAllByRole('option')).toHaveLength(0);

        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].proteinas).toEqual(['Pollo caribeño', 'Tilapia empanizada']);
    });

    it('con el teclado: flecha abajo y Enter elige', () => {
        abrir(pack);
        const campo = screen.getByLabelText('Proteína 2');
        fireEvent.change(campo, { target: { value: 'cerdo' } });
        fireEvent.keyDown(campo, { key: 'ArrowDown' });
        fireEvent.keyDown(campo, { key: 'Enter' });
        expect(campo.value).toBe('Fajitas de cerdo encebolladas');
    });

    it('lo que no está en la lista se puede dejar escrito tal cual', async () => {
        const onGuardar = abrir(pack);
        fireEvent.change(screen.getByLabelText('Proteína 3'), { target: { value: 'Lomo a la pimienta' } });
        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].proteinas).toEqual(['Pollo caribeño', 'Lomo a la pimienta']);
    });

    it('pegar la lista de WhatsApp la reparte en los campos', () => {
        abrir(pack);
        fireEvent.paste(screen.getByLabelText('Proteína 1'), {
            clipboardData: { getData: () => 'Tilapia empanizada\nPollo caribeño x2' }
        });
        expect(screen.getByLabelText('Proteína 1').value).toBe('Tilapia empanizada');
        expect(screen.getByLabelText('Proteína 2').value).toBe('Pollo caribeño');
        expect(screen.getByLabelText('Proteína 3').value).toBe('Pollo caribeño');
    });

    it('sin tocar nada no deja guardar', () => {
        abrir(pack);
        expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
    });
});

describe('menú de un personalizado', () => {

    it('buscar un plato lo agrega como renglón del menú', () => {
        abrir({ id: 'doc-mayela', cliente: 'Mayela', plan: 'PERSONALIZADO sin carbos', observaciones: '', esPersonalizado: true, menuActual: [] });
        const buscar = screen.getByLabelText(/buscar un plato/i);
        fireEvent.change(buscar, { target: { value: 'tilapia' } });
        fireEvent.mouseDown(screen.getByRole('option', { name: 'Filet de tilapia al ajillo' }));

        expect(screen.getByLabelText('Menú de esta entrega').value).toBe('Filet de tilapia al ajillo');
        expect(buscar.value).toBe('');
    });
});
