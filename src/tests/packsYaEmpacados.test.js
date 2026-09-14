/**
 * Los packs del lunes que ya se empacaron el viernes.
 *
 * Sin este registro volvían a salir completos en la hoja del sábado y había que
 * tacharlos a mano a las cuatro de la mañana.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    claveDeEmpacado,
    sinLosYaEmpacados,
    losYaEmpacados,
    alternarEmpacado,
    leerEmpacados,
    guardarEmpacados
} from '../utils/packsYaEmpacados';

const pedido = (id, cliente) => ({ id, cliente, rawPedido: { numeroOrden: id } });

const ANA = pedido('ORD-1', 'Ana Rojas');
const BETO = pedido('ORD-2', 'Beto Mora');
const CECI = pedido('ORD-3', 'Ceci Vargas');

describe('claveDeEmpacado', () => {
    it('usa el mismo identificador que la tanda de cocina', () => {
        expect(claveDeEmpacado(ANA)).toBe('ORD-1');
        expect(claveDeEmpacado({ id: 'ORD-9' })).toBe('ORD-9');
    });

    it('un pedido sin identificador no rompe', () => {
        expect(claveDeEmpacado({})).toBe('');
        expect(claveDeEmpacado(null)).toBe('');
    });
});

describe('sinLosYaEmpacados', () => {

    it('saca los que ya se empacaron', () => {
        const quedan = sinLosYaEmpacados([ANA, BETO, CECI], ['ORD-1', 'ORD-3']);
        expect(quedan.map(p => p.cliente)).toEqual(['Beto Mora']);
    });

    it('sin nada marcado devuelve todo', () => {
        expect(sinLosYaEmpacados([ANA, BETO], [])).toHaveLength(2);
        expect(sinLosYaEmpacados([ANA, BETO], null)).toHaveLength(2);
    });

    it('una marca de un pedido que ya no está no saca a nadie más', () => {
        // Un pedido cancelado después de marcarlo no puede arrastrar a otro
        const quedan = sinLosYaEmpacados([ANA, BETO], ['ORD-99']);
        expect(quedan).toHaveLength(2);
    });

    it('una lista vacía no rompe', () => {
        expect(sinLosYaEmpacados([], ['ORD-1'])).toEqual([]);
        expect(sinLosYaEmpacados(null, ['ORD-1'])).toEqual([]);
    });
});

describe('losYaEmpacados', () => {
    it('devuelve los marcados, para poder mostrarlos aparte', () => {
        const hechos = losYaEmpacados([ANA, BETO, CECI], ['ORD-1']);
        expect(hechos.map(p => p.cliente)).toEqual(['Ana Rojas']);
    });

    it('sin marcas no devuelve ninguno', () => {
        expect(losYaEmpacados([ANA, BETO], [])).toEqual([]);
    });
});

describe('alternarEmpacado', () => {
    it('marca y desmarca', () => {
        let lista = alternarEmpacado([], 'ORD-1');
        expect(lista).toEqual(['ORD-1']);

        lista = alternarEmpacado(lista, 'ORD-2');
        expect(lista).toEqual(['ORD-1', 'ORD-2']);

        // Desmarcar hace falta: si se marcó por error, hay que poder devolverlo
        lista = alternarEmpacado(lista, 'ORD-1');
        expect(lista).toEqual(['ORD-2']);
    });

    it('una clave vacía no ensucia la lista', () => {
        expect(alternarEmpacado(['ORD-1'], '')).toEqual(['ORD-1']);
        expect(alternarEmpacado(['ORD-1'], null)).toEqual(['ORD-1']);
    });
});

describe('lo guardado sobrevive, y si se rompe no tumba la hoja', () => {

    beforeEach(() => {
        const guardado = {};
        vi.stubGlobal('window', {
            localStorage: {
                getItem: (k) => (k in guardado ? guardado[k] : null),
                setItem: (k, v) => { guardado[k] = v; }
            }
        });
    });

    /**
     * Un pack MENSUAL tiene el mismo numero de orden las cuatro semanas. Con
     * una sola llave, lo marcado el viernes 11 seguia marcado el viernes 18 y
     * el cliente desaparecia de la hoja sin aviso.
     */
    it('lo marcado en un ciclo NO aparece en el ciclo siguiente', () => {
        guardarEmpacados(['ORD-MENSUAL'], '2026-09-12_2026-09-14');
        expect(leerEmpacados('2026-09-12_2026-09-14')).toEqual(['ORD-MENSUAL']);
        expect(leerEmpacados('2026-09-19_2026-09-21')).toEqual([]);
    });

    it('lo que se guarda se vuelve a leer', () => {
        guardarEmpacados(['ORD-1', 'ORD-2']);
        expect(leerEmpacados()).toEqual(['ORD-1', 'ORD-2']);
    });

    it('sin nada guardado, ninguno está empacado', () => {
        expect(leerEmpacados()).toEqual([]);
    });

    it('un dato corrupto no rompe: se arranca de cero', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: () => 'esto no es json', setItem: () => {} }
        });
        expect(leerEmpacados()).toEqual([]);
    });

    it('si el navegador no deja guardar, la hoja sigue', () => {
        vi.stubGlobal('window', {
            localStorage: {
                getItem: () => null,
                setItem: () => { throw new Error('modo privado'); }
            }
        });
        expect(() => guardarEmpacados(['ORD-1'])).not.toThrow();
    });
});
