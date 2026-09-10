/**
 * La pestaña de entregas del Excel de Gina, cuando la hoja cubre dos fechas.
 *
 * El sábado se entrega y del lunes se adelantan los mensuales y quincenales:
 * las dos cosas se empacan el MISMO día. Sin una columna que lo diga, quien
 * empaca no tiene cómo saber qué bolsa sale hoy y cuál se guarda.
 *
 * Y el título salía con el `date` crudo —"Entregas del 2026-09-05,2026-09-07"—
 * porque `new Date()` no entiende dos fechas pegadas con una coma.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { agregarHojasGina } from '../utils/excelHojaProduccion';

const libro = async (etiquetaDia, entregas) => {
    const wb = new ExcelJS.Workbook();
    agregarHojasGina(wb, { etiquetaDia, entregas, familias: [], desayunos: [], individuales: [] });
    return wb;
};

const ENTREGAS = [
    { dia: 'SABADO 5', cliente: 'Luis Lopez', zona: 'San José', paquete: 'Individuales', cambios: '' },
    { dia: 'LUNES 7 (adelanto)', cliente: 'Monserrat Gutiérrez', zona: 'Heredia', paquete: 'Pack Quincenal', cambios: 'Lleva cena' },
    { dia: 'SABADO 5 + LUNES 7 (adelanto)', cliente: 'Dalia Parrales', zona: 'Curridabat', paquete: 'Personalizado', cambios: 'NO CERDO.' }
];

describe('la pestaña de entregas dice de qué día es cada bolsa', () => {
    it('el título se lee, con las dos fechas', async () => {
        const wb = await libro('SABADO 5 + LUNES 7 SEPTIEMBRE', ENTREGAS);
        const ws = wb.worksheets[0];
        expect(String(ws.getRow(1).getCell(2).value))
            .toBe('Entregas del SABADO 5 + LUNES 7 SEPTIEMBRE');
        // Lo que salía antes
        expect(String(ws.getRow(1).getCell(2).value)).not.toMatch(/\d{4}-\d{2}-\d{2},/);
    });

    it('hay una columna Día, antes del cliente', async () => {
        const wb = await libro('SABADO 5 + LUNES 7 SEPTIEMBRE', ENTREGAS);
        const cab = wb.worksheets[0].getRow(2);
        expect(String(cab.getCell(3).value)).toBe('Día');
        expect(String(cab.getCell(4).value)).toBe('Cliente');
        expect(String(cab.getCell(7).value)).toBe('Cambios');
    });

    it('cada cliente trae su día, y el adelanto va marcado', async () => {
        const wb = await libro('SABADO 5 + LUNES 7 SEPTIEMBRE', ENTREGAS);
        const ws = wb.worksheets[0];
        expect(String(ws.getRow(3).getCell(3).value)).toBe('SABADO 5');
        expect(String(ws.getRow(3).getCell(4).value)).toBe('Luis Lopez');
        expect(String(ws.getRow(4).getCell(3).value)).toBe('LUNES 7 (adelanto)');
        expect(String(ws.getRow(4).getCell(4).value)).toBe('Monserrat Gutiérrez');
    });

    it('un cliente que lleva los dos días lo dice', async () => {
        const wb = await libro('SABADO 5 + LUNES 7 SEPTIEMBRE', ENTREGAS);
        expect(String(wb.worksheets[0].getRow(5).getCell(3).value))
            .toBe('SABADO 5 + LUNES 7 (adelanto)');
    });

    it('con un solo día sigue funcionando igual', async () => {
        const wb = await libro('SABADO 5 SEPTIEMBRE', [
            { dia: 'SABADO 5', cliente: 'Patrick Santamaria', zona: 'San Pedro', paquete: 'Proteínas', cambios: '' }
        ]);
        const ws = wb.worksheets[0];
        expect(String(ws.getRow(1).getCell(2).value)).toBe('Entregas del SABADO 5 SEPTIEMBRE');
        expect(String(ws.getRow(3).getCell(4).value)).toBe('Patrick Santamaria');
    });
}, 30000);
