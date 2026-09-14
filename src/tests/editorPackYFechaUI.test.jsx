import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditorDePedido from '../components/admin/EditorDePedido';

/**
 * Los dos campos que faltaban en el editor, probados sobre el componente de
 * verdad: la pantalla de la hoja pide sesión de admin y no hay otra forma de
 * verlo funcionar.
 *
 *   NOMBRE DEL PACK   el de Patrick dice "(250g)" y él es de 500. De ahí sale
 *                     el gramaje, así que sin poder renombrarlo no había arreglo.
 *   FECHA             Randall mueve SOLO esta semana; Giancarlo se muda de día
 *                     para siempre. Confundirlas le cambia el plan al cliente.
 */

const pedidoDePatrick = {
    id: 'patrick',
    cliente: 'Patrick Santamaría',
    plan: 'Pack 5 Proteínas (250g)',
    observaciones: '',
    items: [],
    fechasEntrega: ['2026-09-14', '2026-09-21'],
    fechaDeLaHoja: '2026-09-14'
};

const abrir = (extra = {}) => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(
        <EditorDePedido
            pedido={{ ...pedidoDePatrick, ...extra }}
            onGuardar={onGuardar}
            onCancelarPedido={vi.fn()}
            onCerrar={vi.fn()}
        />
    );
    return onGuardar;
};

const guardar = () => fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

describe('el nombre del pack', () => {

    it('se puede ver y cambiar', () => {
        abrir();
        const campo = screen.getByLabelText(/nombre del pack/i);
        expect(campo.value).toBe('Pack 5 Proteínas (250g)');
    });

    it('el de Patrick: cambiarlo a 500g se guarda', async () => {
        const onGuardar = abrir();
        fireEvent.change(screen.getByLabelText(/nombre del pack/i), {
            target: { value: 'Pack 5 Proteínas (500g)' }
        });
        guardar();

        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].plan).toBe('Pack 5 Proteínas (500g)');
    });

    it('avisa que cambiar el nombre cambia cuánto se cocina', () => {
        abrir();
        fireEvent.change(screen.getByLabelText(/nombre del pack/i), {
            target: { value: 'PERSONALIZADO — Patrick (500 g)' }
        });
        expect(screen.getByText(/cuánto se cocina/i)).toBeTruthy();
    });

    it('sin tocarlo no se manda nada', async () => {
        const onGuardar = abrir();
        fireEvent.change(screen.getByLabelText(/notas|especificaciones/i), {
            target: { value: 'algo nuevo' }
        });
        guardar();

        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].plan).toBeNull();
    });
});

describe('la fecha de entrega', () => {

    it('muestra en qué día está hoy', () => {
        abrir();
        expect(screen.getByLabelText(/día de entrega/i).value).toBe('2026-09-14');
    });

    it('el de Randall: mueve SOLO esta entrega', async () => {
        const onGuardar = abrir();
        fireEvent.change(screen.getByLabelText(/día de entrega/i), {
            target: { value: '2026-09-16' }
        });
        guardar();

        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].fechas).toEqual({
            fechaActual: '2026-09-14', fechaNueva: '2026-09-16', todas: false
        });
    });

    it('el de Giancarlo: marcando la casilla mueve TODAS', async () => {
        const onGuardar = abrir();
        fireEvent.change(screen.getByLabelText(/día de entrega/i), {
            target: { value: '2026-09-16' }
        });
        fireEvent.click(screen.getByLabelText(/mover todas/i));
        guardar();

        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].fechas.todas).toBe(true);
    });

    it('la casilla de "todas" solo aparece si se cambió la fecha', () => {
        abrir();
        expect(screen.queryByLabelText(/mover todas/i)).toBeNull();
    });

    it('sin tocarla no se manda nada', async () => {
        const onGuardar = abrir();
        fireEvent.change(screen.getByLabelText(/notas|especificaciones/i), {
            target: { value: 'otra cosa' }
        });
        guardar();

        await waitFor(() => expect(onGuardar).toHaveBeenCalled());
        expect(onGuardar.mock.calls[0][0].fechas).toBeNull();
    });

    it('un pedido sin fechas guardadas no muestra el campo', () => {
        render(
            <EditorDePedido
                pedido={{ ...pedidoDePatrick, fechasEntrega: [], fechaDeLaHoja: '' }}
                onGuardar={vi.fn()} onCancelarPedido={vi.fn()} onCerrar={vi.fn()}
            />
        );
        expect(screen.queryByLabelText(/día de entrega/i)).toBeNull();
    });
});
