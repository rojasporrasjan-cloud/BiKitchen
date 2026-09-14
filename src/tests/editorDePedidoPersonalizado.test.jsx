import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditorDePedido from '../components/admin/EditorDePedido';

/**
 * El editor del pedido con un PERSONALIZADO: el caso de Dalia Parrales del 10
 * de setiembre de 2026. Se prueba el componente de verdad porque la pantalla
 * de la hoja pide sesión de admin y no hay otra forma de verlo funcionar.
 */
const pedidoDeDalia = {
    id: 'dalia',
    cliente: 'Dalia Parrales',
    plan: 'Personalizado Bajo Calorías — Dalia Parrales',
    observaciones: 'Sin cerdo',
    items: [],
    esPersonalizado: true,
    menuActual: [
        { proteina: 'Pollo teriyaki', vegetal: 'Brocoli', carbo: 'Arroz' }
    ]
};

const PEGADO = `Cliente: Dalia Parales
Lugar curri
Teléfono 88505919

Fajitas de pollo al limon y hierbas
Chayotes salteados al ajillo
Arroz blanco

Filet de tilapia en mantequilla
Ensalada coleslaw
Pure de papa`;

describe('editor del pedido de un personalizado', () => {
    it('muestra el campo del menú con lo que el pedido tiene hoy', () => {
        render(<EditorDePedido pedido={pedidoDeDalia} onGuardar={vi.fn()} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} />);
        const campo = screen.getByLabelText('Menú de esta entrega');
        expect(campo.value).toBe('Pollo teriyaki\nBrocoli\nArroz');
    });

    it('al pegar, muestra plato por plato lo que se va a guardar', () => {
        render(<EditorDePedido pedido={pedidoDeDalia} onGuardar={vi.fn()} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Menú de esta entrega'), { target: { value: PEGADO } });
        expect(screen.getByText(/Fajitas de pollo al limon y hierbas · Chayotes salteados al ajillo · Arroz blanco/)).toBeTruthy();
        expect(screen.getByText(/Filet de tilapia en mantequilla · Ensalada coleslaw · Pure de papa/)).toBeTruthy();
    });

    it('guarda los platos leídos, sin los datos del cliente', async () => {
        const onGuardar = vi.fn().mockResolvedValue();
        render(<EditorDePedido pedido={pedidoDeDalia} onGuardar={onGuardar} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Menú de esta entrega'), { target: { value: PEGADO } });
        fireEvent.click(screen.getByText('Guardar'));
        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        const { menu, observaciones } = onGuardar.mock.calls[0][0];
        expect(observaciones).toBe('Sin cerdo');
        expect(menu).toHaveLength(2);
        expect(menu[0].proteina).toBe('Fajitas de pollo al limon y hierbas');
        expect(menu[1].carbo).toBe('Pure de papa');
    });

    it('si solo se cambian las notas, el menú no se toca', async () => {
        const onGuardar = vi.fn().mockResolvedValue();
        render(<EditorDePedido pedido={pedidoDeDalia} onGuardar={onGuardar} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Especificaciones'), { target: { value: 'Sin cerdo · Curri' } });
        fireEvent.click(screen.getByText('Guardar'));
        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].menu).toBeNull();
    });

    it('un menú sin platos no se deja guardar', () => {
        render(<EditorDePedido pedido={pedidoDeDalia} onGuardar={vi.fn()} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Menú de esta entrega'), { target: { value: 'Cliente: Dalia' } });
        expect(screen.getByText(/No se puede guardar un menú vacío/)).toBeTruthy();
        expect(screen.getByText('Guardar').closest('button').disabled).toBe(true);
    });

    it('un pack normal no muestra el campo del menú', () => {
        render(<EditorDePedido pedido={{ ...pedidoDeDalia, esPersonalizado: false, plan: 'Pack Bajo en Calorías' }} onGuardar={vi.fn()} onCancelarPedido={vi.fn()} onCerrar={vi.fn()} />);
        expect(screen.queryByLabelText('Menú de esta entrega')).toBeNull();
    });
});
