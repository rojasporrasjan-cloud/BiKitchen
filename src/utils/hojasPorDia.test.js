import { describe, it, expect } from 'vitest';
import { hojasPorDia, clientesDelDia, SIN_DIA } from './hojasPorDia';

const FECHAS = ['2026-09-12', '2026-09-14'];
const dias = (c) => c.dias || [];

const sab = { nombre: 'Wendy', dias: ['2026-09-12'] };
const sab2 = { nombre: 'Steven', dias: ['2026-09-12'] };
const lun = { nombre: 'Lynn', dias: ['2026-09-14'] };
const ambos = { nombre: 'Sonia', dias: ['2026-09-12', '2026-09-14'] };
const huerfano = { nombre: 'Nadie sabe', dias: [] };

describe('hojasPorDia', () => {
    it('con una sola fecha no parte nada', () => {
        expect(hojasPorDia([sab, lun], ['2026-09-12'], dias)).toEqual([null]);
        expect(hojasPorDia([sab], [], dias)).toEqual([null]);
    });

    it('con dos fechas saca una tabla por dia', () => {
        expect(hojasPorDia([sab, lun], FECHAS, dias)).toEqual(['2026-09-12', '2026-09-14']);
    });

    it('un dia sin nadie no genera tabla vacia', () => {
        expect(hojasPorDia([sab, sab2], FECHAS, dias)).toEqual(['2026-09-12']);
        expect(hojasPorDia([lun], FECHAS, dias)).toEqual(['2026-09-14']);
    });

    it('respeta el orden de las fechas de la hoja', () => {
        expect(hojasPorDia([lun, sab], FECHAS, dias)).toEqual(['2026-09-12', '2026-09-14']);
    });

    it('si alguien no tiene dia, se le abre su propia tabla al final', () => {
        expect(hojasPorDia([sab, lun, huerfano], FECHAS, dias))
            .toEqual(['2026-09-12', '2026-09-14', SIN_DIA]);
    });

    it('si NADIE tiene dia, mejor una sola tabla con todos que puros huerfanos', () => {
        expect(hojasPorDia([huerfano, { nombre: 'Otro', dias: [] }], FECHAS, dias)).toEqual([null]);
    });

    it('no revienta con nada', () => {
        expect(hojasPorDia(null, FECHAS, dias)).toEqual([null]);
        expect(hojasPorDia([], FECHAS, dias)).toEqual([null]);
        expect(hojasPorDia([sab], FECHAS, null)).toEqual([null]);
    });
});

describe('clientesDelDia', () => {
    const todos = [sab, sab2, lun, ambos, huerfano];

    it('sin dia devuelve a todos, como antes', () => {
        expect(clientesDelDia(todos, null, dias)).toHaveLength(5);
    });

    it('cada dia lleva los suyos', () => {
        expect(clientesDelDia(todos, '2026-09-12', dias).map(c => c.nombre))
            .toEqual(['Wendy', 'Steven', 'Sonia']);
        expect(clientesDelDia(todos, '2026-09-14', dias).map(c => c.nombre))
            .toEqual(['Lynn', 'Sonia']);
    });

    it('el que entrega los dos dias sale en las dos: lleva un pack cada dia', () => {
        expect(clientesDelDia(todos, '2026-09-12', dias).some(c => c.nombre === 'Sonia')).toBe(true);
        expect(clientesDelDia(todos, '2026-09-14', dias).some(c => c.nombre === 'Sonia')).toBe(true);
    });

    it('los huerfanos van a su cajon, no se pierden', () => {
        expect(clientesDelDia(todos, SIN_DIA, dias).map(c => c.nombre)).toEqual(['Nadie sabe']);
    });

    it('NADIE se queda afuera: la suma de las tablas cubre a todos', () => {
        const cajones = hojasPorDia(todos, FECHAS, dias);
        const cubiertos = new Set();
        cajones.forEach(d => clientesDelDia(todos, d, dias).forEach(c => cubiertos.add(c.nombre)));
        expect(cubiertos.size).toBe(todos.length);
    });

    it('no revienta con nada', () => {
        expect(clientesDelDia(null, '2026-09-12', dias)).toEqual([]);
        expect(clientesDelDia(todos, '2026-09-12', null)).toHaveLength(5);
    });
});
