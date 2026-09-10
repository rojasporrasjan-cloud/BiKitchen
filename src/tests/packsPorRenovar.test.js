import { describe, it, expect } from 'vitest';
import {
    packsPorRenovar, cuerdaQueLeQueda, diasDeAqui, comoSeLee
} from '../utils/packsPorRenovar';

/**
 * Los casos son los packs reales del miercoles 9 de setiembre de 2026.
 *
 * Kendall Barboza tenia su ULTIMA entrega al dia siguiente y nadie lo sabia:
 * la pantalla lo mostraba igual que a Hazel, que tenia tres semanas por
 * delante.
 */

const HOY = '2026-09-08';

const sub = (cliente, fechas, completadas = 0, finalizado = false) => ({
    order: { cliente },
    progress: { fechas, total: fechas.length, completadas, finalizado }
});

describe('cuantos dias faltan', () => {
    it('cuenta bien hacia adelante y hacia atras', () => {
        expect(diasDeAqui('2026-09-09', HOY)).toBe(1);
        expect(diasDeAqui('2026-09-08', HOY)).toBe(0);
        expect(diasDeAqui('2026-09-01', HOY)).toBe(-7);
    });

    it('con una fecha inservible no revienta', () => {
        expect(diasDeAqui(null, HOY)).toBe(null);
        expect(diasDeAqui('no es fecha', HOY)).toBe(null);
    });
});

describe('la cuerda que le queda a un pack', () => {
    it('la ultima entrega es la mas lejana, no la primera', () => {
        const c = cuerdaQueLeQueda(
            { fechas: ['2026-09-23', '2026-09-09', '2026-09-16'], total: 3, completadas: 1 },
            HOY
        );
        expect(c.ultima).toBe('2026-09-23');
        expect(c.leQuedan).toBe(2);
    });
});

describe('a quien hay que escribirle', () => {
    it('agarra a Kendall: su ultima es mañana', () => {
        const r = packsPorRenovar([sub('Kendall Barboza', ['2026-09-02', '2026-09-09'], 1)], HOY);
        expect(r).toHaveLength(1);
        expect(comoSeLee(r[0].cuerda)).toMatch(/MAÑANA/);
    });

    it('NO molesta con Hazel, que tiene cuerda hasta fin de mes', () => {
        expect(packsPorRenovar(
            [sub('Hazel Jimenez', ['2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30'])],
            HOY
        )).toEqual([]);
    });

    it('agarra al que compro pocas semanas aunque la fecha este lejos', () => {
        // Le queda UNA sola entrega: se acaba igual, aunque sea en un mes
        const r = packsPorRenovar([sub('Ana Solis', ['2026-09-15', '2026-10-20'], 1)], HOY);
        expect(r).toHaveLength(1);
    });

    it('el que ya termino no aparece: ese es otro problema', () => {
        expect(packsPorRenovar(
            [sub('Ya Termino', ['2026-08-01', '2026-08-08'], 2, true)],
            HOY
        )).toEqual([]);
    });

    it('el mas urgente va primero', () => {
        const r = packsPorRenovar([
            sub('Zulema', ['2026-09-02', '2026-09-16'], 1),
            sub('Kendall', ['2026-09-02', '2026-09-09'], 1)
        ], HOY);
        expect(r.map(x => x.order.cliente)).toEqual(['Kendall', 'Zulema']);
    });

    it('los tres reales del miercoles 9 salen, y Hazel no', () => {
        const r = packsPorRenovar([
            sub('Kendall Barboza', ['2026-09-02', '2026-09-09'], 1),
            sub('Zulema Esquivel', ['2026-09-02', '2026-09-16'], 1),
            sub('edwin perez alvarado', ['2026-09-02', '2026-09-16'], 1),
            sub('Hazel Jimenez', ['2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30'])
        ], HOY);
        expect(r.map(x => x.order.cliente))
            .toEqual(['Kendall Barboza', 'Zulema Esquivel', 'edwin perez alvarado']);
    });

    it('sin datos devuelve una lista vacia, no un error', () => {
        expect(packsPorRenovar()).toEqual([]);
        expect(packsPorRenovar(null, HOY)).toEqual([]);
        expect(packsPorRenovar([{}], HOY)).toEqual([]);
    });
});

describe('como se lee en la pantalla', () => {
    it('dice HOY, MAÑANA o los dias que faltan', () => {
        expect(comoSeLee({ diasParaLaUltima: 0 })).toMatch(/HOY/);
        expect(comoSeLee({ diasParaLaUltima: 1 })).toMatch(/MAÑANA/);
        expect(comoSeLee({ diasParaLaUltima: 5 })).toMatch(/en 5 dias/);
        expect(comoSeLee({ diasParaLaUltima: -3 })).toMatch(/hace 3 dias/);
        expect(comoSeLee({})).toMatch(/Sin fecha/);
    });
});
