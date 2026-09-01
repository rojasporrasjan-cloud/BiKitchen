/**
 * La hoja que Gina imprime sale de acá. Un cliente que no aparezca en el Excel
 * es un pedido que no se empaca, así que eso es lo que más se cuida.
 */

import { describe, it, expect } from 'vitest';
import { construirLibroGina } from '../utils/excelHojaProduccion';

const plato = (numero, proteina, vegetal, carbo) => ({
    numero,
    proteina: { nombre: proteina, gramosPorPorcion: 120 },
    vegetal: { nombre: vegetal, cantidadPorPorcion: 1 },
    carbo: { nombre: carbo, cantidadPorPorcion: 0.5 }
});

const PLATOS = [
    plato(1, 'Albóndigas de res', 'Vegetales mixtos', 'Tortas de yuca'),
    plato(2, 'Pollo teriyaki', 'Vegetales orientales', 'Arroz frito'),
    plato(3, 'Lentejas con cerdo', 'Chayote', 'Arroz blanco'),
    plato(4, 'Estofado de res', 'Zuchinnis', 'Papitas'),
    plato(5, 'Pollo al curry', 'Picadillo mixto', 'Puré de papa')
];

const bloque = (overrides = {}) => ({
    titulo: 'Menú #1 Bajo Calorías',
    porciones: ['120 GRAMOS DE PROTEINA', '1 TAZA(S) DE VEGETALES', '0.5 TAZA(S) DE HARINA'],
    platos: PLATOS,
    llevaCarbo: true,
    totalPlatos: 4,
    clientes: [{ etiqueta: 'Diana Gonzalez (1), Alajuela', notas: 'NO PONER VAINICAS' }],
    ...overrides
});

const datosBase = (overrides = {}) => ({
    etiquetaDia: 'MIERCOLES 26 AGOSTO',
    entregas: [{ cliente: 'Diana Gonzalez', zona: 'Alajuela', paquete: 'Pack Bajo Calorías', cambios: '' }],
    familias: [{ titulo: 'Bajo Calorías', menu1: bloque(), menu2: null }],
    ...overrides
});

/** Todos los textos de una hoja, para preguntar si algo salió o no. */
const textosDe = (ws) => {
    const valores = [];
    ws.eachRow(row => row.eachCell(cell => {
        if (cell.value !== null && cell.value !== undefined) valores.push(String(cell.value));
    }));
    return valores;
};

describe('construirLibroGina', () => {
    it('arma una pestaña de entregas y una por familia', () => {
        const wb = construirLibroGina(datosBase());
        expect(wb.worksheets.map(w => w.name)).toEqual(['MIERCOLES 26 AGOSTO', 'Bajo Calorías']);
    });

    it('respeta el formato de Gina: título naranja, porciones y encabezados', () => {
        const wb = construirLibroGina(datosBase());
        const ws = wb.getWorksheet('Bajo Calorías');

        expect(ws.getCell('A3').value).toBe('Menú #1 Bajo Calorías');
        expect(ws.getCell('A3').fill.fgColor.argb).toBe('FFFFC000');
        expect(ws.getCell('A4').value).toBe('CANTIDAD POR PLATO');
        expect(ws.getCell('C4').value).toBe('120 GRAMOS DE PROTEINA');
        expect(ws.getCell('A7').value).toBe('# de Plato');
        expect(ws.getCell('F7').value).toBe('Cliente');
    });

    it('cada plato ocupa tres filas: proteína, vegetal y carbo', () => {
        const wb = construirLibroGina(datosBase());
        const ws = wb.getWorksheet('Bajo Calorías');

        expect(ws.getCell('A8').value).toBe('Plato 1');
        expect(ws.getCell('B8').value).toBe('Albóndigas de res');
        expect(ws.getCell('B9').value).toBe('Vegetales mixtos');
        expect(ws.getCell('B10').value).toBe('Tortas de yuca');
        expect(ws.getCell('A11').value).toBe('Plato 2');
    });

    it('sin carbos usa dos filas por plato, porque no lleva harina', () => {
        const sinCarbos = bloque({ llevaCarbo: false, porciones: ['120 GRAMOS DE PROTEINA', '2 TAZA(S) DE VEGETALES'] });
        const wb = construirLibroGina(datosBase({
            familias: [{ titulo: 'Sin Carbos', menu1: sinCarbos, menu2: null }]
        }));
        const ws = wb.getWorksheet('Sin Carbos');

        expect(ws.getCell('A8').value).toBe('Plato 1');
        expect(ws.getCell('B9').value).toBe('Vegetales mixtos');
        // El plato 2 arranca una fila antes que en un pack con harina
        expect(ws.getCell('A10').value).toBe('Plato 2');
        expect(textosDe(ws)).not.toContain('Tortas de yuca');
    });

    it('el menú de cena va al lado, en las columnas H-M', () => {
        const wb = construirLibroGina(datosBase({
            familias: [{
                titulo: 'Bajo Calorías',
                menu1: bloque(),
                menu2: bloque({ titulo: 'Menú #2 Bajo Calorías', totalPlatos: 2 })
            }]
        }));
        const ws = wb.getWorksheet('Bajo Calorías');

        expect(ws.getCell('H3').value).toBe('Menú #2 Bajo Calorías');
        expect(ws.getCell('H7').value).toBe('# de Plato');
        expect(ws.getCell('K8').value).toBe(2);
    });

    it('NINGÚN cliente se pierde aunque haya más clientes que filas de platos', () => {
        // 5 platos × 3 filas = 15 filas; con 22 clientes sobran 7
        const clientes = Array.from({ length: 22 }, (_, i) => ({
            etiqueta: `Cliente ${i + 1}`, notas: ''
        }));
        const wb = construirLibroGina(datosBase({
            familias: [{ titulo: 'Bajo Calorías', menu1: bloque({ clientes, totalPlatos: 22 }), menu2: null }]
        }));

        const textos = textosDe(wb.getWorksheet('Bajo Calorías'));
        clientes.forEach(c => expect(textos).toContain(c.etiqueta));
    });

    it('los dos resúmenes arrancan en la misma fila aunque un menú tenga más clientes', () => {
        const muchos = Array.from({ length: 20 }, (_, i) => ({ etiqueta: `Cliente ${i + 1}`, notas: '' }));
        const wb = construirLibroGina(datosBase({
            familias: [{
                titulo: 'Bajo Calorías',
                menu1: bloque({ clientes: muchos, totalPlatos: 20 }),
                menu2: bloque({ titulo: 'Menú #2 Bajo Calorías', totalPlatos: 2 })
            }]
        }));
        const ws = wb.getWorksheet('Bajo Calorías');

        let filaMenu1 = null;
        let filaMenu2 = null;
        ws.eachRow((row, n) => {
            if (row.getCell(2).value === 'Resumen por Menú') filaMenu1 = n;
            if (row.getCell(9).value === 'Resumen por Menú') filaMenu2 = n;
        });

        expect(filaMenu1).not.toBeNull();
        expect(filaMenu1).toBe(filaMenu2);
    });

    it('el resumen multiplica la porción por la cantidad de packs', () => {
        const wb = construirLibroGina(datosBase({
            familias: [{ titulo: 'Bajo Calorías', menu1: bloque({ totalPlatos: 20 }), menu2: null }]
        }));
        const textos = textosDe(wb.getWorksheet('Bajo Calorías'));

        expect(textos).toContain('2400 g');   // 120 g × 20 packs
        expect(textos).toContain('20 tazas'); // 1 taza × 20
        expect(textos).toContain('10 tazas'); // 0.5 taza × 20
    });

    it('limpia los caracteres que Excel prohíbe en el nombre de una pestaña', () => {
        // Sin esto el archivo se genera corrupto y no abre
        const wb = construirLibroGina(datosBase({
            familias: [{ titulo: 'CENAS - Regular/Full [x]', menu1: bloque(), menu2: null }]
        }));
        const nombres = wb.worksheets.map(w => w.name);

        expect(nombres.some(n => /[:\\/?*[\]]/.test(n))).toBe(false);
        expect(nombres.every(n => n.length <= 31)).toBe(true);
    });

    it('no repite el nombre de una pestaña cuando dos familias se llaman igual', () => {
        const wb = construirLibroGina(datosBase({
            familias: [
                { titulo: 'Bajo Calorías', menu1: bloque(), menu2: null },
                { titulo: 'Bajo Calorías', menu1: bloque(), menu2: null }
            ]
        }));
        const nombres = wb.worksheets.map(w => w.name);

        expect(new Set(nombres).size).toBe(nombres.length);
    });

    it('omite Desayunos e Individuales cuando ese día no hay', () => {
        const wb = construirLibroGina(datosBase({
            desayunos: { platos: [], clientes: [], totalPlatos: 0 },
            individuales: []
        }));
        const nombres = wb.worksheets.map(w => w.name);

        expect(nombres).not.toContain('Desayunos');
        expect(nombres).not.toContain('Individuales');
    });

    it('la pestaña de entregas lleva las columnas que ella marca al despachar', () => {
        const wb = construirLibroGina(datosBase({
            entregas: [
                { cliente: 'Diana Gonzalez', zona: 'Alajuela', paquete: 'Pack Bajo Calorías', cambios: 'sin vainicas' },
                { cliente: 'Keylin Nuñes', zona: 'Guacima', paquete: 'Full Pack', cambios: '' }
            ]
        }));
        const ws = wb.getWorksheet('MIERCOLES 26 AGOSTO');

        expect(ws.getCell('B1').value).toBe('Entregas del MIERCOLES 26 AGOSTO');
        expect(ws.getCell('B2').value).toBe('check');
        expect(ws.getCell('C2').value).toBe('Cliente');
        expect(ws.getCell('F2').value).toBe('Cambios');
        expect(ws.getCell('C3').value).toBe('Diana Gonzalez');
        expect(ws.getCell('F3').value).toBe('sin vainicas');
        expect(ws.getCell('C4').value).toBe('Keylin Nuñes');
        expect(textosDe(ws)).toContain('TOTAL: 2 entregas');
    });

    it('los individuales copian el diseño de la hoja impresa', () => {
        // Producto | Cantidad | Cliente, con el nombre en una sola celda verde
        // combinada sobre todas sus filas. Igual que el PDF de empaque.
        const wb = construirLibroGina(datosBase({
            individuales: [{
                cliente: 'Heizel Perez (1), Heredia',
                notas: 'sin cebolla',
                lineas: [
                    { desc: 'Pollo a la naranja', cantidad: '500g' },
                    { desc: 'Arroz jardinero', cantidad: '1 kg' }
                ]
            }]
        }));
        const ws = wb.getWorksheet('Individuales');

        expect(ws.getCell('A1').value).toBe('I N D I V I D U A L E S');
        expect(ws.getCell('A2').value).toBe('Pollo a la naranja');
        expect(ws.getCell('B2').value).toBe('500g');
        expect(ws.getCell('A3').value).toBe('Arroz jardinero');

        // El nombre va una sola vez, combinado sobre las dos filas y en verde
        expect(ws.getCell('C3').isMerged).toBe(true);
        expect(ws.getCell('C3').master.address).toBe('C2');
        expect(ws.getCell('C2').fill.fgColor.argb).toBe('FFE2F0D9');
    });

    it('la nota del cliente va junto a su nombre, no repetida por plato', () => {
        const wb = construirLibroGina(datosBase({
            individuales: [{
                cliente: 'Heizel Perez (1), Heredia',
                notas: 'sin cebolla',
                lineas: [{ desc: 'Pollo a la naranja', cantidad: '500g' }]
            }]
        }));
        const celda = wb.getWorksheet('Individuales').getCell('C2');

        const contenido = celda.value?.richText
            ? celda.value.richText.map(t => t.text).join('')
            : String(celda.value);

        expect(contenido).toContain('Heizel Perez');
        expect(contenido).toContain('sin cebolla');
    });

    it('los desayunos copian la cabecera salmón de la hoja impresa', () => {
        const wb = construirLibroGina(datosBase({
            desayunos: {
                totalPlatos: 9,
                platos: [{ numero: 1, proteina: { nombre: 'Gallo pinto con huevo' } }],
                clientes: [{ etiqueta: 'Sylvia Peña (1), Curridabat', notas: 'sin natilla' }]
            }
        }));
        const ws = wb.getWorksheet('Desayunos');

        expect(String(ws.getCell('A1').value)).toContain('DESAYUNOS');
        expect(ws.getCell('A1').fill.fgColor.argb).toBe('FFF4B084');

        expect(ws.getCell('A2').value).toBe('Plato');
        expect(ws.getCell('E2').value).toBe('Cliente');
        expect(ws.getCell('A2').fill.fgColor.argb).toBe('FFFCE4D6');

        expect(ws.getCell('B3').value).toBe('Gallo pinto con huevo');
        expect(ws.getCell('C3').value).toBe(9);
        expect(ws.getCell('D3').value).toBe('sin natilla');
        expect(ws.getCell('E3').fill.fgColor.argb).toBe('FFE2F0D9');
    });

    it('genera un archivo .xlsx que se puede abrir', async () => {
        const wb = construirLibroGina(datosBase());
        const buffer = await wb.xlsx.writeBuffer();

        expect(buffer.byteLength).toBeGreaterThan(1000);
        // Firma de un ZIP, que es lo que es un .xlsx por dentro
        const bytes = new Uint8Array(buffer);
        expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    });
});
