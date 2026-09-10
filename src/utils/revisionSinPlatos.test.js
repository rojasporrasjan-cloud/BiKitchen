import { describe, it, expect } from 'vitest';
import { pedidosQueNoDicenQueCocinar, problemasParaLaHoja } from './revisionDeLaHoja';

/** El caso real: Alejandra Calderon, lunes 14 de setiembre de 2026. */
const alejandra = {
    id: 'ORD-LUN7-ALEJANDRA',
    cliente: 'Alejandra Calderón',
    plan: 'Pack Mensual Proteínas 250 g',
    esPack: false,
    esDesayuno: false,
    familias: [],
    platos: ['Pack Mensual Proteínas 250 g']
};

describe('pedidosQueNoDicenQueCocinar', () => {
    it('avisa del pack de Alejandra, que solo repite su propio nombre', () => {
        const r = pedidosQueNoDicenQueCocinar([alejandra]);
        expect(r).toHaveLength(1);
        expect(r[0].tipo).toBe('sin-platos');
        expect(r[0].nivel).toBe('alto');
        expect(r[0].quienes).toContain('Alejandra Calderón');
    });

    it('NO avisa cuando el pedido si trae sus platos', () => {
        const r = pedidosQueNoDicenQueCocinar([{
            ...alejandra,
            platos: ['Pollo caribeño', 'Milanesa de pollo', 'Pollo Toscana',
                     'Cerdo en salsa strogonoff', 'Tortas de carne molida']
        }]);
        expect(r).toEqual([]);
    });

    it('NO avisa de un pack normal: sus platos salen del menu de la semana', () => {
        const r = pedidosQueNoDicenQueCocinar([{
            id: 'x', cliente: 'Lynn Castro Salas', plan: 'Pack Mensual Bajo Calorías',
            esPack: true, esDesayuno: false,
            familias: ['bajoCalorias'],
            platos: ['Pack Mensual Bajo Calorías']
        }]);
        expect(r).toEqual([]);
    });

    it('NO avisa de un pack de desayunos: van por su propio camino', () => {
        const r = pedidosQueNoDicenQueCocinar([{
            id: 'x', cliente: 'Angie Navarro', plan: 'Pack Mensual de Desayunos (6 por semana)',
            esPack: false, esDesayuno: true, familias: [],
            platos: ['Pack Mensual de Desayunos (6 por semana)']
        }]);
        expect(r).toEqual([]);
    });

    it('NO avisa dos veces: los "Pack de N proteinas" ya los cubre la revision 7', () => {
        const diana = {
            id: 'x', cliente: 'Diana Gonzalez', plan: 'Pack de 3 proteínas de 250 g',
            esPack: false, esDesayuno: false, familias: [],
            platos: ['Pack de 3 proteínas de 250 g']
        };
        expect(pedidosQueNoDicenQueCocinar([diana])).toEqual([]);
        // pero la hoja SI lo avisa, por el otro camino
        const todos = problemasParaLaHoja({ pedidos: [diana], preparaciones: [], fecha: '2026-09-14' });
        expect(todos.some(a => /prote/i.test(a.que))).toBe(true);
    });

    it('un pack que ES pack y no calza con familia lo avisa la revision 3, no esta', () => {
        const r = pedidosQueNoDicenQueCocinar([{
            id: 'x', cliente: 'Fulano', plan: 'Pack Raro',
            esPack: true, esDesayuno: false, familias: [], platos: ['Pack Raro']
        }]);
        expect(r).toEqual([]);
    });

    it('no revienta con lista vacia, nula ni con campos faltantes', () => {
        expect(pedidosQueNoDicenQueCocinar([])).toEqual([]);
        expect(pedidosQueNoDicenQueCocinar(null)).toEqual([]);
        expect(pedidosQueNoDicenQueCocinar(undefined)).toEqual([]);
        expect(() => pedidosQueNoDicenQueCocinar([{}, null])).not.toThrow();
    });

    it('sale en la hoja con su instruccion de como arreglarlo', () => {
        const avisos = problemasParaLaHoja({
            pedidos: [alejandra], preparaciones: [], fecha: '2026-09-14'
        });
        const suyo = avisos.find(a => a.cliente === 'Alejandra Calderón');
        expect(suyo).toBeTruthy();
        expect(suyo.gravedad).toBe('alta');
        expect(suyo.comoSeArregla).toMatch(/platos de esta semana|individuales/i);
        expect(suyo.pedidoId).toBe('ORD-LUN7-ALEJANDRA');
    });
});
