import { describe, test, expect } from 'vitest';
import {
    cleanIndividualDishName,
    isMoldOrSpecialDish,
    isBulkDishCandidate,
    parseQuantityAndUnit,
    claveGranel,
    sumarAGranel
} from '../utils/granelKitchen';

describe('Hoja de Cocina - Pruebas de Parseo y Porciones', () => {

    test('Arlene Alvarado: "4 tazas Gallo pinto" debe parsear a 4 taza(s)', () => {
        const rawName = "4 tazas Gallo pinto ( en dos tazas frijoles mas suaves )";
        const cleanName = cleanIndividualDishName(rawName);
        expect(cleanName).toBe("Gallo pinto");

        const parsed = parseQuantityAndUnit(rawName, "", 1);
        expect(parsed.totalQty).toBe(4);
        expect(parsed.unit).toBe("taza(s)");
    });

    test('Johanny Varela vs Leonel Vindas: explicitGrams (500g) debe ganar sobre el texto del plan ("Pack 5 Proteínas (250g)")', () => {
        const rawName = "Fajitas de pollo en agridulce";
        const planText = "Pack 5 Proteínas (250g)";
        const pGramsCatalog = 500;

        const parsed = parseQuantityAndUnit(rawName, planText, 1, pGramsCatalog);
        expect(parsed.totalQty).toBe(500);
        expect(parsed.portionGrams).toBe(500);
        expect(parsed.unit).toBe("g");
    });

    test('Johanny Varela (250g) sin explicitGrams en plato pero con 250g en plan', () => {
        const rawName = "Cerdo en salsa de piña";
        const planText = "Pack 3 Proteínas (250g)";
        const parsed = parseQuantityAndUnit(rawName, planText, 1);
        expect(parsed.totalQty).toBe(250);
        expect(parsed.portionGrams).toBe(250);
        expect(parsed.unit).toBe("g");
    });

    test('Acompañamientos / Arroces / Frijoles sin gramaje explícito caen por defecto en taza(s)', () => {
        const parsed = parseQuantityAndUnit("Picadillo de papa", "", 1);
        expect(parsed.totalQty).toBe(1);
        expect(parsed.unit).toBe("taza(s)");
    });

    test('Torta de carne NO debe ir a moldes especiales, debe ir a la olla a granel', () => {
        const name = "torta de carne con vegetales";
        expect(isMoldOrSpecialDish(name)).toBe(false);
        expect(isBulkDishCandidate(name)).toBe(true);
    });

    test('Moldes de canelones y pancakes SÍ deben ser detectados como especiales', () => {
        expect(isMoldOrSpecialDish("molde de canelones de carne")).toBe(true);
        expect(isMoldOrSpecialDish("pancakes de avena")).toBe(true);
    });

    test('Ensaladas frías NO se envían a ollas de cocción caliente', () => {
        expect(isBulkDishCandidate("coleslaw")).toBe(false);
        expect(isBulkDishCandidate("ensalada verde")).toBe(false);
    });

    test('Gramos con merma del 30%: 750g base rinde 975g cocinados', () => {
        const mapa = {};
        sumarAGranel(mapa, "Cerdo en salsa de piña", 250, "g");
        sumarAGranel(mapa, "Cerdo en salsa de piña", 500, "g");

        const item = mapa[claveGranel("Cerdo en salsa de piña", "g")];
        expect(item.totalQty).toBe(750);
        const conMerma = Math.round(item.totalQty * 1.30);
        expect(conMerma).toBe(975);
    });
});
