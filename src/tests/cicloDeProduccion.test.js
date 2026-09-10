import { describe, it, expect } from 'vitest';
import { cicloDeProduccion, pedidosDeLaTanda, acumularEnviados } from '../utils/tandasDeCocina';

/**
 * Las tres hojas del mismo ciclo tienen que compartir memoria.
 *
 * "Si ellos adelantaron la cocinada el jueves, el viernes se tiene que
 * descontar esa comida que hicieron, pero siempre hay que sumar los sabados y
 * lunes" — Jan, 7 de setiembre de 2026.
 *
 * Antes la llave se armaba con la URL, asi que la hoja del jueves
 * (`date=12,14&soloPacks=bajoCalorias`), la del viernes (`date=12,14`) y la del
 * sabado (`date=14`) generaban TRES llaves distintas y ninguna veia a las
 * otras: el viernes se le volvia a pedir a la cocina todo lo del jueves.
 */
describe('cicloDeProduccion', () => {
    it('el sabado y el lunes siguiente son el MISMO ciclo', () => {
        // sabado 12 de setiembre de 2026 -> lunes 14
        expect(cicloDeProduccion(['2026-09-12'])).toBe('2026-09-12_2026-09-14');
        expect(cicloDeProduccion(['2026-09-12', '2026-09-14'])).toBe('2026-09-12_2026-09-14');
    });

    it('abrir solo el lunes cae en el ciclo de su sabado', () => {
        expect(cicloDeProduccion(['2026-09-14'])).toBe('2026-09-12_2026-09-14');
    });

    it('las tres hojas del ciclo dan la misma llave', () => {
        const jueves = cicloDeProduccion(['2026-09-12', '2026-09-14']);
        const viernes = cicloDeProduccion(['2026-09-12', '2026-09-14']);
        const sabado = cicloDeProduccion(['2026-09-14']);
        expect(new Set([jueves, viernes, sabado]).size).toBe(1);
    });

    it('el miercoles es su propio ciclo, no se junta con nada', () => {
        expect(cicloDeProduccion(['2026-09-09'])).toBe('2026-09-09');
        expect(cicloDeProduccion(['2026-09-16'])).toBe('2026-09-16');
    });

    it('no se corre de dia por la zona horaria de Costa Rica', () => {
        // Con toISOString un 12 a medianoche local se volvia 12 o 13 segun el mes
        expect(cicloDeProduccion(['2026-01-03'])).toBe('2026-01-03_2026-01-05'); // sabado
        expect(cicloDeProduccion(['2026-12-05'])).toBe('2026-12-05_2026-12-07'); // sabado
    });

    it('la llave que ya estaba guardada del ciclo pasado sigue calzando', () => {
        // La tanda del 4 de setiembre quedo guardada como "2026-09-05_2026-09-07"
        expect(cicloDeProduccion(['2026-09-05', '2026-09-07'])).toBe('2026-09-05_2026-09-07');
    });

    it('sin fechas devuelve vacio y no revienta', () => {
        expect(cicloDeProduccion([])).toBe('');
        expect(cicloDeProduccion(null)).toBe('');
    });
});

describe('lo del jueves no se le vuelve a pedir a la cocina el viernes', () => {
    const calendario = (p) => p.fechasEntrega;
    const sabado = { numeroOrden: 'A', fechasEntrega: ['2026-09-12'] };
    const lunesMensual = { numeroOrden: 'B', fechasEntrega: ['2026-09-14', '2026-09-21'] };
    const nuevoDelViernes = { numeroOrden: 'C', fechasEntrega: ['2026-09-12'] };

    it('el viernes solo trae lo que entro despues del jueves', () => {
        const jueves = pedidosDeLaTanda([sabado, lunesMensual], [], { calendario });
        expect(jueves.nuevos.map(p => p.numeroOrden)).toEqual(['A', 'B']);

        const yaEnviados = acumularEnviados([{ pedidos: jueves.nuevos.map(p => p.numeroOrden) }]);
        const viernes = pedidosDeLaTanda([sabado, lunesMensual, nuevoDelViernes], yaEnviados, { calendario });

        expect(viernes.nuevos.map(p => p.numeroOrden)).toEqual(['C']);
        expect(viernes.repetidos.map(p => p.numeroOrden)).toEqual(['A', 'B']);
    });
});
