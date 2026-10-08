import { describe, it, expect } from 'vitest';
import {
    fechaCR, momentoCR, horaCR, siguienteMarca, estadoActual, tramosDelDia,
    pagoDelDia, lunesDe, diasDeLaSemana, planillaDe, duracion, iniciales
} from '../utils/planilla';

/**
 * El reloj de entrada y salida (Jan, 8 oct 2026): se paga por hora, y la
 * planilla tiene que dar el salario de cada persona por día. Las cuentas
 * tienen que ser exactas: es plata de la gente.
 */
const m = (tipo, fecha, hora, empleadoId = 'rosa') => ({ tipo, fecha, en: momentoCR(fecha, hora), empleadoId });

describe('las horas de Costa Rica', () => {
    it('la fecha es la de acá aunque en UTC ya sea otro día', () => {
        // 8 oct 11:30 p. m. en CR = 9 oct 5:30 a. m. UTC
        expect(fechaCR('2026-10-09T05:30:00Z')).toBe('2026-10-08');
        expect(momentoCR('2026-10-08', '07:05')).toBe('2026-10-08T13:05:00.000Z');
        expect(horaCR('2026-10-08T13:05:00Z')).toBe('7:05 a. m.');
        expect(horaCR('2026-10-08T22:30:00Z')).toBe('4:30 p. m.');
    });
});

describe('entrada o salida', () => {
    it('la primera del día es entrada; después se alternan', () => {
        expect(siguienteMarca([])).toBe('entrada');
        expect(siguienteMarca([m('entrada', '2026-10-08', '07:00')])).toBe('salida');
        expect(siguienteMarca([m('entrada', '2026-10-08', '07:00'), m('salida', '2026-10-08', '12:00')])).toBe('entrada');
    });

    it('sabe si está adentro y desde cuándo', () => {
        const e = m('entrada', '2026-10-08', '07:00');
        expect(estadoActual([e])).toEqual({ adentro: true, desde: e.en });
        expect(estadoActual([]).adentro).toBe(false);
    });
});

describe('los tramos de un día', () => {
    it('con almuerzo: dos tramos, se suman', () => {
        const { tramos, avisos } = tramosDelDia([
            m('entrada', '2026-10-08', '07:00'), m('salida', '2026-10-08', '12:00'),
            m('entrada', '2026-10-08', '12:30'), m('salida', '2026-10-08', '16:00')
        ]);
        expect(tramos.map(t => t.minutos)).toEqual([300, 210]);
        expect(avisos).toEqual([]);
    });

    it('si se olvidó la salida, el tramo queda abierto, no se paga y se avisa', () => {
        const { tramos, avisos } = tramosDelDia([m('entrada', '2026-10-08', '07:00')]);
        expect(tramos[0]).toMatchObject({ salida: null, minutos: 0 });
        expect(avisos[0]).toMatch(/Falta la salida/);
    });

    it('una salida sin entrada se avisa', () => {
        expect(tramosDelDia([m('salida', '2026-10-08', '16:00')]).avisos[0]).toMatch(/sin entrada/);
    });
});

describe('la plata del día', () => {
    it('hasta 8 horas a la tarifa normal', () => {
        expect(pagoDelDia(8 * 60, 1500)).toMatchObject({ normales: 8, extra: 0, monto: 12000 });
        expect(pagoDelDia(7.5 * 60, 1500).monto).toBe(11250);
    });

    it('lo que pasa de 8 horas es extra, a tiempo y medio', () => {
        // 9 h a ₡1.500: 8 × 1.500 + 1 × 2.250
        expect(pagoDelDia(9 * 60, 1500)).toMatchObject({ normales: 8, extra: 1, monto: 14250 });
    });

    it('sin tarifa o sin horas, cero', () => {
        expect(pagoDelDia(0, 1500).monto).toBe(0);
        expect(pagoDelDia(60, undefined).monto).toBe(0);
    });
});

describe('la semana', () => {
    it('va de lunes a domingo', () => {
        expect(lunesDe('2026-10-08')).toBe('2026-10-05');   // jueves → lunes 5
        expect(lunesDe('2026-10-11')).toBe('2026-10-05');   // domingo → lunes 5
        expect(diasDeLaSemana('2026-10-05')).toEqual([
            '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'
        ]);
    });

    it('la planilla da el salario de cada persona por día y el total', () => {
        const empleados = [{ id: 'rosa', nombre: 'Rosa', tarifaHora: 1500 }, { id: 'tannia', nombre: 'Tannia', tarifaHora: 1600 }];
        const marcas = [
            m('entrada', '2026-10-06', '07:00'), m('salida', '2026-10-06', '15:00'),
            m('entrada', '2026-10-08', '07:00'), m('salida', '2026-10-08', '11:00'),
            m('entrada', '2026-10-08', '06:00', 'tannia'), m('salida', '2026-10-08', '10:30', 'tannia')
        ];
        const [rosa, tannia] = planillaDe(empleados, marcas, diasDeLaSemana('2026-10-05'));
        expect(rosa.porDia['2026-10-06'].monto).toBe(12000);
        expect(rosa.porDia['2026-10-08'].monto).toBe(6000);
        expect(rosa.porDia['2026-10-07'].monto).toBe(0);
        expect(rosa).toMatchObject({ totalMinutos: 12 * 60, totalMonto: 18000, avisos: 0 });
        expect(tannia.totalMonto).toBe(7200);   // 4,5 h × 1.600
    });
});

describe('el turno de hoy', () => {
    it('si hoy sigue adentro no es un olvido: está en turno', () => {
        const empleados = [{ id: 'rosa', nombre: 'Rosa', tarifaHora: 1500 }];
        const marcas = [m('entrada', '2026-10-07', '07:00'), m('entrada', '2026-10-08', '07:15')];
        const [rosa] = planillaDe(empleados, marcas, ['2026-10-07', '2026-10-08'], '2026-10-08');
        expect(rosa.porDia['2026-10-08']).toMatchObject({ enTurno: momentoCR('2026-10-08', '07:15'), avisos: [] });
        expect(rosa.porDia['2026-10-07'].avisos[0]).toMatch(/Falta la salida/);   // ayer sí es olvido
        expect(rosa.avisos).toBe(1);
    });
});

describe('lo que se ve', () => {
    it('duración e iniciales', () => {
        expect(duracion(455)).toBe('7 h 35 min');
        expect(duracion(480)).toBe('8 h');
        expect(duracion(0)).toBe('—');
        expect(iniciales('Doña Carmen')).toBe('DC');
        expect(iniciales('Rosa')).toBe('R');
    });
});
