/**
 * Qué pedidos llevan cena.
 *
 * Este archivo antes copiaba la expresión regular en vez de importarla, así que
 * pasaba en verde mientras la hoja de producción hacía otra cosa. Ahora prueba
 * la función de verdad —la misma que usan la hoja y las etiquetas— para que no
 * puedan volver a contradecirse.
 */

import { describe, it, expect } from 'vitest';
import { textoLlevaCena, esPromoCena } from '../utils/labels/labelDomain';

describe('Qué pedidos llevan cena', () => {

    describe('sí llevan cena', () => {
        it('cuando el nombre lo dice de frente', () => {
            expect(textoLlevaCena('3 PACK DOS SEMANAS Almuerzo y cena CON DESAYUNOS GRATIS')).toBe(true);
            expect(textoLlevaCena('Pack Quincenal Almuerzo y Cena con Regalía de Desayunos BAJO EN CALORÍAS')).toBe(true);
            expect(textoLlevaCena('pack bajo calorias mensual almuerzos y cenas REGALIA DESAYUNOS')).toBe(true);
        });

        it('la promo de DOS SEMANAS, aunque su nombre corto no mencione la cena', () => {
            // Las dos formas de escribirla cuestan lo mismo (₡87.890): es un solo
            // producto. Dos semanas de solo almuerzo vale ₡49.000.
            expect(textoLlevaCena('🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías')).toBe(true);
            expect(textoLlevaCena('pack dos semanas con desayuno gratis Pack bajo el calorías')).toBe(true);
            expect(textoLlevaCena('pack dos semanas almuerzo y cena con desayuno gratis')).toBe(true);
        });

        it('el quincenal con desayunos', () => {
            expect(textoLlevaCena('Pack Quincenal Bajo Calorías con desayunos')).toBe(true);
        });
    });

    describe('NO llevan cena', () => {
        it('"two pack" son dos packs del MISMO menú, para dos personas', () => {
            // packsData.js lo define como "Plan Parejas: 10 Comidas Totales (5 para
            // cada uno)". La cantidad ya se duplica aparte; sumarle cenas le daba al
            // cliente el doble de lo que pagó.
            expect(textoLlevaCena('Two Pack - Pack Bajo Calorías (Mensual) con desayunos')).toBe(false);
            expect(textoLlevaCena('two pack bajo calorias Mensual - REGALIA DESAYUNOS')).toBe(false);
            expect(textoLlevaCena('Two Pack - Pack Regular (Semanal)')).toBe(false);
        });

        it('un pack normal, aunque sea mensual', () => {
            expect(textoLlevaCena('5 Comidas a la Semana - Pack Regular (Mensual)')).toBe(false);
            expect(textoLlevaCena('PACK MENSUAL BAJO CALORIAS 77.500 colones')).toBe(false);
            expect(textoLlevaCena('pack mensual full pack')).toBe(false);
        });

        it('un pack con desayunos pero sin cena', () => {
            expect(textoLlevaCena('Pack mensual bajo en calorias - REGALÍA DESAYUNOS')).toBe(false);
            expect(textoLlevaCena('pack bajo en calorias con desayunos')).toBe(false);
        });

        it('texto vacío o basura', () => {
            expect(textoLlevaCena('')).toBe(false);
            expect(textoLlevaCena(null)).toBe(false);
            expect(textoLlevaCena(undefined)).toBe(false);
        });
    });

    describe('un two pack que ADEMÁS pidió cena sí la lleva', () => {
        it('porque el pedido lo dice aparte', () => {
            expect(textoLlevaCena('Two Pack - Pack Bajo Calorías almuerzo y cena')).toBe(true);
        });
    });

    describe('esPromoCena mira el pedido completo', () => {
        it('encuentra la cena en el nombre del ítem, no solo en el plan', () => {
            expect(esPromoCena({
                plan: 'Pack Bajo Calorías',
                items: [{ nombre: 'PACK DOS SEMANAS CON DESAYUNOS GRATIS' }]
            })).toBe(true);
        });

        it('encuentra la cena en las observaciones', () => {
            expect(esPromoCena({
                plan: 'Pack Bajo Calorías',
                observaciones: 'lleva cenas también'
            })).toBe(true);
        });

        it('no inventa cenas en un two pack', () => {
            expect(esPromoCena({
                plan: 'Pack Bajo Calorías',
                categoria: 'two_pack',
                items: [{ nombre: 'Two Pack - Pack Bajo Calorías (Mensual)' }]
            })).toBe(false);
        });
    });

    describe('los pedidos reales del sábado 29 de agosto', () => {
        // Se comprobaron uno por uno contra el chat de WhatsApp y el catálogo.
        const CON_CENA = [
            'Pack Quincenal Almuerzo y Cena con Regalía de Desayunos BAJO EN CALORÍAS',  // Ricardo Campos
            'pack bajo calorias mensual almuerzos y cenas REGALIA DESAYUNOS',            // Maycol Ávila / Sylvia Peña
            'pack dos semanas con desayuno gratis - Pack bajo el calorías',              // Wilner Sequera
            '🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías (Promoción Mensual)' // Priscilla Montoya
        ];
        const SIN_CENA = [
            'Two Pack - Pack Bajo Calorías (Mensual) con desayunos',   // José Daniel Benavides
            'two pack bajo calorias Mensual - REGALIA DESAYUNOS',      // Andres Palavicini
            'Pack Regular',                                            // Laura Hernandez (Two Pack semanal)
            'pack mensual full pack',                                  // Adrian Morera
            'PACK MENSUAL BAJO CALORIAS 77.500 colones',               // Dalia Parrales / Wendy Sandoval
            'pack mensual bajo en calorías',                           // Danielo Huertas
            'pack bajo en calorias mensual',                           // Evelyn Montes / Steven Mejías
            'Pack mensual bajo en calorias - REGALÍA DESAYUNOS',       // Jennifer Flores
            'pack bajo en calorias con desayunos',                     // Luis Ricardo Díaz
            'Pack Bajo en Calorías (Mensual)'                          // Sebastian Villegas
        ];

        CON_CENA.forEach(plan => {
            it(`lleva cena: ${plan.slice(0, 52)}`, () => expect(textoLlevaCena(plan)).toBe(true));
        });
        SIN_CENA.forEach(plan => {
            it(`NO lleva cena: ${plan.slice(0, 52)}`, () => expect(textoLlevaCena(plan)).toBe(false));
        });
    });
});
