import { describe, it, expect } from 'vitest';
import { mapPackNameToMenuKey } from '../utils/packClassification';

/**
 * "Pack Regular con Regalía Desayunos" es un pack REGULAR, no uno de desayunos.
 *
 * Casi todos los packs llevan los desayunos de regalía y el nombre termina en
 * "con Regalía Desayunos". Las otras familias se salvaban porque su palabra
 * aparece antes en la lista de reglas; el Regular no, y la palabra "desayuno"
 * se lo llevaba: la hoja lo cocinaba como pack de desayunos y los almuerzos no
 * se hacian.
 *
 * Lo agarramos el 6 de setiembre de 2026 con tres pedidos vivos: los dos packs
 * de Christian Vargas (lunes 14 y 21) y el de Catherine Ordóñez, que entregaba
 * al día siguiente.
 */
describe('packs Regular que además llevan desayunos', () => {
    it('el de Catherine Ordóñez es regular, no desayuno', () => {
        expect(mapPackNameToMenuKey('Pack mensual Regular con desayunos')).toBe('regular');
    });

    it('los dos packs de Christian Vargas son regulares', () => {
        expect(mapPackNameToMenuKey('Pack Regular Mensual con Regalia Desayunos')).toBe('regular');
        expect(mapPackNameToMenuKey('Pack Regular Mensual Almuerzo y Cena con Regalia Desayunos')).toBe('regular');
    });

    it('un pack que SOLO habla de desayunos sigue siendo de desayunos', () => {
        expect(mapPackNameToMenuKey('Pack de Desayunos')).toBe('desayuno');
        expect(mapPackNameToMenuKey('Pack Desayunos Semanal')).toBe('desayuno');
    });

    it('las demás familias no cambian aunque nombren los desayunos', () => {
        expect(mapPackNameToMenuKey('Pack Mensual Bajo en Calorías - REGALÍA DESAYUNOS')).toBe('bajoCalorias');
        expect(mapPackNameToMenuKey('Two Pack Sin Carbos Mensual con Regalía Desayuno')).toBe('sinCarbos');
        expect(mapPackNameToMenuKey('Two Pack Mensual Casaditos con Regalía Desayunos')).toBe('casaditos');
        expect(mapPackNameToMenuKey('Full Pack Mensual con Regalía Desayunos')).toBe('fullPack');
        expect(mapPackNameToMenuKey('🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Sin Carbos')).toBe('sinCarbos');
        expect(mapPackNameToMenuKey('Two Pack Semanal - Full Pack (7 comidas) con Desayunos')).toBe('fullPack');
    });

    it('un pack de proteínas con desayunos sigue siendo proteínas sueltas', () => {
        expect(mapPackNameToMenuKey('Pack 5 Proteínas 250 g')).toBeNull();
    });
});
