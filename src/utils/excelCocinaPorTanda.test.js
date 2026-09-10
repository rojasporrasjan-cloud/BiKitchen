import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { agregarPestanaDeCocina } from './excelCuatroPestanas';

/**
 * La pestaña de cocina tiene que salir EN EL MISMO ORDEN que la pantalla.
 *
 * Antes ordenaba por unidad —gramos, tazas, unidades— de mayor a menor, y la
 * pantalla por tanda. Eran dos hojas distintas de la misma cosa: en la pantalla
 * la cocina lee "TANDA 1a, empezar por acá" y en el papel le llegaba una lista
 * plana donde el orden de cocción no existía.
 */
const RENGLONES = [
    { tipo: 'tanda', texto: 'TANDA 1a — PACK BAJO EN CALORÍAS · MENÚ 1 · 43 packs', aviso: '' },
    { name: 'Carne de res en salsa criolla', unit: 'g', pide: 9828, hecho: 0, falta: 9828, cocinera: 'FERNANDA', nota: '' },
    { name: 'Chayotes salteados al ajillo', unit: 'taza(s)', pide: 88, hecho: 0, falta: 88, cocinera: 'DOÑA CARMEN', nota: '' },
    { tipo: 'grupo', texto: 'ARROZ — cocinar todo junto y dividir en los 2 de abajo · 135 taza(s)' },
    { name: 'Arroz blanco', unit: 'taza(s)', pide: 77, hecho: 0, falta: 77, cocinera: 'DOÑA CARMEN', nota: '', hijo: true },
    { name: 'Arroz al cilantro', unit: 'taza(s)', pide: 28, hecho: 0, falta: 28, cocinera: 'DOÑA CARMEN', nota: '', hijo: true },
    { tipo: 'tanda', texto: 'TANDA 1b — PACK BAJO EN CALORÍAS · MENÚ 2 (cenas) · 43 packs', aviso: '' },
    { name: 'Fajitas de res en salsa gravy', unit: 'g', pide: 2743, hecho: 0, falta: 2743, cocinera: 'FERNANDA', nota: '' },
    { tipo: 'tanda', texto: 'TANDA 5a — FULL PACK · MENÚ 1 · 6 packs',
      aviso: 'No hay tanda 4: las ollas de PACK REGULAR ya salieron arriba, se comparten con una familia más grande.' }
];

const leer = (ws) => {
    const filas = [];
    ws.eachRow((row) => {
        filas.push([1, 2, 3, 4].map(i => {
            const v = row.getCell(i).value;
            return v === null || v === undefined ? '' : String(v);
        }));
    });
    return filas;
};

describe('pestaña de cocina en orden de tanda', () => {
    it('respeta el orden que le dan, sin reordenar por unidad', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: '1 COCINA JUEVES', explicacion: 'prueba', renglones: RENGLONES
        });
        const filas = leer(ws);
        const primeraCol = filas.map(f => f[0]);

        // Los gramos NO se agrupan aparte: la carne va primero porque asi vino
        const iCarne = primeraCol.findIndex(x => /Carne de res/.test(x));
        const iChayotes = primeraCol.findIndex(x => /Chayotes/.test(x));
        const iFajitas = primeraCol.findIndex(x => /Fajitas de res/.test(x));
        expect(iCarne).toBeLessThan(iChayotes);
        expect(iChayotes).toBeLessThan(iFajitas);
    });

    it('dibuja las cabeceras de tanda', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: '1 COCINA JUEVES', explicacion: 'prueba', renglones: RENGLONES
        });
        const texto = leer(ws).map(f => f[0]).join('\n');
        expect(texto).toContain('TANDA 1a — PACK BAJO EN CALORÍAS · MENÚ 1 · 43 packs');
        expect(texto).toContain('TANDA 1b — PACK BAJO EN CALORÍAS · MENÚ 2 (cenas) · 43 packs');
        expect(texto).toContain('TANDA 5a — FULL PACK · MENÚ 1 · 6 packs');
    });

    it('el aviso de la tanda saltada viaja con su cabecera', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: '1 COCINA JUEVES', explicacion: 'prueba', renglones: RENGLONES
        });
        const texto = leer(ws).map(f => f[0]).join('\n');
        expect(texto).toContain('No hay tanda 4');
    });

    it('la olla de arroz sale con sus arroces debajo, con sangria', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: '1 COCINA JUEVES', explicacion: 'prueba', renglones: RENGLONES
        });
        const col = leer(ws).map(f => f[0]);
        const iOlla = col.findIndex(x => /cocinar todo junto/.test(x));
        expect(iOlla).toBeGreaterThan(-1);
        expect(col[iOlla + 1]).toContain('└');
        expect(col[iOlla + 1]).toContain('Arroz blanco');
        expect(col[iOlla + 2]).toContain('Arroz al cilantro');
    });

    it('la cabecera ocupa la fila entera, combinada de lado a lado', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: '1 COCINA JUEVES', explicacion: 'prueba', renglones: RENGLONES
        });
        // Una celda combinada se lee IGUAL en todo su rango: si la columna de
        // al lado repite el titulo, es que la fila va de lado a lado y no que
        // el titulo se colo en la columna de la cocinera.
        const fila = leer(ws).find(f => /TANDA 1a/.test(f[0]));
        expect(fila[1]).toBe(fila[0]);
        expect(fila[3]).toBe(fila[0]);
        // Y una fila normal SI trae cada dato en su columna
        const carne = leer(ws).find(f => /Carne de res/.test(f[0]));
        expect(carne[1]).toBe('FERNANDA');
        expect(carne[1]).not.toBe(carne[0]);
    });

    it('sigue funcionando la pestaña con descuento', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: '4 FALTA COCINAR', explicacion: 'prueba', conDescuento: true,
            renglones: [
                { tipo: 'tanda', texto: 'TANDA 1a — PACK BAJO EN CALORÍAS · MENÚ 1 · 43 packs', aviso: '' },
                { name: 'Carne de res', unit: 'g', pide: 9828, hecho: 3000, falta: 6828, cocinera: 'FERNANDA', nota: '' }
            ]
        });
        const filas = leer(ws);
        expect(filas.map(f => f[0]).join('\n')).toContain('TANDA 1a');
        const carne = filas.find(f => /Carne de res/.test(f[0]));
        expect(carne).toBeTruthy();
    });

    it('no revienta sin renglones', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, { titulo: 'vacia', explicacion: '-', renglones: [] });
        expect(leer(ws).map(f => f[0]).join(' ')).toContain('No hay nada que cocinar');
    });
});
