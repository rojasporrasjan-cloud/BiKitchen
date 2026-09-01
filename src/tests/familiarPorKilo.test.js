import { describe, it, expect } from 'vitest';
import { porcionesDelPack } from '../utils/packClassification.js';

/**
 * "Esos platos son de 1 kg cada uno, o sea taza de kilo, no 150 gramos como
 * tenemos" — Jan, sobre el Familiar Deluxe.
 *
 * El plato de un pack familiar es una BANDEJA para cuatro personas, no una
 * porcion. La hoja lo cocinaba con los 150 g por defecto: para el Paquete
 * Deluxe de Rebeca Toval —siete platos— eso son 1.365 g cuando hacen falta
 * 9.100. Faltaban casi ocho kilos de comida.
 */
describe('los platos familiares son de 1 kg', () => {

    it('el Deluxe se cocina por kilo, no por los 150 g de siempre', () => {
        expect(porcionesDelPack('Paquete Deluxe').proteina).toBe(1000);
    });

    it('el Familiar Premium tambien', () => {
        expect(porcionesDelPack('Pack Familiar Premium').proteina).toBe(1000);
    });

    it('pero la hoja NO imprime "1000" por plato: dice la porcion de verdad', () => {
        // El numero por persona no significa nada en una bandeja para cuatro.
        expect(porcionesDelPack('Paquete Deluxe').textoPorcion).toBe('1 KG O 4 TAZAS POR PLATO');
        expect(porcionesDelPack('Paquete Deluxe').porcionCorta).toBe('1 kg o 4 tazas');
    });

    it('los packs individuales no se movieron', () => {
        expect(porcionesDelPack('Pack Bajo Calorías').proteina).toBe(120);
        expect(porcionesDelPack('Pack Casaditos').proteina).toBe(100);
        expect(porcionesDelPack('Pack Semanal Keto').proteina).toBe(200);
    });
});
