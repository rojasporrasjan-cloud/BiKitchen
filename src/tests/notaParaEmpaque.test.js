/**
 * La hoja de empaque la lee quien arma las cajas. Estas pruebas usan las notas
 * REALES del sábado 29 de agosto: las administrativas se van, las de cocina se
 * quedan intactas.
 */

import { describe, it, expect } from 'vitest';
import { notaParaEmpaque } from '../utils/productionHelpers';

describe('notaParaEmpaque', () => {

    describe('quita lo que no le sirve a quien empaca', () => {
        it('los teléfonos', () => {
            expect(notaParaEmpaque('Diana Jiménez 72047512 / Ricardo Campos 88972181')).toBe('');
        });

        it('las notas internas sobre fechas', () => {
            expect(notaParaEmpaque('Fecha corregida: el chat del 24 ago dice sábado 29, no miércoles 26')).toBe('');
        });

        it('el "revisar chat"', () => {
            expect(notaParaEmpaque('Revisar chat')).toBe('');
        });

        it('los números de orden y los correos', () => {
            expect(notaParaEmpaque('#ORD-2MSHA9HADP')).toBe('');
            expect(notaParaEmpaque('cliente@ejemplo.com')).toBe('');
        });

        it('un precio suelto', () => {
            expect(notaParaEmpaque('₡87.890')).toBe('');
            expect(notaParaEmpaque('155.100 colones')).toBe('');
        });
    });

    describe('conserva lo que cambia lo que va en la caja', () => {
        it('los cambios de plato', () => {
            const nota = 'Cambiar Almuercitos rellenos con carne molida por cochinita pibil';
            expect(notaParaEmpaque(nota)).toBe(nota);
        });

        it('los cambios largos con varias partes', () => {
            const nota = 'Cambiar Relish de vegetales y Mix de vainica, zanahoria y ayote por Vegetales salteados';
            expect(notaParaEmpaque(nota)).toBe(nota);
        });

        it('las preferencias y alergias', () => {
            expect(notaParaEmpaque('Solo zanahoria o chayote')).toBe('Solo zanahoria o chayote');
            expect(notaParaEmpaque('Todo sin chile dulce por favor')).toBe('Todo sin chile dulce por favor');
            expect(notaParaEmpaque('Preferiblemente no enviar comidas con cerdo, cambiarla por alguna otra opcion disponible'))
                .toContain('no enviar comidas con cerdo');
        });

        it('los horarios de entrega', () => {
            expect(notaParaEmpaque('Entregar antes de las 10 am')).toBe('Entregar antes de las 10 am');
        });

        it('una frase que pide llamar conserva el número: sin él no sirve de nada', () => {
            // Marcela Serrano trae "cualquier cosa llamar al 7157-8779 (Shirley)".
            // Ese número es para la entrega, no es un dato administrativo.
            const salida = notaParaEmpaque('Llamar al 88887777 antes de entregar');
            expect(salida).toBe('Llamar al 88887777 antes de entregar');
        });

        it('pero un teléfono suelto, sin instrucción, se sigue botando', () => {
            expect(notaParaEmpaque('Diana Jiménez 72047512 / Ricardo Campos 88972181')).toBe('');
        });
    });

    describe('con varias frases separadas por ·', () => {
        it('deja las de cocina y bota las administrativas', () => {
            const nota = 'Diana Jiménez 72047512 / Ricardo Campos 88972181 · Solo zanahoria o chayote';
            expect(notaParaEmpaque(nota)).toBe('Solo zanahoria o chayote');
        });

        it('conserva los dos cambios de Sebastian Villegas', () => {
            const nota = 'Cambiar la crema por una ensalada | Cambiar Zuchinni y pastel de maduro por Arroz al perejil y Vegetales mixtos';
            const salida = notaParaEmpaque(nota);
            expect(salida).toContain('Cambiar la crema por una ensalada');
            expect(salida).toContain('Arroz al perejil y Vegetales mixtos');
        });

        it('si todo era administrativo, no deja nada', () => {
            expect(notaParaEmpaque('Fecha corregida: el chat del 24 ago dice sábado 29 · #ORD-ABC123')).toBe('');
        });
    });

    describe('entradas vacías', () => {
        it('no revienta', () => {
            expect(notaParaEmpaque('')).toBe('');
            expect(notaParaEmpaque(null)).toBe('');
            expect(notaParaEmpaque(undefined)).toBe('');
        });
    });
});
