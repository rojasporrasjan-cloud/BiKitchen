/**
 * El Excel del adelanto: lo que Gina ya cocinó el jueves.
 *
 * Todos los casos de acá salieron del archivo real
 * "adelanto comida sabado - lunes .xlsx", pestaña DESGLOSE COCINA JUEVES.
 *
 * Lo importante no es cuánto descuenta, sino que NO descuente lo que no puede
 * convertir. Si "40 porciones" se tomara por 40 gramos, la hoja del viernes
 * pediría de menos y el sábado falta comida.
 */

import { describe, it, expect } from 'vitest';
import { leerCantidad, leerAdelanto } from '../utils/leerAdelantoDeGina';
import { claveDeProduccion } from '../utils/produccionAcumulada';

describe('leerCantidad', () => {

    it('los kilos pasan a gramos', () => {
        expect(leerCantidad('8 kg')).toEqual({ cantidad: 8000, unidad: 'g' });
        expect(leerCantidad('2 kg')).toEqual({ cantidad: 2000, unidad: 'g' });
        expect(leerCantidad('1.5 kg')).toEqual({ cantidad: 1500, unidad: 'g' });
    });

    it('un número pelado son gramos', () => {
        // Así se anotan las proteínas: "Milanesa de pollo   6000"
        expect(leerCantidad(6000)).toEqual({ cantidad: 6000, unidad: 'g' });
        expect(leerCantidad('6000')).toEqual({ cantidad: 6000, unidad: 'g' });
    });

    it('las tazas se quedan en tazas', () => {
        expect(leerCantidad('60 tazas')).toEqual({ cantidad: 60, unidad: 'taza(s)' });
        expect(leerCantidad('1 taza')).toEqual({ cantidad: 1, unidad: 'taza(s)' });
    });

    it('NO convierte porciones ni platos', () => {
        // Pasar "40 porciones" a gramos pide un dato que nadie escribió
        expect(leerCantidad('40 porciones')).toBeNull();
        expect(leerCantidad('35 platos')).toBeNull();
        expect(leerCantidad('30 lonjas')).toBeNull();
        expect(leerCantidad('1 olla grande')).toBeNull();
    });

    it('NO toma una nota como cantidad', () => {
        // "para 3 kg de cerdo agridulce" es una instrucción, no 3 kg cocinados
        expect(leerCantidad('para 3 kg de cerdo agridulce')).toBeNull();
        expect(leerCantidad('para 8 kg')).toBeNull();
        expect(leerCantidad('lo que salga con lo que hay')).toBeNull();
    });

    it('vacío o cero no es cantidad', () => {
        expect(leerCantidad('')).toBeNull();
        expect(leerCantidad(null)).toBeNull();
        expect(leerCantidad(0)).toBeNull();
    });
});

describe('leerAdelanto', () => {

    // Tal como vienen las filas del archivo real
    const FILAS = [
        ['FERNANDA', null],
        ['Milanesa de pollo', 6000],
        ['Lomo fingido en salsa gravy', '8 kg'],
        ['Dejar salsa agridulce', 'para 3 kg de cerdo agridulce'],
        ['Fajitas de cerdo en agridulce', '4 kg'],
        ['Dejar carne cocinada para el sabado solo lomo fingido', null],
        ['Carne mechada en salsa criolla', '5 kg'],
        ['Gallo pinto con huevos resueltos', '35 platos'],
        ['ROSA', null],
        ['Lasagna de pollo', '40 porciones'],
        ['Crema de vegetales', '60 tazas']
    ];

    const r = leerAdelanto(FILAS);

    it('descuenta lo que puede convertir', () => {
        expect(r.cocinado[claveDeProduccion('Milanesa de pollo', 'g')]).toBe(6000);
        expect(r.cocinado[claveDeProduccion('Lomo fingido en salsa gravy', 'g')]).toBe(8000);
        expect(r.cocinado[claveDeProduccion('Crema de vegetales', 'taza(s)')]).toBe(60);
    });

    it('usa el mismo nombre que la hoja: toda la carne mechada es una olla', () => {
        expect(r.cocinado[claveDeProduccion('Carne mechada', 'g')]).toBe(5000);
        expect(r.descontados.some(d => d.nombre === 'Carne mechada')).toBe(true);
    });

    it('lo que no puede convertir NO lo descuenta, lo reporta', () => {
        const nombres = r.sinConvertir.map(x => x.nombre);
        expect(nombres).toContain('Gallo pinto con huevos resueltos');
        expect(nombres).toContain('Lasagna de pollo');

        // Y no quedó nada suyo en el descuento
        expect(r.cocinado[claveDeProduccion('Lasagna de pollo', 'g')]).toBeUndefined();
    });

    it('las instrucciones salen como notas, no como cantidades', () => {
        expect(r.notas.some(n => /Dejar salsa agridulce/.test(n))).toBe(true);
        expect(r.notas.some(n => /Dejar carne cocinada/.test(n))).toBe(true);
        expect(r.cocinado[claveDeProduccion('Dejar salsa agridulce', 'g')]).toBeUndefined();
    });

    it('los nombres de las cocineras no son platos', () => {
        expect(r.descontados.some(d => /FERNANDA|ROSA/i.test(d.nombre))).toBe(false);
        expect(r.notas.some(n => /^(FERNANDA|ROSA)$/i.test(n))).toBe(false);
    });

    it('el mismo plato dos veces se suma', () => {
        const dos = leerAdelanto([
            ['Carne mechada en salsa criolla', '5 kg'],
            ['Carne mechada de res en salsa', '2 kg']
        ]);
        expect(dos.cocinado[claveDeProduccion('Carne mechada', 'g')]).toBe(7000);
    });

    it('una lista vacía no rompe nada', () => {
        expect(leerAdelanto([]).cocinado).toEqual({});
        expect(leerAdelanto(null).descontados).toEqual([]);
    });
});
