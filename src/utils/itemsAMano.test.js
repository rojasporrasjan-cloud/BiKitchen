import { describe, it, expect } from 'vitest';
import { itemsEscritosAMano } from '../pages/admin/WhatsAppImportView';

describe('itemsEscritosAMano', () => {
    it('arma el item que el parser no leyo', () => {
        const r = itemsEscritosAMano([
            { nombre: 'Pack Bajo Calorias mensual', cantidad: '1', precio: '83500', proteinas: '' }
        ]);
        expect(r).toHaveLength(1);
        expect(r[0].nombre).toBe('Pack Bajo Calorias mensual');
        expect(r[0].cantidad).toBe(1);
        expect(r[0].precio).toBe(83500);
        expect(r[0].escritoAMano).toBe(true);
    });

    it('una fila recien agregada y vacia NO cuenta: el boton sigue apagado', () => {
        expect(itemsEscritosAMano([{ nombre: '', cantidad: '1', precio: '', proteinas: '' }])).toEqual([]);
        expect(itemsEscritosAMano([{ nombre: '   ' }])).toEqual([]);
    });

    it('sin cantidad se asume 1, y una cantidad invalida no rompe', () => {
        expect(itemsEscritosAMano([{ nombre: 'Pack' }])[0].cantidad).toBe(1);
        expect(itemsEscritosAMano([{ nombre: 'Pack', cantidad: '0' }])[0].cantidad).toBe(1);
        expect(itemsEscritosAMano([{ nombre: 'Pack', cantidad: 'dos' }])[0].cantidad).toBe(1);
    });

    it('sin precio queda en null, no en cero', () => {
        expect(itemsEscritosAMano([{ nombre: 'Pack' }])[0].precio).toBeNull();
        expect(itemsEscritosAMano([{ nombre: 'Pack', precio: '' }])[0].precio).toBeNull();
    });

    it('separa las proteinas por coma y limpia los espacios', () => {
        const r = itemsEscritosAMano([{ nombre: 'Individuales', proteinas: ' Carne mechada , Pollo al pesto ,, ' }]);
        expect(r[0].proteinas).toEqual(['Carne mechada', 'Pollo al pesto']);
    });

    it('no revienta con nada, con null ni con basura adentro', () => {
        expect(itemsEscritosAMano(undefined)).toEqual([]);
        expect(itemsEscritosAMano(null)).toEqual([]);
        expect(itemsEscritosAMano([])).toEqual([]);
        expect(() => itemsEscritosAMano([null, undefined, {}])).not.toThrow();
        expect(itemsEscritosAMano([null, undefined, {}])).toEqual([]);
    });

    it('conserva varios items a la vez', () => {
        const r = itemsEscritosAMano([
            { nombre: 'Pack Regular', precio: '58700' },
            { nombre: '' },
            { nombre: 'Tortas de maduro', cantidad: '2', precio: '7000' }
        ]);
        expect(r.map(x => x.nombre)).toEqual(['Pack Regular', 'Tortas de maduro']);
        expect(r[1].cantidad).toBe(2);
    });
});
