/**
 * Las etiquetas del lunes se adelantan el sábado. Si el lunes entra un pedido
 * nuevo hay que imprimir SOLO lo nuevo: repetir el lote deja dos juegos iguales
 * sobre la mesa y nadie sabe cuál es cuál.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    contarPorGrupo, leerImpresas, anotarImpresas,
    faltanDelGrupo, gruposQueFaltan, totalImpresas, olvidarFecha
} from '../services/printing/etiquetasImpresas';

const LUNES = '2026-09-07';

const tira = [
    { groupId: 'divisor-Bajo Calorías', divider: true },
    { groupId: 'Bajo Calorías||milanesa de pollo' },
    { groupId: 'Bajo Calorías||milanesa de pollo' },
    { groupId: 'Bajo Calorías||milanesa de pollo' },
    { groupId: 'divisor-Keto', divider: true },
    { groupId: 'Keto||filet de tilapia en mantequilla' },
    { groupId: 'Keto||filet de tilapia en mantequilla' }
];

beforeEach(() => localStorage.clear());

describe('contar lo que de verdad salió', () => {
    it('cuenta por grupo y no cuenta los divisores', () => {
        expect(contarPorGrupo(tira, tira.length)).toEqual({
            'Bajo Calorías||milanesa de pollo': 3,
            'Keto||filet de tilapia en mantequilla': 2
        });
    });

    it('si la impresora se traba a la mitad, solo cuenta lo que salió', () => {
        // Salieron 4 de 7: el divisor, las 3 milanesas. La tilapia no.
        expect(contarPorGrupo(tira, 4)).toEqual({ 'Bajo Calorías||milanesa de pollo': 3 });
    });

    it('sin nada procesado no cuenta nada', () => {
        expect(contarPorGrupo(tira, 0)).toEqual({});
    });

    it('no revienta con basura', () => {
        expect(contarPorGrupo(null, 5)).toEqual({});
        expect(contarPorGrupo(tira, 999)).toEqual({
            'Bajo Calorías||milanesa de pollo': 3,
            'Keto||filet de tilapia en mantequilla': 2
        });
    });
});

describe('llevar la cuenta entre tandas', () => {
    it('suma lo nuevo a lo que ya había', () => {
        anotarImpresas(LUNES, { 'a||x': 3 });
        anotarImpresas(LUNES, { 'a||x': 2, 'b||y': 1 });
        expect(leerImpresas(LUNES)).toEqual({ 'a||x': 5, 'b||y': 1 });
    });

    it('cada fecha lleva su cuenta aparte', () => {
        anotarImpresas('2026-09-05', { 'a||x': 4 });
        anotarImpresas(LUNES, { 'a||x': 1 });
        expect(leerImpresas('2026-09-05')).toEqual({ 'a||x': 4 });
        expect(leerImpresas(LUNES)).toEqual({ 'a||x': 1 });
    });

    it('una fecha sin nada impreso está vacía', () => {
        expect(leerImpresas('2026-12-25')).toEqual({});
        expect(leerImpresas(null)).toEqual({});
    });

    it('se puede borrar una fecha para reimprimir todo', () => {
        anotarImpresas(LUNES, { 'a||x': 5 });
        olvidarFecha(LUNES);
        expect(leerImpresas(LUNES)).toEqual({});
    });
});

describe('qué falta imprimir', () => {
    const grupos = [
        { id: 'a||x', tipo: 'Bajo Calorías', dishName: 'Milanesa de pollo', cantidad: 17 },
        { id: 'b||y', tipo: 'Keto', dishName: 'Tilapia', cantidad: 2 },
        { id: 'c||z', tipo: 'Full Pack', dishName: 'Lasagna', cantidad: 4 }
    ];

    it('descuenta lo ya impreso', () => {
        const impresas = { 'a||x': 14, 'b||y': 2 };
        expect(faltanDelGrupo(grupos[0], impresas)).toBe(3);
        expect(faltanDelGrupo(grupos[1], impresas)).toBe(0);
        expect(faltanDelGrupo(grupos[2], impresas)).toBe(4);
    });

    it('los grupos completos se caen de la lista', () => {
        const faltan = gruposQueFaltan(grupos, { 'a||x': 14, 'b||y': 2 });
        expect(faltan.map(g => g.id)).toEqual(['a||x', 'c||z']);
        expect(faltan[0].cantidad).toBe(3);
        expect(faltan[0].yaImpresas).toBe(14);
    });

    it('si se imprimió de más no queda negativo', () => {
        expect(faltanDelGrupo(grupos[1], { 'b||y': 99 })).toBe(0);
    });

    it('sin nada impreso, falta todo', () => {
        expect(gruposQueFaltan(grupos, {})).toHaveLength(3);
        expect(gruposQueFaltan(grupos, {})[0].cantidad).toBe(17);
    });

    it('cuenta el total impreso de la fecha', () => {
        expect(totalImpresas({ 'a||x': 14, 'b||y': 2 })).toBe(16);
        expect(totalImpresas({})).toBe(0);
    });
});
