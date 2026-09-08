/**
 * El Excel del empaque que se adelanta.
 *
 * Los mensuales y quincenales del lunes se empacan el sábado, junto con todo
 * lo del sábado. Quien empaca necesita esa lista SOLA: mezclada con la del día
 * se arman bolsas del lunes creyendo que salen hoy.
 *
 * Va agrupado por pack —no por cliente— porque así se arman las estaciones.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { agregarPestanaDeEmpaquePorPack } from '../utils/excelCuatroPestanas';

const GRUPOS = [
    { pack: 'CENAS - PACK BAJO EN CALORÍAS', clientes: [
        { cliente: 'Carolina Laurito', zona: 'Zapote', packs: 3, nota: 'Cambiar lentejas por POLLO AL PESTO.' }
    ]},
    { pack: 'PACK BAJO EN CALORÍAS', clientes: [
        { cliente: 'Daniel Milanes', zona: 'Escazú', packs: 1, nota: 'NO PUEDE COMER MARISCOS.' },
        { cliente: 'Diana Morera', zona: 'Santa Ana', packs: 2, nota: '' }
    ]}
];

const hoja = (grupos) => {
    const wb = new ExcelJS.Workbook();
    agregarPestanaDeEmpaquePorPack(wb, {
        titulo: 'EMPAQUE 2026-09-07 (adelanto)',
        explicacion: 'Solo mensuales y quincenales.',
        grupos
    });
    return wb.worksheets[0];
};

describe('la hoja se arma por pack', () => {
    it('cada pack encabeza su bloque, con la cuenta', () => {
        const ws = hoja(GRUPOS);
        const textos = [];
        ws.eachRow(r => textos.push(String(r.getCell(1).value || '')));
        expect(textos.some(t => t.startsWith('CENAS - PACK BAJO EN CALORÍAS  —  3 packs, 1 cliente'))).toBe(true);
        expect(textos.some(t => t.startsWith('PACK BAJO EN CALORÍAS  —  3 packs, 2 clientes'))).toBe(true);
    });

    it('las columnas son las que ocupa quien empaca', () => {
        const ws = hoja(GRUPOS);
        expect(String(ws.getRow(4).getCell(1).value)).toBe('Cliente');
        expect(String(ws.getRow(4).getCell(2).value)).toBe('Zona');
        expect(String(ws.getRow(4).getCell(3).value)).toBe('Packs');
        expect(String(ws.getRow(4).getCell(4).value)).toBe('Observaciones');
    });

    it('el cliente trae su cantidad y su nota', () => {
        const ws = hoja(GRUPOS);
        expect(String(ws.getRow(5).getCell(1).value)).toBe('Carolina Laurito');
        expect(ws.getRow(5).getCell(3).value).toBe(3);
        expect(String(ws.getRow(5).getCell(4).value)).toMatch(/POLLO AL PESTO/);
    });

    it('cierra con el total de packs', () => {
        const ws = hoja(GRUPOS);
        const valores = [];
        ws.eachRow(r => valores.push([String(r.getCell(2).value || ''), r.getCell(3).value]));
        const total = valores.find(v => v[0] === 'TOTAL DE PACKS');
        expect(total).toBeDefined();
        expect(total[1]).toBe(6);   // 3 + 1 + 2
    });

    it('sin nada que adelantar lo dice, no sale una hoja en blanco', () => {
        const ws = hoja([]);
        expect(String(ws.getCell('A3').value)).toMatch(/No hay nada que empacar por adelantado/);
    });
}, 30000);
