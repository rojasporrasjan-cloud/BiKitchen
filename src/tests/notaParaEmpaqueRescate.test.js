import { describe, it, expect } from 'vitest';
import { notaParaEmpaque } from '../utils/productionHelpers.js';

/**
 * El filtro botaba la frase ENTERA cuando mencionaba el chat o un numero de
 * pedido. Como la instruccion venia en esa misma frase, se iba con ella:
 *
 *   Daniel Milanes    "No puede comer mariscos. REEMPLAZA a #ORD-..."  -> nada
 *   Diana Morera      "RESTRICCIONES — no incluir: aguacate; ... #ORD-" -> "RESTRICCIONES"
 *   Alexandra Mora    "Cambiar fajitas de cerdo por MILANESA (chat)"   -> nada
 *   Guillermo Vargas  "NO MARISCOS · cambiar TILAPIA por ... (chat)"   -> "NO MARISCOS"
 *
 * A quien empaca le llegaba una casilla vacia donde iba una alergia.
 */
describe('la referencia al chat ya no se lleva la instruccion', () => {
    it('Alexandra Mora conserva su cambio de plato', () => {
        expect(notaParaEmpaque('Cambiar fajitas de cerdo por MILANESA DE POLLO (chat 2 set)'))
            .toBe('Cambiar fajitas de cerdo por MILANESA DE POLLO');
    });

    it('Guillermo Vargas conserva NO MARISCOS y el cambio', () => {
        const r = notaParaEmpaque('NO MARISCOS · Casaditos: cambiar la TILAPIA del primer plato por CARNE MECHADA EN SALSA (chat 2 set)');
        expect(r).toContain('NO MARISCOS');
        expect(r).toContain('CARNE MECHADA EN SALSA');
    });

    it('Pablo Leiva conserva el DEBE y el cambio', () => {
        const r = notaParaEmpaque('DEBE · Cambiar picadillo con chayote por PAPITAS SALTEADAS (chat 2 set)');
        expect(r).toContain('DEBE');
        expect(r).toContain('PAPITAS SALTEADAS');
    });

    it('el numero de pedido no se lleva la alergia de Daniel', () => {
        const r = notaParaEmpaque('No puede comer mariscos. REEMPLAZA a #ORD-J1Q6G6V590, que quedo cancelado con el precio en 0.');
        expect(r).toContain('mariscos');
        expect(r).not.toContain('ORD-');
    });

    it('las restricciones de Diana sobreviven al numero de pedido', () => {
        const r = notaParaEmpaque('RESTRICCIONES — no incluir: aguacate; platanos o maduros. Telefono tomado de su pedido anterior #ORD-43T5EORON6, confirmar.');
        expect(r).toContain('aguacate');
        expect(r).toContain('platanos o maduros');
        expect(r).not.toContain('ORD-');
    });
});

describe('el resto del parentesis cortado no se imprime', () => {
    it('a Allan Quesada le queda el cambio, no la cola', () => {
        const r = notaParaEmpaque('DESAYUNOS: cambiar gallo pinto por BURRITOS (chat 2 set — reemplaza el cambio anterior a flautas)');
        expect(r).toBe('DESAYUNOS: cambiar gallo pinto por BURRITOS');
    });

    it('no deja parentesis vacios', () => {
        expect(notaParaEmpaque('La entrega del miercoles va aparte (#ORD-RANDALL-BC-0902)'))
            .not.toMatch(/\(\s*\)/);
    });
});

describe('lo que va despues de INTERNO: no se imprime', () => {
    it('corta ahi y deja solo la instruccion', () => {
        expect(notaParaEmpaque('ENTREGAR DESPUES DE LAS 11 AM. INTERNO: reactivado el 3 set, se habia anulado por error.'))
            .toBe('ENTREGAR DESPUES DE LAS 11 AM.');
    });

    it('si todo es interno, la casilla queda vacia', () => {
        expect(notaParaEmpaque('INTERNO: sin telefono, pedirlo. La entrega del 31 ya paso.')).toBe('');
    });

    it('respeta minusculas y espacios', () => {
        expect(notaParaEmpaque('NO TILAPIA. interno : cualquier cosa')).toContain('NO TILAPIA');
    });
});

describe('una frase que se quedo sin numeros no se imprime coja', () => {
    it('Jenny Alvarado: sin el monto, la frase no dice nada', () => {
        const r = notaParaEmpaque('Cambiar pure de papas por papas salteadas · REVISAR ENVIO: el mensaje dice ₡6.000 pero el total de ₡42.900 solo cuadra con ₡9.000');
        expect(r).toBe('Cambiar pure de papas por papas salteadas');
    });
});

describe('lo que ya funcionaba sigue igual', () => {
    it('una nota limpia pasa entera', () => {
        expect(notaParaEmpaque('NO CERDO · poner los packs en bolsa'))
            .toBe('NO CERDO · poner los packs en bolsa');
    });

    it('el rastro de nuestras correcciones no se imprime', () => {
        const r = notaParaEmpaque('TWO PACK = 2 packs del mismo menu · NO lleva cena · Corregido: estaba cargado como cantidad 2 y la hoja lo contaba como 4 packs');
        expect(r).toContain('NO lleva cena');
        expect(r).not.toContain('Corregido');
    });

    it('un telefono dentro de una instruccion se queda', () => {
        expect(notaParaEmpaque('Llamar al 7157-8779 antes de entregar')).toContain('7157-8779');
    });

    it('sin nota, nada', () => {
        expect(notaParaEmpaque('')).toBe('');
        expect(notaParaEmpaque(null)).toBe('');
    });
});
