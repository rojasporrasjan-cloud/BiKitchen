import { describe, it, expect } from 'vitest';
import { aplicarAjustes, cantidadFinal, conAjuste, claveDeRenglon } from '../utils/ajustesDeCocina.js';

/**
 * Gina corrige la hoja a mano cuando el calculo se equivoca. Lo que ella
 * escribe manda, y tiene que sobrevivir a recargar la pagina y a recalcular.
 */
const renglon = (name, unit = 'taza(s)') => ({ name, unit, qty: 10 });

describe('los ajustes de Gina mandan sobre el calculo', () => {

    it('cambia la cantidad', () => {
        const r = aplicarAjustes([renglon('Arroz blanco')], {
            'arroz blanco|taza(s)': { cantidad: 8 }
        });
        expect(cantidadFinal(r[0], 6)).toBe(8);
        expect(r[0].ajustado).toBe(true);
    });

    it('un CERO es una correccion, no un campo vacio', () => {
        // "No cocinar nada de eso" es una respuesta valida y se perdia con `||`.
        const r = aplicarAjustes([renglon('Arroz frito')], {
            'arroz frito|taza(s)': { cantidad: 0 }
        });
        expect(cantidadFinal(r[0], 5)).toBe(0);
    });

    it('cambia la unidad', () => {
        const r = aplicarAjustes([renglon('Maduros')], {
            'maduros|taza(s)': { unidad: 'unidad(es)' }
        });
        expect(r[0].unit).toBe('unidad(es)');
    });

    it('cambia la nota de empaque', () => {
        const r = aplicarAjustes([renglon('Pollo al ajillo', 'g')], {
            'pollo al ajillo|g': { nota: 'Empacar en bolsa, no en taza' }
        });
        expect(r[0].notaAjustada).toBe('Empacar en bolsa, no en taza');
    });

    it('lo que no se toco se queda igual, sin marca', () => {
        const r = aplicarAjustes([renglon('Arroz blanco'), renglon('Pollo', 'g')], {
            'arroz blanco|taza(s)': { cantidad: 8 }
        });
        expect(r[1].ajustado).toBeUndefined();
        expect(cantidadFinal(r[1], 3)).toBe(3);
    });

    it('el mismo plato en gramos y en tazas son dos renglones distintos', () => {
        const r = aplicarAjustes([renglon('Milanesa de pollo', 'g'), renglon('Milanesa de pollo', 'taza(s)')], {
            'milanesa de pollo|g': { cantidad: 1500 }
        });
        expect(cantidadFinal(r[0], 1898)).toBe(1500);
        expect(cantidadFinal(r[1], 4)).toBe(4);
    });

    it('sin ajustes guardados no pasa nada', () => {
        const items = [renglon('Arroz blanco')];
        expect(aplicarAjustes(items, null)).toEqual(items);
        expect(aplicarAjustes(null, {})).toEqual([]);
    });
});

describe('guardar y deshacer un ajuste', () => {

    it('guarda el cambio bajo la llave del renglon', () => {
        const a = conAjuste({}, 'Arroz blanco', 'taza(s)', { cantidad: 8 });
        expect(a[claveDeRenglon('Arroz blanco', 'taza(s)')]).toEqual({ cantidad: 8 });
    });

    it('acumula cambios sobre el mismo renglon', () => {
        let a = conAjuste({}, 'Maduros', 'taza(s)', { cantidad: 10 });
        a = conAjuste(a, 'Maduros', 'taza(s)', { unidad: 'unidad(es)' });
        expect(a['maduros|taza(s)']).toEqual({ cantidad: 10, unidad: 'unidad(es)' });
    });

    it('dejar un campo en blanco lo devuelve al calculo', () => {
        let a = conAjuste({}, 'Arroz blanco', 'taza(s)', { cantidad: 8, nota: 'x' });
        a = conAjuste(a, 'Arroz blanco', 'taza(s)', { nota: '' });
        expect(a['arroz blanco|taza(s)']).toEqual({ cantidad: 8 });
    });

    it('borrar todo saca el renglon de los ajustes', () => {
        let a = conAjuste({}, 'Arroz blanco', 'taza(s)', { cantidad: 8 });
        a = conAjuste(a, 'Arroz blanco', 'taza(s)', { cantidad: null });
        expect(a).toEqual({});
    });
});
