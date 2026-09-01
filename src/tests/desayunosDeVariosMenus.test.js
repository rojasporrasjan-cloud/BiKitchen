import { describe, it, expect } from 'vitest';
import { construirLibroGina } from '../utils/excelHojaProduccion.js';

/**
 * El mismo dia puede haber MAS DE UN menu de desayunos: quien lleva el de la
 * semana y quien lleva el de otra. A Fatima Arauz se le repusieron los del menu
 * del 25 al 31 de agosto.
 *
 * La pestana escribia los platos del PRIMER menu y pegaba debajo los clientes
 * de TODOS, asi que el nombre de Fatima salia al lado de cinco desayunos que no
 * son los suyos. Quien empaca le habria puesto los equivocados.
 */
const base = (desayunos) => ({
    etiquetaDia: 'MIERCOLES 02 SETIEMBRE',
    entregas: [],
    familias: [],
    individuales: [],
    desayunos
});

const bloque = (titulo, plato, cliente, total) => ({
    titulo,
    totalPlatos: total,
    platos: [{ numero: 1, proteina: { nombre: plato } }],
    clientes: [{ etiqueta: cliente, notas: '' }]
});

describe('dos menus de desayunos el mismo dia', () => {

    const wb = construirLibroGina(base([
        bloque('', 'Gallo pinto con huevos resueltos', 'Angelo Oviedo (1)', 3),
        bloque('PERSONALIZADO — DESAYUNOS Fátima Arauz', 'Flautas con queso en salsa roja', 'Fátima Arauz Reyes', 1)
    ]));
    const ws = wb.getWorksheet('Desayunos');

    const textoDe = (celda) => String(ws.getCell(celda).value ?? '');

    it('el primer menu conserva su lugar de siempre', () => {
        expect(textoDe('A1')).toContain('DESAYUNOS');
        expect(textoDe('A2')).toBe('Plato');
        expect(textoDe('B3')).toBe('Gallo pinto con huevos resueltos');
        expect(ws.getCell('C3').value).toBe(3);
        expect(textoDe('E3')).toBe('Angelo Oviedo (1)');
    });

    it('el segundo menu va aparte, con su propio titulo y sus propios platos', () => {
        expect(textoDe('A5')).toContain('Fátima Arauz');
        expect(textoDe('A6')).toBe('Plato');
        expect(textoDe('B7')).toBe('Flautas con queso en salsa roja');
        expect(ws.getCell('C7').value).toBe(1);
        expect(textoDe('E7')).toBe('Fátima Arauz Reyes');
    });

    it('el nombre de un cliente no queda junto a los desayunos del otro', () => {
        // El bug: Fatima aparecia en la fila del gallo pinto de Angelo.
        expect(textoDe('E3')).not.toContain('Fátima');
        expect(textoDe('B7')).not.toContain('Gallo pinto');
    });

    it('un solo menu sigue funcionando como antes, sin envolverlo en lista', () => {
        const uno = construirLibroGina(base({
            totalPlatos: 9,
            platos: [{ numero: 1, proteina: { nombre: 'Gallo pinto con huevo' } }],
            clientes: [{ etiqueta: 'Sylvia Peña (1)', notas: 'sin natilla' }]
        }));
        const w = uno.getWorksheet('Desayunos');
        expect(String(w.getCell('B3').value)).toBe('Gallo pinto con huevo');
        expect(w.getCell('C3').value).toBe(9);
    });
});
