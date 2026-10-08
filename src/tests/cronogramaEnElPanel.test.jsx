import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CronogramaDeMensajes from '../components/admin/CronogramaDeMensajes';

describe('el cronograma de los WhatsApp en el panel', () => {
    it('dice por día qué sale a qué hora, con su plantilla, su bot y si está prendido', () => {
        render(<CronogramaDeMensajes modos={{
            renovacion: { modo: 'si', bots: ['117251'] },
            'cierre-pedidos': { modo: 'prueba', bots: ['117463', '117640', '117642'] }
        }} />);

        expect(screen.getByText('Cronograma de los WhatsApp')).toBeTruthy();
        // El jueves sale el cierre a las 9 a. m.
        const jueves = screen.getByText('jueves').parentElement;
        expect(within(jueves).getByText(/Cierre de pedidos/)).toBeTruthy();
        expect(within(jueves).getByText('9:00 a. m.')).toBeTruthy();

        // La ficha: horario en palabras, plantilla, bots y estado
        const fila = screen.getAllByText('Cierre de pedidos').find(e => e.tagName === 'P').closest('tr');
        expect(within(fila).getByText('Lunes, jueves y viernes · 9:00 a. m.')).toBeTruthy();
        expect(within(fila).getByText(/cierre_pedidos_sabado/)).toBeTruthy();
        expect(within(fila).getByText(/117463 · 117640 · 117642/)).toBeTruthy();
        expect(within(fila).getByText('Prueba (solo a Jan)')).toBeTruthy();

        const renov = screen.getAllByText('Renovación del pack').find(e => e.tagName === 'P').closest('tr');
        expect(within(renov).getByText('Prendido')).toBeTruthy();

        // Volver a invitar avisa que falta la plantilla del 10 %
        expect(screen.getByText(/falta la plantilla nueva en Kommo/)).toBeTruthy();
        // Lo de Kommo y lo que se manda a mano
        expect(screen.getByText(/Bot- Bievenida/)).toBeTruthy();
        expect(screen.getByText('pasate_al_mensual_desayunos')).toBeTruthy();
        expect(screen.getByText('Bot de bienvenida mejorado')).toBeTruthy();
        expect(screen.getByText('Seguimiento a quien preguntó')).toBeTruthy();
    });
});
