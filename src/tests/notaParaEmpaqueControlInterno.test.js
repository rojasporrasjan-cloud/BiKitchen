import { describe, it, expect } from 'vitest';
import { notaParaEmpaque } from '../utils/productionHelpers.js';

/**
 * La columna "Especificaciones" la lee quien empaca, y solo le sirve para:
 * si el cliente no come algo, si hay un cambio, si es two pack, si lleva cenas
 * o desayunos, o si lleva otro pack.
 *
 * Se le estaban colando las notas de control que dejamos NOSOTROS al ordenar la
 * base —quien pago, de que chat salio el dato, que le falta al pedido—. En la
 * hoja del miercoles 2 de setiembre salio impreso, en la casilla de Randall
 * Cerdas: 'Gina confirmo "ya pago" y "entrega en la manana" (chat 31 ago).
 * FALTA LA ZONA'. Nada de eso le dice a nadie que meter en la bolsa, y tapa lo
 * que si importa.
 */
describe('la nota de empaque no lleva control interno', () => {

    it('quita el estado de pago y de donde salio el dato', () => {
        expect(notaParaEmpaque(
            'Gina confirmó "ya pagó" y "entrega en la mañana" (chat 31 ago). FALTA LA ZONA: el mensaje la dejó en blanco.'
        )).toBe('');
    });

    it('quita "ya viene pagado" y "no se cobra aparte"', () => {
        expect(notaParaEmpaque(
            'Ya viene pagado dentro de #ORD-I050U5UOTB · no se cobra aparte.'
        )).toBe('');
    });

    it('quita "sin cargo" y deja lo que si hay que cocinar', () => {
        expect(notaParaEmpaque(
            'REPOSICIÓN sin cargo · cenas del menú 25-31 ago que no se entregaron · Todo menos arroz, por favor'
        )).toBe('Todo menos arroz, por favor');
    });

    it('deja intactas las notas del cliente', () => {
        expect(notaParaEmpaque('Sin vainicas')).toBe('Sin vainicas');
        expect(notaParaEmpaque('Sin res ni cerdo')).toBe('Sin res ni cerdo');
        expect(notaParaEmpaque('No aguacate ni remolacha Porfavor')).toBe('No aguacate ni remolacha Porfavor');
        expect(notaParaEmpaque('Lleva 2 packs de desayunos')).toBe('Lleva 2 packs de desayunos');
    });

    it('quita los precios de adentro de una frase, pero deja la frase', () => {
        // A quien empaca le sirve saber QUE guarniciones van; cuanto costaron no.
        expect(notaParaEmpaque(
            'ADICIONALES: Picadillo de vainica y zanahoria (4 porciones) ₡6.500 y Vegetales salteados (4 tazas) ₡7.500'
        )).toBe('ADICIONALES: Picadillo de vainica y zanahoria (4 porciones) y Vegetales salteados (4 tazas)');
    });

    it('una instruccion de entrega con hora se queda', () => {
        expect(notaParaEmpaque('Entregar después de las 11 am'))
            .toBe('Entregar después de las 11 am');
    });
});
