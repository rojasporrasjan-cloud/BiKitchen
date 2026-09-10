import { describe, it, expect } from 'vitest';
import {
    claveDeProduccion, acumularCocinado, porCocinar, sobrante,
    cocinadoDeLaHoja, resumenDeRenglon
} from '../utils/produccionAcumulada.js';

/**
 * El caso de verdad, con los números de la semana del sábado 5 y el lunes 7.
 *
 * El jueves la hoja pide 3263 g de carne mechada. Gina cocina 5000, porque se
 * congela y prefiere no prender la olla tres veces. El viernes entran pedidos
 * que piden 800 g más. La hoja del viernes tiene que decir CERO, no 800.
 */
const carneMechada = { name: 'Carne mechada', unit: 'g' };

describe('cocinar de más el jueves y que el viernes no lo repita', () => {
    const jueves = { cocinado: cocinadoDeLaHoja([{ ...carneMechada, aCocinar: 5000 }]) };

    it('el jueves se guarda lo que se va a cocinar de verdad, no lo calculado', () => {
        expect(jueves.cocinado['carne mechada|g']).toBe(5000);
    });

    it('el viernes ya no pide nada, aunque hayan entrado pedidos nuevos', () => {
        const hecho = acumularCocinado([jueves]);
        // 3263 del jueves + 800 de los que entraron = 4063 en total
        expect(porCocinar({ ...carneMechada, necesita: 4063 }, hecho)).toBe(0);
    });

    it('y avisa que sobran 937 g ya hechos', () => {
        const hecho = acumularCocinado([jueves]);
        expect(sobrante({ ...carneMechada, necesita: 4063 }, hecho)).toBe(937);
    });

    it('si entran MUCHOS pedidos, pide solo la diferencia', () => {
        const hecho = acumularCocinado([jueves]);
        expect(porCocinar({ ...carneMechada, necesita: 7000 }, hecho)).toBe(2000);
    });
});

describe('cocinar de MENOS también se descuenta bien', () => {
    /**
     * Lo que pasó hoy: la hoja pedía 7670 g de milanesa y se cocinaron 6000.
     * El viernes tiene que pedir los 1670 que faltaron.
     */
    it('pide lo que faltó', () => {
        const milanesa = { name: 'Milanesa de pollo', unit: 'g' };
        const jueves = { cocinado: cocinadoDeLaHoja([{ ...milanesa, aCocinar: 6000 }]) };
        expect(porCocinar({ ...milanesa, necesita: 7670 }, acumularCocinado([jueves]))).toBe(1670);
        expect(sobrante({ ...milanesa, necesita: 7670 }, acumularCocinado([jueves]))).toBe(0);
    });
});

describe('se suman todas las hojas, no solo la última', () => {
    it('jueves + viernes se acumulan', () => {
        const tandas = [
            { cocinado: { 'carne mechada|g': 5000 } },
            { cocinado: { 'carne mechada|g': 1500 } }
        ];
        expect(acumularCocinado(tandas)['carne mechada|g']).toBe(6500);
        expect(porCocinar({ ...carneMechada, necesita: 6000 }, acumularCocinado(tandas))).toBe(0);
    });

    it('cada preparación lleva su propia cuenta', () => {
        const tandas = [{ cocinado: { 'carne mechada|g': 5000, 'arroz blanco|taza(s)': 30 } }];
        const hecho = acumularCocinado(tandas);
        expect(porCocinar({ name: 'Arroz blanco', unit: 'taza(s)', necesita: 45 }, hecho)).toBe(15);
        expect(porCocinar({ ...carneMechada, necesita: 5000 }, hecho)).toBe(0);
    });
});

describe('la unidad es parte de la llave', () => {
    it('el mismo plato en gramos y en tazas son dos renglones', () => {
        expect(claveDeProduccion('Picadillo', 'g')).not.toBe(claveDeProduccion('Picadillo', 'taza(s)'));
        const hecho = acumularCocinado([{ cocinado: { 'picadillo|g': 500 } }]);
        // lo cocinado en gramos NO le descuenta al renglón de tazas
        expect(porCocinar({ name: 'Picadillo', unit: 'taza(s)', necesita: 20 }, hecho)).toBe(20);
    });

    it('no importa cómo esté escrito: espacios y mayúsculas', () => {
        const hecho = acumularCocinado([{ cocinado: { 'carne mechada|g': 5000 } }]);
        expect(porCocinar({ name: '  Carne Mechada  ', unit: 'G', necesita: 5000 }, hecho)).toBe(0);
    });
});

describe('lo que no puede pasar', () => {
    it('nunca pide una cantidad negativa', () => {
        const hecho = acumularCocinado([{ cocinado: { 'carne mechada|g': 9000 } }]);
        expect(porCocinar({ ...carneMechada, necesita: 3000 }, hecho)).toBe(0);
    });

    it('un cero cocinado no cuenta como que se cocinó', () => {
        expect(acumularCocinado([{ cocinado: { 'x|g': 0 } }])).toEqual({});
        expect(cocinadoDeLaHoja([{ name: 'x', unit: 'g', aCocinar: 0 }])).toEqual({});
    });

    it('un renglón que no se cocinó no aparece en el registro', () => {
        expect(cocinadoDeLaHoja([{ name: 'x', unit: 'g', aCocinar: null }])).toEqual({});
        expect(cocinadoDeLaHoja([{ name: 'x', unit: 'g' }])).toEqual({});
    });

    it('sin tandas previas, hay que cocinar todo', () => {
        expect(porCocinar({ ...carneMechada, necesita: 3263 }, {})).toBe(3263);
        expect(porCocinar({ ...carneMechada, necesita: 3263 }, null)).toBe(3263);
        expect(acumularCocinado(null)).toEqual({});
    });

    it('no revienta con basura', () => {
        expect(porCocinar(null, {})).toBe(0);
        expect(porCocinar({ name: 'x', unit: 'g', necesita: 'hola' }, {})).toBe(0);
        expect(acumularCocinado([{ cocinado: { 'x|g': 'mucho' } }])).toEqual({});
    });
});

describe('el resumen que ve Gina en la hoja', () => {
    /**
     * Tres números por renglón: lo que pide esta tanda, lo que pide toda la
     * semana —para decidir si adelantar— y lo que ya está hecho.
     */
    const renglon = { name: 'Carne mechada', unit: 'g', estaTanda: 3263, semanaCompleta: 4063 };

    it('la primera hoja: no hay nada hecho', () => {
        expect(resumenDeRenglon(renglon, {})).toEqual({
            pide: 3263, semana: 4063, yaCocinado: 0,
            falta: 3263, sobra: 0, siSeAdelantaTodo: 4063
        });
    });

    it('después de cocinar 5000: no falta nada y sobran 1737', () => {
        const r = resumenDeRenglon(renglon, { 'carne mechada|g': 5000 });
        expect(r.falta).toBe(0);
        expect(r.sobra).toBe(1737);
        expect(r.siSeAdelantaTodo).toBe(0);   // los 4063 de la semana ya están
    });

    it('dice cuánto seria cocinar toda la semana de una vez', () => {
        const r = resumenDeRenglon(renglon, {});
        expect(r.siSeAdelantaTodo).toBe(4063);
        expect(r.siSeAdelantaTodo).toBeGreaterThan(r.falta);
    });

    it('si ya se adelantó parte, descuenta esa parte', () => {
        const r = resumenDeRenglon(renglon, { 'carne mechada|g': 2000 });
        expect(r.falta).toBe(1263);
        expect(r.siSeAdelantaTodo).toBe(2063);
    });
});
