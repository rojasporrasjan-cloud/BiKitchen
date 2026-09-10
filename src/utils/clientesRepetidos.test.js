import { describe, it, expect } from 'vitest';
import { marcasDePedidoRepetido, llaveDeCliente } from './clientesRepetidos';

describe('marcasDePedidoRepetido', () => {
    it('no marca nada cuando cada cliente sale una sola vez', () => {
        const r = marcasDePedidoRepetido([
            { nombre: 'Hazel Jimenez' },
            { nombre: 'Diana Gonzalez' },
            { nombre: 'Marlon Camacho' }
        ]);
        expect(r).toEqual(['', '', '']);
    });

    it('el caso de Christian: dos packs a proposito, no un duplicado', () => {
        const r = marcasDePedidoRepetido([
            { nombre: 'Christian Vargas' },
            { nombre: 'Christian Vargas' }
        ]);
        expect(r).toEqual([' \u2014 pedido 1 de 2', ' \u2014 pedido 2 de 2']);
    });

    it('cuenta bien con tres del mismo y otros en medio', () => {
        const r = marcasDePedidoRepetido([
            { nombre: 'Ana' },
            { nombre: 'Beto' },
            { nombre: 'Ana' },
            { nombre: 'Ana' }
        ]);
        expect(r).toEqual([' \u2014 pedido 1 de 3', '', ' \u2014 pedido 2 de 3', ' \u2014 pedido 3 de 3']);
    });

    it('el mismo nombre con tildes o mayusculas distintas cuenta como uno', () => {
        const r = marcasDePedidoRepetido([
            { nombre: 'PRISCILLA MONTOYA' },
            { nombre: 'Priscilla  Montoya ' }
        ]);
        expect(r).toEqual([' \u2014 pedido 1 de 2', ' \u2014 pedido 2 de 2']);
    });

    it('no revienta con lista vacia, nula, ni con nombres en blanco', () => {
        expect(marcasDePedidoRepetido([])).toEqual([]);
        expect(marcasDePedidoRepetido(null)).toEqual([]);
        expect(marcasDePedidoRepetido(undefined)).toEqual([]);
        expect(marcasDePedidoRepetido([{ nombre: '' }, { nombre: '  ' }])).toEqual(['', '']);
    });

    it('acepta leer el nombre de otro campo', () => {
        const r = marcasDePedidoRepetido(
            [{ cliente: 'Ana' }, { cliente: 'Ana' }],
            (c) => c.cliente
        );
        expect(r).toEqual([' \u2014 pedido 1 de 2', ' \u2014 pedido 2 de 2']);
    });

    it('devuelve una lista del MISMO largo que la de entrada', () => {
        const entrada = Array.from({ length: 40 }, (_, i) => ({ nombre: `C${i % 7}` }));
        expect(marcasDePedidoRepetido(entrada)).toHaveLength(40);
    });
});

describe('llaveDeCliente', () => {
    it('dos pedidos del mismo cliente dan llaves distintas', () => {
        const a = { nombre: 'Christian Vargas', rawPedido: { id: 'doc-1' } };
        const b = { nombre: 'Christian Vargas', rawPedido: { id: 'doc-2' } };
        expect(llaveDeCliente(a, 0)).not.toBe(llaveDeCliente(b, 1));
    });

    it('sin id igual sale unica, porque el indice entra en la llave', () => {
        const a = { nombre: 'Christian Vargas' };
        const b = { nombre: 'Christian Vargas' };
        expect(llaveDeCliente(a, 0)).not.toBe(llaveDeCliente(b, 1));
    });

    it('no revienta sin cliente', () => {
        expect(typeof llaveDeCliente(null, 0)).toBe('string');
        expect(typeof llaveDeCliente(undefined, 3)).toBe('string');
    });
});
