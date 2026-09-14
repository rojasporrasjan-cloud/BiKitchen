/**
 * Marcar la comida ya hecha POR PEDIDO, no por familia.
 *
 * El 12 de setiembre de 2026: Gina reportó lo cocinado, Jan metió los pedidos
 * que faltaban DESPUÉS, y marcar "Pack Bajo en Calorías" entero habría sacado
 * también a los nuevos. Esos clientes se quedaban sin comida y la hoja no
 * decía nada.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    sinLosYaCocinados,
    alternarCocinado,
    alternarVarios,
    leerPedidosCocinados,
    guardarPedidosCocinados
} from '../utils/pedidosYaCocinados';

const pedido = (id, cliente) => ({ id, cliente, rawPedido: { numeroOrden: id } });

const VIEJOS = [pedido('ORD-1', 'Ana'), pedido('ORD-2', 'Beto')];
const NUEVO = pedido('ORD-9', 'Recién metido');

describe('sinLosYaCocinados', () => {

    it('el pedido nuevo SIGUE en la cocina aunque su familia ya se hizo', () => {
        // Este es el caso que se rompía
        const todos = [...VIEJOS, NUEVO];
        const quedan = sinLosYaCocinados(todos, ['ORD-1', 'ORD-2']);

        expect(quedan.map(p => p.cliente)).toEqual(['Recién metido']);
    });

    it('sin nada marcado se cocina todo', () => {
        expect(sinLosYaCocinados([...VIEJOS, NUEVO], [])).toHaveLength(3);
        expect(sinLosYaCocinados([...VIEJOS, NUEVO], null)).toHaveLength(3);
    });

    it('una marca de un pedido que ya no existe no saca a nadie más', () => {
        expect(sinLosYaCocinados(VIEJOS, ['ORD-77'])).toHaveLength(2);
    });

    it('una lista vacía no rompe', () => {
        expect(sinLosYaCocinados([], ['ORD-1'])).toEqual([]);
        expect(sinLosYaCocinados(null, ['ORD-1'])).toEqual([]);
    });
});

describe('alternarCocinado', () => {
    it('marca y desmarca uno', () => {
        let lista = alternarCocinado([], 'ORD-1');
        expect(lista).toEqual(['ORD-1']);
        lista = alternarCocinado(lista, 'ORD-1');
        expect(lista).toEqual([]);
    });

    it('una clave vacía no ensucia la lista', () => {
        expect(alternarCocinado(['ORD-1'], '')).toEqual(['ORD-1']);
    });
});

describe('alternarVarios — el atajo de la familia', () => {

    it('marca todos los de la familia de una vez', () => {
        expect(alternarVarios([], ['ORD-1', 'ORD-2'])).toEqual(['ORD-1', 'ORD-2']);
    });

    it('si ya estaban todos, los quita', () => {
        expect(alternarVarios(['ORD-1', 'ORD-2'], ['ORD-1', 'ORD-2'])).toEqual([]);
    });

    it('si faltaba alguno, completa en vez de vaciar', () => {
        // Marcar la familia después de destildar uno tiene que volver a ponerlos
        expect(alternarVarios(['ORD-1'], ['ORD-1', 'ORD-2']).sort()).toEqual(['ORD-1', 'ORD-2']);
    });

    it('no toca los de otras familias', () => {
        const otras = alternarVarios(['ORD-KETO'], ['ORD-1']);
        expect(otras).toContain('ORD-KETO');
    });

    it('no repite si se marca dos veces', () => {
        const una = alternarVarios([], ['ORD-1', 'ORD-1']);
        expect(una).toEqual(['ORD-1']);
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
        guardarPedidosCocinados(['ORD-MENSUAL'], '2026-09-12_2026-09-14');
        expect(leerPedidosCocinados('2026-09-12_2026-09-14')).toEqual(['ORD-MENSUAL']);
        expect(leerPedidosCocinados('2026-09-19_2026-09-21')).toEqual([]);
    });

    it('lo que se guarda se vuelve a leer', () => {
        guardarPedidosCocinados(['ORD-1']);
        expect(leerPedidosCocinados()).toEqual(['ORD-1']);
    });

    it('un dato corrupto no rompe', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: () => 'no es json', setItem: () => {} }
        });
        expect(leerPedidosCocinados()).toEqual([]);
    });

    it('si el navegador no deja guardar, la hoja sigue', () => {
        vi.stubGlobal('window', {
            localStorage: {
                getItem: () => null,
                setItem: () => { throw new Error('modo privado'); }
            }
        });
        expect(() => guardarPedidosCocinados(['ORD-1'])).not.toThrow();
    });
});
