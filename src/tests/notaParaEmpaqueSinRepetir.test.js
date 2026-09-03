import { describe, it, expect } from 'vitest';
import { notaParaEmpaque } from '../utils/productionHelpers.js';

/**
 * La casilla de especificaciones es lo unico que quien empaca lee con calma.
 * Cada linea que repite algo ya impreso al lado entierra la que si importa.
 *
 * En la casilla de Dalia Parrales salian cuatro cosas y tres ya estaban en la
 * hoja: que lleva 3 packs (el nombre dice "Dalia Parrales (3)"), la regalia de
 * desayunos (la etiqueta "Lleva desayunos") y el gramaje (el encabezado de la
 * tabla). De lo suyo, solo "NO CERDO" era informacion nueva.
 */
describe('lo que la hoja ya imprime en otra parte no se repite', () => {
    it('la cantidad de packs ya sale al lado del nombre', () => {
        expect(notaParaEmpaque('LLEVA 3 PACKS · NO CERDO · poner los packs en bolsa'))
            .toBe('NO CERDO · poner los packs en bolsa');
        expect(notaParaEmpaque('2 packs. · SE HACE ENTREGA LUNES Y MIERCOLES.'))
            .toBe('SE HACE ENTREGA LUNES Y MIERCOLES.');
    });

    it('la regalia de desayunos ya sale como etiqueta', () => {
        expect(notaParaEmpaque('Regalia desayunos · Cambiar fajitas de cerdo por LASAGNA DE POLLO'))
            .toBe('Cambiar fajitas de cerdo por LASAGNA DE POLLO');
        expect(notaParaEmpaque('Regalia pack de desayunos. · NO TILAPIA')).toBe('NO TILAPIA');
    });

    it('"TWO PACK = 2 packs del mismo menu" ya sale como etiqueta', () => {
        expect(notaParaEmpaque('TWO PACK = 2 packs del mismo menú (10 comidas, 5 c/u) · NO lleva cena'))
            .toBe('NO lleva cena');
    });

    it('el gramaje del pack ya sale en el encabezado', () => {
        expect(notaParaEmpaque('NO CERDO · 120 g proteína / 1 taza vegetal / 0.5 taza harina'))
            .toBe('NO CERDO');
    });

    it('"menu personalizado" ya sale en el nombre del pack', () => {
        expect(notaParaEmpaque('NO CHILE DULCE · Menú personalizado, sin carbohidratos'))
            .toBe('NO CHILE DULCE');
    });

    // La trampa: quitar de mas es peor que dejar de mas.
    it('NO se come una instruccion parecida', () => {
        expect(notaParaEmpaque('NO lleva cena')).toBe('NO lleva cena');
        expect(notaParaEmpaque('Lleva ADICIONAL: picadillo de vainica con zanahoria'))
            .toContain('picadillo de vainica');
        expect(notaParaEmpaque('REGALIA: 2 proteinas de 250 g.')).toContain('2 proteinas de 250 g');
        expect(notaParaEmpaque('Desayunos: solo gallo pinto')).toBe('Desayunos: solo gallo pinto');
        expect(notaParaEmpaque('Lleva 2 packs de desayunos')).toContain('desayunos');
    });
});

describe('lo que no es asunto de empaque', () => {
    it('el descuento es cobro, no empaque', () => {
        expect(notaParaEmpaque('Cambiar tortas de espinaca por TORTAS DE YUCA · Lleva 20% de descuento'))
            .toBe('Cambiar tortas de espinaca por TORTAS DE YUCA');
    });

    it('el telefono que falta es tarea de oficina', () => {
        expect(notaParaEmpaque('ENTREGAR ANTES DE LAS 10 AM · FALTA EL TELÉFONO: el mensaje no lo trae'))
            .toBe('ENTREGAR ANTES DE LAS 10 AM');
        expect(notaParaEmpaque('SIN TELEFONO · pedirlo')).toBe('');
    });

    it('pero un telefono de contacto para entregar SI se queda', () => {
        expect(notaParaEmpaque('Llamar al 7157-8779 antes de entregar')).toContain('7157-8779');
    });
});

describe('las instrucciones de verdad no se tocan', () => {
    const casos = [
        'NO CERDO',
        'NO MARISCOS',
        'NO TILAPIA',
        'NO LACTEOS',
        'Intolerancia al huevo y cerdo',
        'TODO MENOS ARROZ, por favor',
        'PROTEÍNA DE 200 g, no los 120 g normales',
        'ENTREGAR DESPUES DE LAS 11 AM',
        'poner los packs en bolsa',
        'Cambiar camotes en gajos por papas en gajos y chayote'
    ];
    casos.forEach(c => it(`deja pasar: ${c}`, () => expect(notaParaEmpaque(c)).toBe(c)));
});
