import { describe, it, expect } from 'vitest';
import {
    tieneCambioEscrito, elCambioEscrito, apartarCambiosEscritos, packsDe
} from '../utils/cambiosEscritos';

/**
 * Las notas son las REALES de la hoja del viernes 11 de setiembre de 2026.
 *
 * De 32 clientes en la hoja blanca de bajo calorias, siete llevaban un cambio
 * escrito y ninguno estaba en la hoja de cambios. Eso es lo que se pierde en la
 * mesa de empaque: treinta packs iguales y siete que no lo son.
 */

describe('reconocer un cambio escrito en la nota', () => {
    it('agarra el de Mauricio Vargas', () => {
        expect(tieneCambioEscrito('Cambiar burrito por PINTO CON HUEVO REVUELTOS.')).toBe(true);
    });

    it('agarra el de Karla Juarez', () => {
        expect(tieneCambioEscrito(
            'Cambiar cochinita y almuercitos por fajitas de lomo encebolladas y otro plato de pollo napolitano'
        )).toBe(true);
    });

    it('agarra una restriccion: no puede comer mariscos', () => {
        expect(tieneCambioEscrito('NO PUEDE COMER MARISCOS.')).toBe(true);
    });

    it('agarra "poner platos de..."', () => {
        expect(tieneCambioEscrito('Poner platos de LENTEJAS Y GARBANZOS CON CARNE DE CERDO.')).toBe(true);
    });

    it('agarra la negacion de un ingrediente', () => {
        expect(tieneCambioEscrito('NO VAINICAS.')).toBe(true);
        expect(tieneCambioEscrito('SIN RES NI CERDO: reemplazar por TILAPIA AL AJILLO.')).toBe(true);
    });

    it('agarra "en vez de"', () => {
        expect(tieneCambioEscrito('Arroz blanco en vez de ensalada coleslaw')).toBe(true);
    });
});

describe('lo que NO es un cambio de comida', () => {
    it('"Lleva cena" no manda a nadie a la hoja de cambios', () => {
        expect(tieneCambioEscrito('Lleva cena')).toBe(false);
        expect(tieneCambioEscrito('Lleva desayunos')).toBe(false);
        expect(tieneCambioEscrito('Lleva también: PACK SIN CARBOS')).toBe(false);
    });

    it('"TWO PACK" tampoco: son dos packs iguales, no un cambio', () => {
        expect(tieneCambioEscrito('TWO PACK - empacar 2 packs iguales')).toBe(false);
    });

    it('"UN pack por entrega" tampoco', () => {
        expect(tieneCambioEscrito('UN pack por entrega.')).toBe(false);
    });

    it('una instruccion de EMPAQUE no es un cambio de comida', () => {
        // Dalia Parrales caia en la hoja de cambios por esto: "poner los packs"
        // matcheaba, pero habla de la bolsa, no de lo que va adentro.
        expect(tieneCambioEscrito('Poner los packs en bolsa.')).toBe(false);
        expect(tieneCambioEscrito('Empacar en cocina')).toBe(false);
        expect(tieneCambioEscrito('Bolsas aparte por cliente')).toBe(false);
    });

    it('pero "poner PLATOS de" si lo es', () => {
        expect(tieneCambioEscrito('Poner platos de LENTEJAS Y GARBANZOS CON CARNE DE CERDO.')).toBe(true);
    });

    it('quitar la cena NO es un cambio de ingrediente', () => {
        // Marlon Camacho: sus platos son los del menu, solo van menos. Se
        // empaca de corrido con los demas — decision de Jan, 9 de setiembre.
        expect(tieneCambioEscrito('NO lleva cena.')).toBe(false);
        expect(tieneCambioEscrito('No lleva desayunos')).toBe(false);
        // Pero una restriccion de comida SI lo es
        expect(tieneCambioEscrito('NO LACTEOS.')).toBe(true);
        expect(tieneCambioEscrito('NO MARISCOS')).toBe(true);
    });

    it('sin nota no hay cambio', () => {
        expect(tieneCambioEscrito('')).toBe(false);
        expect(tieneCambioEscrito(null)).toBe(false);
        expect(tieneCambioEscrito(undefined)).toBe(false);
    });

    it('una nota mixta SI cuenta: el cambio esta ahi aunque venga acompanado', () => {
        // La de Mauricio de verdad: la instruccion viene entre avisos que no lo son
        expect(tieneCambioEscrito(
            'Cambiar burrito por PINTO CON HUEVO REVUELTOS. · Lleva cena'
        )).toBe(true);
    });
});

describe('mostrar cual es el cambio', () => {
    it('devuelve la frase que lo anuncia, no la nota entera', () => {
        expect(elCambioEscrito('Lleva cena · NO PUEDE COMER MARISCOS. · Two Pack'))
            .toBe('NO PUEDE COMER MARISCOS.');
    });

    it('sin cambio devuelve vacio', () => {
        expect(elCambioEscrito('Lleva cena')).toBe('');
    });
});

describe('apartar los que llevan cambio', () => {
    const CLIENTES = [
        { nombre: 'Wendy Sandoval', observaciones: '', cantidad: 1 },
        { nombre: 'Mauricio Vargas', observaciones: 'Cambiar burrito por PINTO CON HUEVO REVUELTOS.', cantidad: 1 },
        { nombre: 'Priscilla Montoya', observaciones: 'UN pack por entrega. · Lleva cena', cantidad: 1 },
        { nombre: 'Daniel Milanes', observaciones: 'NO PUEDE COMER MARISCOS.', cantidad: 1 },
        { nombre: 'Josue Rojas', observaciones: 'TWO PACK - empacar 2 packs iguales', cantidad: 2 }
    ];

    it('separa las dos hojas', () => {
        const { sinCambio, conCambioEscrito } = apartarCambiosEscritos(CLIENTES);
        expect(conCambioEscrito.map(c => c.nombre)).toEqual(['Mauricio Vargas', 'Daniel Milanes']);
        expect(sinCambio.map(c => c.nombre)).toEqual(['Wendy Sandoval', 'Priscilla Montoya', 'Josue Rojas']);
    });

    it('los packs se cuentan aparte, y el Two Pack cuenta por dos', () => {
        const { sinCambio, conCambioEscrito } = apartarCambiosEscritos(CLIENTES);
        expect(packsDe(sinCambio)).toBe(4);
        expect(packsDe(conCambioEscrito)).toBe(2);
    });

    it('se puede decir de donde leer la nota', () => {
        const otros = [{ n: 'X', nota: 'Cambiar arroz por pure' }];
        const r = apartarCambiosEscritos(otros, (c) => c.nota);
        expect(r.conCambioEscrito).toHaveLength(1);
    });

    it('sin clientes no revienta', () => {
        expect(apartarCambiosEscritos()).toEqual({ sinCambio: [], conCambioEscrito: [] });
        expect(packsDe()).toBe(0);
    });
});
