import { describe, it, expect } from 'vitest';
import { proximoSabado, lunesDespuesDe, proximaHornada } from '../utils/fechasDeCocina.js';

/**
 * Se cocina para el SABADO y el LUNES juntos: son los dos dias de entrega de la
 * misma tanda y comparten el menu de la semana.
 */
describe('el sabado de la proxima hornada', () => {
    it('desde un miercoles, es el sabado de esa semana', () => {
        expect(proximoSabado('2026-09-02')).toBe('2026-09-05');   // miercoles
    });

    it('desde el jueves, que es cuando se cocina', () => {
        expect(proximoSabado('2026-09-03')).toBe('2026-09-05');
    });

    it('desde el viernes tambien', () => {
        expect(proximoSabado('2026-09-04')).toBe('2026-09-05');
    });

    it('si hoy ES sabado, es hoy: todavia se esta despachando', () => {
        expect(proximoSabado('2026-09-05')).toBe('2026-09-05');
    });

    it('desde el domingo salta al de la otra semana', () => {
        expect(proximoSabado('2026-09-06')).toBe('2026-09-12');
    });
});

describe('el lunes que le sigue', () => {
    it('son dos dias despues del sabado', () => {
        expect(lunesDespuesDe('2026-09-05')).toBe('2026-09-07');
    });

    it('cruza el cambio de mes sin romperse', () => {
        expect(lunesDespuesDe('2026-10-31')).toBe('2026-11-02');
    });

    it('cruza el cambio de año', () => {
        expect(lunesDespuesDe('2026-12-26')).toBe('2026-12-28');
    });
});

describe('las dos fechas juntas', () => {
    it('desde hoy da sabado 5 y lunes 7', () => {
        expect(proximaHornada('2026-09-02')).toEqual({ sabado: '2026-09-05', lunes: '2026-09-07' });
    });

    it('el lunes SIEMPRE cae en lunes', () => {
        // Un error de un dia aca manda a cocinar para el dia equivocado.
        ['2026-09-02', '2026-09-06', '2026-10-31', '2027-01-01'].forEach(hoy => {
            const { lunes } = proximaHornada(hoy);
            expect(new Date(`${lunes}T12:00:00`).getDay()).toBe(1);
        });
    });

    it('y el sabado SIEMPRE en sabado', () => {
        ['2026-09-02', '2026-09-06', '2026-10-31', '2027-01-01'].forEach(hoy => {
            const { sabado } = proximaHornada(hoy);
            expect(new Date(`${sabado}T12:00:00`).getDay()).toBe(6);
        });
    });
});
