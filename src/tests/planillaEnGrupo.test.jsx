import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MarcaEnGrupo from '../components/planilla/MarcaEnGrupo';
import EmpleadosPlanilla from '../components/planilla/EmpleadosPlanilla';
import { EMPLEADOS_INICIALES } from '../data/planilla';
import { momentoCR, planillaDe } from '../utils/planilla';

/**
 * 8 oct 2026: Jan arrancó la planilla a media mañana. "Hoy todas empezaron a
 * las 7:15": se cargan las 9 de la lista de Gina con un botón, se les marca la
 * entrada juntas, y en la tarde cada una marca su salida en el iPad.
 */
const pedidos = vi.hoisted(() => []);
vi.mock('../utils/planillaClient', () => ({
    pedirALaPlanilla: vi.fn(async (accion, datos) => { pedidos.push({ accion, ...datos }); return { id: `id${pedidos.length}` }; })
}));

const empleados = [
    { id: 'carmen', nombre: 'Doña Carmen', tarifaHora: 2500, color: 'orange' },
    { id: 'rosa', nombre: 'Rosa', tarifaHora: 2000, color: 'emerald' },
    { id: 'tannia', nombre: 'Tannia', tarifaHora: 1900, color: 'sky' },
    { id: 'viejo', nombre: 'Ya no está', tarifaHora: 1000, activo: false }
];

beforeEach(() => { pedidos.length = 0; });

describe('la lista de Gina', () => {
    it('trae a las 9 con lo que gana cada una', () => {
        expect(EMPLEADOS_INICIALES).toHaveLength(9);
        expect(EMPLEADOS_INICIALES.find(e => e.nombre === 'Doña Carmen').tarifaHora).toBe(2500);
        expect(EMPLEADOS_INICIALES.find(e => e.nombre === 'Fernanda').tarifaHora).toBe(2200);
        expect(EMPLEADOS_INICIALES.find(e => e.nombre === 'Tannia').tarifaHora).toBe(1900);
    });

    it('con la planilla vacía, un botón las carga a todas (cada una con su color)', async () => {
        const onCambio = vi.fn();
        render(<EmpleadosPlanilla empleados={[]} listos onCambio={onCambio} />);
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Cargar las 9 de la lista de Gina/ })); });
        expect(pedidos.map(p => p.empleado.nombre)).toEqual(EMPLEADOS_INICIALES.map(e => e.nombre));
        expect(new Set(pedidos.map(p => p.empleado.color)).size).toBe(9);
        expect(onCambio).toHaveBeenCalled();
    });

    it('mientras no se sabe si hay empleados, no ofrece cargarlas (no se duplican)', () => {
        render(<EmpleadosPlanilla empleados={[]} listos={false} onCambio={() => {}} />);
        expect(screen.queryByRole('button', { name: /lista de Gina/ })).toBeNull();
    });
});

describe('marcar a varias a la vez', () => {
    it('entrada de todas a las 7:15, sin las que ya no trabajan', async () => {
        const { container } = render(<MarcaEnGrupo empleados={empleados} marcas={[]} hoy="2026-10-08" desde="2026-10-05" onCambio={() => {}} />);
        fireEvent.change(container.querySelector('input[type="time"]'), { target: { value: '07:15' } });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Marcar entrada a 3 personas' })); });
        expect(pedidos.map(p => p.marca)).toEqual(['carmen', 'rosa', 'tannia'].map(id => ({
            empleadoId: id, fecha: '2026-10-08', hora: '07:15', tipo: 'entrada', nota: 'Entrada en grupo'
        })));
        expect(screen.getByRole('status').textContent).toBe('Listo: entrada de 3 personas a las 07:15.');
    });

    it('se puede quitar a alguien, y a quien ya está adentro no se le marca entrada otra vez', async () => {
        const marcas = [{ empleadoId: 'rosa', tipo: 'entrada', fecha: '2026-10-08', en: momentoCR('2026-10-08', '07:00') }];
        const { container } = render(<MarcaEnGrupo empleados={empleados} marcas={marcas} hoy="2026-10-08" desde="2026-10-05" onCambio={() => {}} />);
        expect(screen.getByRole('button', { name: /Rosa/ }).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /Tannia/ }));
        fireEvent.change(container.querySelector('input[type="time"]'), { target: { value: '07:15' } });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Marcar entrada a 1 persona' })); });
        expect(pedidos.map(p => p.marca.empleadoId)).toEqual(['carmen']);
    });

    it('con la entrada de las 7:15 y la salida de la tarde, sale el pago del día', () => {
        const marcas = [
            { empleadoId: 'carmen', tipo: 'entrada', fecha: '2026-10-08', en: momentoCR('2026-10-08', '07:15') },
            { empleadoId: 'carmen', tipo: 'salida', fecha: '2026-10-08', en: momentoCR('2026-10-08', '15:15') }
        ];
        const [carmen] = planillaDe([empleados[0]], marcas, ['2026-10-08']);
        expect(carmen.porDia['2026-10-08']).toMatchObject({ minutos: 480, monto: 20000 });   // 8 h × ₡2.500
    });
});
