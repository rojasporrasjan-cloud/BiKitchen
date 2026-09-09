import { describe, it, expect } from 'vitest';
import {
    proteinasEscritas, itemsConProteinas, cambiosDelPedido,
    cuantasProteinasPide, cambioParaCancelar
} from '../utils/guardarPedidoDeLaHoja';

/**
 * La trampa de este archivo: las proteinas elegidas NO viven en la raiz del
 * pedido, viven DENTRO del primer item. Escribirlas arriba no falla —el PATCH
 * devuelve 200— pero la hoja sigue leyendo las de adentro y nada cambia.
 */

const PEDIDO_DIANA = {
    cliente: 'Diana Gonzalez',
    plan: 'Pack de 3 proteínas de 250 g',
    observaciones: 'Agregado al pack mensual — sin cargo',
    items: [{
        nombre: 'Pack de 3 proteínas de 250 g',
        cantidad: 1,
        proteinas: ['Milanesa de pollo', 'Milanesa de pollo', 'Milanesa de pollo']
    }]
};

describe('leer lo que se escribio a mano', () => {
    it('una proteina por linea, sin espacios ni vacios', () => {
        expect(proteinasEscritas('  Pollo a la naranja \n\n Carne molida  \n')).toEqual([
            'Pollo a la naranja', 'Carne molida'
        ]);
    });

    it('texto vacio no da ninguna', () => {
        expect(proteinasEscritas('')).toEqual([]);
        expect(proteinasEscritas(null)).toEqual([]);
    });
});

describe('cuantas proteinas pide el pack', () => {
    it('las lee del nombre', () => {
        expect(cuantasProteinasPide('Pack de 3 proteínas de 250 g')).toBe(3);
        expect(cuantasProteinasPide('Pack 5 Proteínas (500g)')).toBe(5);
    });

    it('un pack que no es de proteinas pide cero', () => {
        expect(cuantasProteinasPide('Pack Regular')).toBe(0);
        expect(cuantasProteinasPide('')).toBe(0);
    });
});

describe('las proteinas se escriben DENTRO del item', () => {
    it('van al primer item, no a la raiz', () => {
        const items = itemsConProteinas(PEDIDO_DIANA.items, ['A', 'B', 'C']);
        expect(items[0].proteinas).toEqual(['A', 'B', 'C']);
        expect(items[0].nombre).toBe('Pack de 3 proteínas de 250 g');
    });

    it('los demas items no se tocan', () => {
        const dos = [{ nombre: 'Pack', proteinas: [] }, { nombre: 'Postre suelto' }];
        const r = itemsConProteinas(dos, ['A']);
        expect(r[1]).toEqual({ nombre: 'Postre suelto' });
    });

    it('sin items no inventa uno', () => {
        expect(itemsConProteinas([], ['A'])).toEqual([]);
        expect(itemsConProteinas(null, ['A'])).toEqual([]);
    });
});

describe('el cambio que se manda a guardar', () => {
    it('arregla las tres milanesas de Diana', () => {
        const c = cambiosDelPedido(PEDIDO_DIANA, {
            observaciones: PEDIDO_DIANA.observaciones,
            proteinas: ['Milanesa de pollo', 'Pollo a la naranja', 'Carne molida en salsa criolla']
        });
        expect(c.items[0].proteinas).toEqual([
            'Milanesa de pollo', 'Pollo a la naranja', 'Carne molida en salsa criolla'
        ]);
        expect(c.observaciones).toBeUndefined();   // la nota no cambio
    });

    it('cambiar solo la nota no reescribe los items', () => {
        const c = cambiosDelPedido(PEDIDO_DIANA, {
            observaciones: 'NO VAINICAS.',
            proteinas: PEDIDO_DIANA.items[0].proteinas
        });
        expect(c).toEqual({ observaciones: 'NO VAINICAS.' });
    });

    it('sin cambios devuelve null, para no gastar una escritura', () => {
        expect(cambiosDelPedido(PEDIDO_DIANA, {
            observaciones: PEDIDO_DIANA.observaciones,
            proteinas: PEDIDO_DIANA.items[0].proteinas
        })).toBe(null);
    });

    it('en un pedido que no es de proteinas, no las toca', () => {
        const regular = { observaciones: 'x', items: [{ nombre: 'Pack Regular' }] };
        const c = cambiosDelPedido(regular, { observaciones: 'NO CHILE', proteinas: null });
        expect(c).toEqual({ observaciones: 'NO CHILE' });
        expect(c.items).toBeUndefined();
    });

    it('borrar la nota se guarda como vacia, no se ignora', () => {
        const c = cambiosDelPedido(PEDIDO_DIANA, { observaciones: '', proteinas: null });
        expect(c).toEqual({ observaciones: '' });
    });
});

describe('sacar un pedido de la hoja', () => {
    it('lo cancela, no lo borra', () => {
        const c = cambioParaCancelar();
        expect(c.status).toBe('cancelled');
        expect(c.canceladoMotivo).toMatch(/hoja/i);
    });
});
