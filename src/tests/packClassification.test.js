import { describe, it, expect } from 'vitest';
import { mapPackNameToMenuKey, isIndividualPack, getDefaultGrams } from '../utils/packClassification';

/**
 * A qué Menú Semanal corresponde cada pack.
 *
 * El ORDEN de las reglas es lo delicado: hay comodines que agarran cualquier
 * cosa ("mensual", "quincenal") y tienen que ir de últimos. Cuando el de
 * desayunos quedó debajo del comodín, un "Pack Desayunos Mensual" recibía el
 * menú de almuerzos y la cocina preparaba carne mechada en vez de gallo pinto.
 */

describe('Los desayunos no se confunden con almuerzos', () => {
    it('un pack de desayunos mensual sigue siendo de desayunos', () => {
        expect(mapPackNameToMenuKey('Pack Desayunos Mensual')).toBe('desayuno');
    });

    it('tampoco el quincenal', () => {
        expect(mapPackNameToMenuKey('Desayunos Quincenal')).toBe('desayuno');
    });

    it('ni escrito como lo escribe la administración', () => {
        expect(mapPackNameToMenuKey('Paquete mensual desayunos')).toBe('desayuno');
        expect(mapPackNameToMenuKey('Pack Desayunos')).toBe('desayuno');
    });
});

describe('El comodín de mensual/quincenal sigue funcionando', () => {
    it('un pack que solo dice cada cuánto viene se asume regular', () => {
        expect(mapPackNameToMenuKey('Pack Mensual')).toBe('regular');
        expect(mapPackNameToMenuKey('two pack quincenal')).toBe('regular');
    });

    it('pero no se traga los packs de proteínas', () => {
        expect(mapPackNameToMenuKey('Pack 5 proteinas mensual')).toBeNull();
    });
});

describe('Cada pack con nombre propio gana sobre el comodín', () => {
    const casos = [
        ['Pack Keto Mensual', 'keto'],
        ['Pack Bajo Calorías Mensual', 'bajoCalorias'],
        ['Pack Sin Carbos Quincenal', 'sinCarbos'],
        ['Pack Vegetariano Mensual', 'vegetariano'],
        ['Pack Casaditos Mensual', 'casaditos'],
        ['Full Pack Mensual', 'fullPack'],
        ['Pack Regular Mensual', 'regular']
    ];

    casos.forEach(([nombre, esperado]) => {
        it(`"${nombre}" → ${esperado}`, () => {
            expect(mapPackNameToMenuKey(nombre)).toBe(esperado);
        });
    });
});

describe('Packs familiares', () => {
    it('deluxe familiar no se lo roba Full Pack', () => {
        expect(mapPackNameToMenuKey('Pack Familiar Deluxe')).toBe('familiarDeluxe');
        expect(mapPackNameToMenuKey('Pack Deluxe')).toBe('fullPack');
    });

    it('premium familiar tiene el suyo', () => {
        expect(mapPackNameToMenuKey('Pack Familiar Premium')).toBe('familiarPremium');
    });

    it('un familiar sin apellido cae en premium', () => {
        expect(mapPackNameToMenuKey('Pack Familiar')).toBe('familiarPremium');
    });
});

describe('Sin menú conocido', () => {
    it('un nombre que no dice nada devuelve null y sale el aviso rojo', () => {
        expect(mapPackNameToMenuKey('Cosa rara')).toBeNull();
        expect(mapPackNameToMenuKey('')).toBeNull();
        expect(mapPackNameToMenuKey(null)).toBeNull();
    });
});

describe('Platos sueltos', () => {
    it('se imprimen desde el pedido, no desde el menú', () => {
        expect(isIndividualPack('Individuales')).toBe(true);
        expect(isIndividualPack('Pack 5 proteinas de 500 g')).toBe(true);
        expect(isIndividualPack('gallo pinto (kg) a granel')).toBe(true);
    });

    it('un pack normal no', () => {
        expect(isIndividualPack('Pack Keto Mensual')).toBe(false);
        expect(isIndividualPack('Pack Desayunos')).toBe(false);
    });
});

describe('Gramaje por defecto', () => {
    it('cada pack tiene el suyo', () => {
        expect(getDefaultGrams('Pack Bajo Calorías')).toBe(120);
        expect(getDefaultGrams('Pack Sin Carbos')).toBe(120);
        expect(getDefaultGrams('Pack Keto')).toBe(200);
        expect(getDefaultGrams('Pack Regular')).toBe(100);
        expect(getDefaultGrams('Pack Casaditos')).toBe(100);
        expect(getDefaultGrams('Full Pack')).toBe(150);
    });

    it('un nombre vacío no revienta', () => {
        expect(getDefaultGrams(null)).toBe(150);
    });
});
