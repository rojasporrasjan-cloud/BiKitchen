import { describe, it, expect } from 'vitest';
import { notaParaEmpaque } from '../utils/productionHelpers';

/**
 * La casilla de especificaciones solo dice QUE meter en la bolsa.
 *
 * En la hoja del miercoles 9 de setiembre, la casilla de Hazel Jimenez traia
 * cuatro renglones y ninguno servia para empacar: la contabilidad de sus dos
 * packs, el envio gratis, el total del pedido y una frase cortada a la mitad
 * —"El otro (Sin Carbos quincenal) va en."— porque al numero del otro pedido
 * se lo quitaban ANTES de preguntar si la frase era interna, y sin el "#ORD-"
 * ya no lo parecia.
 */
describe('las especificaciones de la hoja del miercoles 9', () => {
    it('la referencia al otro pedido no se imprime cortada', () => {
        const nota = notaParaEmpaque(
            'PACK 1 DE 2: este es el SIN CARBOS de almuerzo y cena. '
            + 'El otro (Regular) va en #ORD-MIE9-HAZEL-REGULAR.');
        expect(nota).not.toMatch(/va en/i);
        expect(nota).not.toMatch(/PACK 1 DE 2/i);
        expect(nota.trim()).toBe('');
    });

    it('la contabilidad del pedido se queda guardada, no impresa', () => {
        const nota = notaParaEmpaque(
            'Envio GRATIS. Los dos son MENSUALES: 4 entregas. '
            + 'Total del pedido completo: 337.220.');
        expect(nota.trim()).toBe('');
    });

    it('no repite el aviso de Two Pack que la hoja ya imprime sola', () => {
        const nota = notaParaEmpaque(
            'TWO PACK: se empacan 2 packs iguales. '
            + 'La cantidad va en 1 porque la hoja lo duplica sola.');
        expect(nota.trim()).toBe('');
    });

    it('la instruccion de cocina sigue saliendo entera', () => {
        const nota = notaParaEmpaque(
            'SIN RES NI CERDO: reemplazar por TILAPIA AL AJILLO y '
            + 'TILAPIA EN SALSA DE CURRY. Envio GRATIS.');
        expect(nota).toMatch(/TILAPIA AL AJILLO/);
        expect(nota).toMatch(/TILAPIA EN SALSA DE CURRY/);
        expect(nota).not.toMatch(/gratis/i);
    });

    it('el cambio de plato no se pierde por venir pegado a lo interno', () => {
        const nota = notaParaEmpaque(
            'NO VAINICAS. Cambiar ZUCHINNIS por ENSALADA COLESLAW. '
            + 'Total del pedido completo: 77.500.');
        expect(nota).toMatch(/NO VAINICAS/i);
        expect(nota).toMatch(/Cambiar ZUCHINNIS por ENSALADA COLESLAW/i);
        expect(nota).not.toMatch(/77\.500/);
    });

    it('una instruccion con la referencia al chat pegada NO se bota', () => {
        // Esto es lo que se rompia si el orden se arreglaba a lo bruto:
        // NOTA_INTERNA reconoce "(chat", asi que esa referencia si hay que
        // limpiarla antes de juzgar la frase.
        const nota = notaParaEmpaque('Cambiar gallo pinto por BURRITOS (chat 2 set)');
        expect(nota).toMatch(/BURRITOS/);
    });
});
