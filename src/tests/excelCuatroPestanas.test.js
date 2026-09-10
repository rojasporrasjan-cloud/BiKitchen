/**
 * El Excel de cuatro pestañas que se le da a Gina.
 *
 * Lo que más importa acá no es el formato sino que NO se confunda "lo que pide
 * el día" con "lo que falta cocinar". Si Gina lee el número equivocado, cocina
 * de más o de menos y no se ve hasta el sábado.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
    agregarPestanaDeCocina,
    agregarPestanaDeAvisos,
    cantidadLegible,
    nombreDePestana,
    grupoDeUnidad,
    agregarPestanaDeEmpaque
} from '../utils/excelCuatroPestanas';

const renglon = (extra = {}) => ({
    name: 'Carne mechada', unit: 'g',
    pide: 5000, hecho: 0, falta: 5000,
    cocinera: 'FERNANDA', empacaCocina: false, nota: '',
    ...extra
});

describe('cantidadLegible', () => {
    it('pasa a kilos cuando se pasa de mil gramos', () => {
        expect(cantidadLegible(3240, 'g')).toBe('3,24 kg');
        expect(cantidadLegible(540, 'g')).toBe('540 g');
    });

    it('las tazas se redondean a un decimal', () => {
        expect(cantidadLegible(12.53, 'taza(s)')).toBe('12,5 tazas');
        expect(cantidadLegible(1, 'taza(s)')).toBe('1 taza');
    });

    it('cero no rompe', () => {
        expect(cantidadLegible(0, 'g')).toBe('0 g');
        expect(cantidadLegible(null, 'g')).toBe('0 g');
    });
});

describe('nombreDePestana', () => {
    it('quita los caracteres que impiden abrir el archivo', () => {
        // Excel no abre el libro si el nombre trae : \ / ? * [ ]
        expect(nombreDePestana('1 · sábado 5/9 [completo]')).not.toMatch(/[:\\/?*[\]]/);
    });

    it('corta a 31 caracteres, que es el máximo de Excel', () => {
        expect(nombreDePestana('x'.repeat(60)).length).toBe(31);
    });

    it('un nombre vacío no deja la pestaña sin nombre', () => {
        expect(nombreDePestana('')).toBe('Hoja');
    });
});

describe('agregarPestanaDeCocina', () => {

    it('sin descuento muestra la cantidad del día, sin columnas de más', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Sabado completo',
            explicacion: 'Todo lo del dia',
            renglones: [renglon()]
        });

        expect(ws.getRow(3).getCell(3).value).toBe('Cantidad a cocinar');
        expect(ws.getRow(3).getCell(5).value).toBeFalsy();
        // Los platos arrancan en la fila 4: ya no hay cabecera de unidad
        // encima. El orden lo manda quien arma los renglones, por TANDA.
        expect(ws.getRow(4).getCell(1).value).toBe('Carne mechada');
        expect(ws.getRow(4).getCell(3).value).toBe('5 kg');
    });

    it('con descuento separa lo que pide de lo que falta', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Sabado falta',
            explicacion: 'Menos lo cocinado',
            renglones: [renglon({ pide: 5000, hecho: 3000, falta: 2000 })],
            conDescuento: true
        });

        expect(ws.getRow(3).getCell(3).value).toBe('Pide el día');
        expect(ws.getRow(3).getCell(4).value).toBe('Ya cocinado');
        expect(ws.getRow(3).getCell(5).value).toBe('FALTA COCINAR');

        const fila = ws.getRow(4);
        expect(fila.getCell(3).value).toBe('5 kg');
        expect(fila.getCell(4).value).toBe('3 kg');
        expect(fila.getCell(5).value).toBe('2 kg');
    });

    it('lo que ya está hecho se marca en verde', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Ya hecho', explicacion: '',
            renglones: [renglon({ pide: 5000, hecho: 5000, falta: 0 })],
            conDescuento: true
        });
        expect(ws.getRow(4).getCell(5).fill?.fgColor?.argb).toBe('FFE2F0D9');
    });

    // El orden ya NO lo pone esta pestana.
    //
    // Antes ordenaba por unidad —gramos, tazas, unidades— de mayor a menor, y
    // la pantalla ordenaba por TANDA. Eran dos hojas distintas de la misma
    // cosa: quien cocina leia el orden de coccion en la pantalla y una lista
    // plana en el papel. Ahora las dos salen del mismo pipeline y esta pestana
    // solo dibuja lo que le dan, en el orden en que se lo dan.
    it('respeta el orden que le dan, sin reordenar por unidad ni por cantidad', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Orden', explicacion: '',
            renglones: [
                renglon({ name: 'Poco pedido', pide: 1000 }),
                renglon({ name: 'Vegetales mixtos', unit: 'taza(s)', pide: 60 }),
                renglon({ name: 'La olla grande', pide: 9000 })
            ]
        });

        expect(ws.getRow(4).getCell(1).value).toBe('Poco pedido');
        expect(ws.getRow(5).getCell(1).value).toBe('Vegetales mixtos');
        expect(ws.getRow(6).getCell(1).value).toBe('La olla grande');
    });

    it('con descuento tampoco reordena', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Falta', explicacion: '',
            renglones: [
                renglon({ name: 'Pide mucho pero ya esta', pide: 9000, hecho: 8500, falta: 500 }),
                renglon({ name: 'Pide menos pero falta todo', pide: 3000, hecho: 0, falta: 3000 })
            ],
            conDescuento: true
        });

        expect(ws.getRow(4).getCell(1).value).toBe('Pide mucho pero ya esta');
        expect(ws.getRow(5).getCell(1).value).toBe('Pide menos pero falta todo');
    });

    it('las cabeceras de tanda se dibujan de lado a lado', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Tandas', explicacion: '',
            renglones: [
                { tipo: 'tanda', texto: 'TANDA 1a — PACK BAJO EN CALORÍAS · MENÚ 1 · 43 packs', aviso: '' },
                renglon({ name: 'Carne mechada' })
            ]
        });
        expect(String(ws.getRow(4).getCell(1).value)).toMatch(/TANDA 1a/);
        expect(ws.getRow(5).getCell(1).value).toBe('Carne mechada');
    });

    it('la cocinera queda como columna, visible en cada renglon', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Reparto', explicacion: '',
            renglones: [renglon({ cocinera: 'FERNANDA' })]
        });
        expect(ws.getRow(4).getCell(2).value).toBe('FERNANDA');
    });

    it('una pestaña vacía lo dice, no sale en blanco', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeCocina(wb, {
            titulo: 'Sin nada', explicacion: '', renglones: []
        });
        expect(String(ws.getRow(4).getCell(1).value)).toMatch(/No hay nada que cocinar/);
    });

    it('el libro se puede escribir de verdad', async () => {
        const wb = new ExcelJS.Workbook();
        ['Uno', 'Dos', 'Tres', 'Cuatro'].forEach(t =>
            agregarPestanaDeCocina(wb, { titulo: t, explicacion: '', renglones: [renglon()] }));

        const buffer = await wb.xlsx.writeBuffer();
        expect(buffer.byteLength).toBeGreaterThan(0);
        expect(wb.worksheets).toHaveLength(4);
    });
});

describe('agregarPestanaDeAvisos', () => {

    it('lista lo que no se pudo descontar y las notas', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeAvisos(wb, {
            sinConvertir: [{ nombre: 'Lasagna de pollo', texto: '40 porciones' }],
            notas: ['Dejar tilapia por si hay que hacer empanizada'],
            descontados: [{ nombre: 'Carne mechada', cantidad: 5000, unidad: 'g' }]
        });

        const texto = [];
        ws.eachRow(f => f.eachCell(c => texto.push(String(c.value))));
        const todo = texto.join(' | ');

        expect(todo).toMatch(/Lasagna de pollo/);
        expect(todo).toMatch(/40 porciones/);
        expect(todo).toMatch(/Dejar tilapia/);
        expect(todo).toMatch(/5 kg/);
    });

    it('sin adelanto cargado no rompe', () => {
        const wb = new ExcelJS.Workbook();
        expect(() => agregarPestanaDeAvisos(wb, null)).not.toThrow();
    });
});

describe('grupoDeUnidad', () => {
    it('el peso y las tazas son grupos distintos', () => {
        expect(grupoDeUnidad('g')).toMatch(/PROTEINAS/);
        expect(grupoDeUnidad('kg')).toMatch(/PROTEINAS/);
        expect(grupoDeUnidad('taza(s)')).toMatch(/VEGETALES/);
        expect(grupoDeUnidad('unidades')).toMatch(/OTROS/);
    });
});

describe('agregarPestanaDeEmpaque', () => {

    const cliente = (extra = {}) => ({
        cliente: 'Ana Rojas', zona: 'Escazú', paquete: 'Pack Bajo Calorías',
        cantidad: 1, entregas: 1, observaciones: '', ...extra
    });

    it('pone una fila por cliente, ordenadas por nombre', () => {
        // Quien empaca busca un nombre, no el plato más grande
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeEmpaque(wb, {
            titulo: 'Empaque sabado', explicacion: '',
            clientes: [cliente({ cliente: 'Zulay Mora' }), cliente({ cliente: 'Ana Rojas' })]
        });

        expect(ws.getRow(4).getCell(1).value).toBe('Ana Rojas');
        expect(ws.getRow(5).getCell(1).value).toBe('Zulay Mora');
    });

    it('marca los de más de una entrega: son los adelantables', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeEmpaque(wb, {
            titulo: 'Mensuales', explicacion: '',
            clientes: [cliente({ entregas: 4 })]
        });

        expect(ws.getRow(4).getCell(5).value).toBe('4 entregas');
        expect(ws.getRow(4).getCell(5).fill?.fgColor?.argb).toBe('FFE2F0D9');
    });

    it('resalta al que tiene un cambio', () => {
        // Una observación es algo que hay que respetar al empacar
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeEmpaque(wb, {
            titulo: 'Con cambios', explicacion: '',
            clientes: [cliente({ observaciones: 'SIN CERDO' })]
        });

        expect(ws.getRow(4).getCell(6).value).toBe('SIN CERDO');
        expect(ws.getRow(4).getCell(6).fill).toBeTruthy();
    });

    it('suma el total de packs para cuadrar contra las etiquetas', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeEmpaque(wb, {
            titulo: 'Total', explicacion: '',
            clientes: [cliente({ cantidad: 2 }), cliente({ cliente: 'Beto', cantidad: 3 })]
        });

        const textos = [];
        ws.eachRow(f => f.eachCell(c => textos.push(String(c.value))));
        expect(textos).toContain('TOTAL DE PACKS');
        expect(textos).toContain('5');
    });

    it('una pestaña vacía lo dice', () => {
        const wb = new ExcelJS.Workbook();
        const ws = agregarPestanaDeEmpaque(wb, { titulo: 'Vacia', explicacion: '', clientes: [] });
        expect(String(ws.getRow(4).getCell(1).value)).toMatch(/No hay nada que empacar/);
    });
});

/**
 * Desde que las tres exportaciones escriben en UN solo archivo, dos pueden
 * querer el mismo nombre de pestaña. ExcelJS no lo perdona: tira una excepción
 * y no sale ningún archivo — justo cuando hay que mandarle la hoja a la cocina.
 */
describe('dos pestañas no se pueden llamar igual', () => {
    it('la segunda recibe un sufijo', async () => {
        const { nombreLibre } = await import('../utils/excelCuatroPestanas');
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();

        expect(nombreLibre(wb, 'Hoja Cocina')).toBe('Hoja Cocina');
        wb.addWorksheet('Hoja Cocina');
        expect(nombreLibre(wb, 'Hoja Cocina')).toBe('Hoja Cocina (2)');
        wb.addWorksheet('Hoja Cocina (2)');
        expect(nombreLibre(wb, 'Hoja Cocina')).toBe('Hoja Cocina (3)');
    });

    it('el sufijo cabe en los 31 caracteres que admite Excel', async () => {
        const { nombreLibre } = await import('../utils/excelCuatroPestanas');
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        const largo = 'EMPAQUE SABADO 5 SEPTIEMBRE ADELANTO';

        const primero = nombreLibre(wb, largo);
        wb.addWorksheet(primero);
        const segundo = nombreLibre(wb, largo);

        expect(segundo.length).toBeLessThanOrEqual(31);
        expect(segundo).not.toBe(primero);
    });

    it('las tres exportaciones caben en un mismo libro', async () => {
        const { agregarPestanaDeCocina, agregarPestanaDeEmpaquePorPack } =
            await import('../utils/excelCuatroPestanas');
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();

        // El mismo título dos veces: antes reventaba acá.
        agregarPestanaDeCocina(wb, { titulo: 'COCINA', explicacion: 'x', renglones: [] });
        agregarPestanaDeCocina(wb, { titulo: 'COCINA', explicacion: 'y', renglones: [] });
        agregarPestanaDeEmpaquePorPack(wb, { titulo: 'COCINA', explicacion: 'z', grupos: [] });

        expect(wb.worksheets).toHaveLength(3);
        expect(new Set(wb.worksheets.map(w => w.name)).size).toBe(3);
    });
}, 30000);
