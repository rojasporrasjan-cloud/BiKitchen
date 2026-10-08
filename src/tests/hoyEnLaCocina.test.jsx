import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HoyEnLaCocina from '../components/planilla/HoyEnLaCocina';
import TablaSemanal from '../components/planilla/TablaSemanal';
import { momentoCR, planillaDe } from '../utils/planilla';

/**
 * El panel muestra en vivo quién trabaja hoy y cuánto lleva ganado, y en la
 * tabla el turno abierto de hoy sale "En turno", no como un olvido.
 */
const empleados = [
    { id: 'carmen', nombre: 'Doña Carmen', tarifaHora: 2500, color: 'orange' },
    { id: 'rosa', nombre: 'Rosa', tarifaHora: 2000, color: 'emerald' },
    { id: 'paula', nombre: 'Paula', tarifaHora: 2000, color: 'rose' }
];
const m = (empleadoId, tipo, hora) => ({ empleadoId, tipo, fecha: '2026-10-08', en: momentoCR('2026-10-08', hora) });
const marcas = [m('carmen', 'entrada', '07:15'), m('rosa', 'entrada', '06:00'), m('rosa', 'salida', '14:00')];

afterEach(() => { vi.useRealTimers(); });

describe('hoy en la cocina', () => {
    it('quien está adentro lleva sus horas y su plata hasta ahora; quien se fue, lo del día', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(momentoCR('2026-10-08', '10:15')));     // 3 h de Doña Carmen
        render(<HoyEnLaCocina planilla={planillaDe(empleados, marcas, ['2026-10-08'], '2026-10-08')} hoy="2026-10-08" />);
        expect(screen.getByText('Desde 7:15 a. m. · lleva 3 h')).toBeTruthy();
        expect(screen.getByText(/^₡7\s?500$/)).toBeTruthy();                    // 3 h × ₡2.500
        expect(screen.getByText('Ya se fue · 8 h')).toBeTruthy();
        expect(screen.getByText(/^₡16\s?000$/)).toBeTruthy();
        expect(screen.getByText('No ha marcado hoy')).toBeTruthy();
        expect(screen.getByText(/^₡23\s?500$/)).toBeTruthy();                   // lo que va el día
    });
});

describe('la tabla de la semana', () => {
    it('hoy, el turno abierto sale En turno y no pide corregir', () => {
        const dias = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
        render(<TablaSemanal planilla={planillaDe(empleados, marcas, dias, '2026-10-08')} dias={dias} hoy="2026-10-08" onElegirDia={() => {}} />);
        expect(screen.getByRole('button', { name: /Doña Carmen, 2026-10-08: en turno$/ })).toBeTruthy();
        expect(screen.queryByText('Revisar')).toBeNull();
    });
});
