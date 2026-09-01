import { describe, it, expect } from 'vitest';
import { construirLibroGina } from '../utils/excelHojaProduccion.js';

/**
 * Gina reparte las hojas IMPRESAS. Un menu partido a la mitad no le sirve a
 * nadie, asi que esos van enteros en una pagina.
 *
 * Pero forzar a una pagina TODA pestana es peor: la de Individuales lleva una
 * fila por producto de cada cliente —hoy pasan de sesenta— y saldria con letra
 * ilegible. Esas se parten solas y repiten los titulos arriba de cada hoja.
 */
const plato = (n) => ({ numero: n, proteina: { nombre: `Plato ${n}`, gramosPorPorcion: 120 },
                        vegetal: { nombre: 'Vegetales', cantidadPorPorcion: 1 },
                        carbo: { nombre: 'Arroz', cantidadPorPorcion: 0.5 } });

const wb = construirLibroGina({
    etiquetaDia: 'MIERCOLES 02 SETIEMBRE',
    entregas: [{ cliente: 'Ana', zona: 'Escazú', pack: 'Bajo Calorías' }],
    familias: [{
        titulo: 'Pack Bajo Calorías',
        menu1: { titulo: 'Menú #1', porciones: ['120 GRAMOS DE PROTEINA'], llevaCarbo: true,
                 platos: [plato(1), plato(2)], totalPlatos: 3,
                 clientes: [{ etiqueta: 'Ana (1)', notas: '' }] },
        menu2: null
    }],
    desayunos: [{ totalPlatos: 3, platos: [plato(1)], clientes: [{ etiqueta: 'Ana', notas: '' }] }],
    individuales: [{ cliente: 'Ana', lineas: [{ desc: 'Pollo', cantidad: '250g' }] }]
});

const setup = (nombre) => wb.getWorksheet(nombre).pageSetup;

describe('como sale impreso el Excel', () => {

    it('el menu de una familia entra ENTERO en una hoja', () => {
        expect(setup('Pack Bajo Calorías').fitToHeight).toBe(1);
        expect(setup('Pack Bajo Calorías').fitToWidth).toBe(1);
    });

    it('la lista de entregas NO se aplasta: crece con los pedidos del dia', () => {
        expect(setup('MIERCOLES 02 SETIEMBRE').fitToHeight).toBe(0);
        expect(setup('MIERCOLES 02 SETIEMBRE').printTitlesRow).toBe('1:2');
    });

    it('Individuales NO se aplasta: se parte en las hojas que haga falta', () => {
        expect(setup('Individuales').fitToHeight).toBe(0);
        expect(setup('Individuales').fitToWidth).toBe(1);
    });

    it('y repite los titulos de columna arriba de cada hoja', () => {
        expect(setup('Individuales').printTitlesRow).toBe('1:2');
    });

    it('Desayunos tampoco: cada menu ya arranca en su propia pagina', () => {
        expect(setup('Desayunos').fitToHeight).toBe(0);
    });

    it('todas salen apaisadas, centradas y con margenes angostos', () => {
        ['Pack Bajo Calorías', 'MIERCOLES 02 SETIEMBRE', 'Individuales', 'Desayunos'].forEach(n => {
            const s = setup(n);
            expect(s.orientation).toBe('landscape');
            expect(s.fitToPage).toBe(true);
            expect(s.horizontalCentered).toBe(true);
            expect(s.margins.left).toBe(0.3);
        });
    });
});
