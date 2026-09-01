/**
 * El orden en que salen las etiquetas ES el orden en que quedan apiladas sobre
 * la mesa, así que importa tanto como las cantidades.
 *
 * Primero los packs, al final los personalizados —que se arman uno por uno— y
 * una etiqueta divisoria al empezar cada bloque para poder partir la tira.
 */

import { describe, it, expect } from 'vitest';
import { ordenDeTipo, expandGroupsToLabels, TIPO_ETIQUETA, TIPO_INDIVIDUAL, TIPO_PERSONALIZADO } from '../utils/labels/labelDomain';

const grupo = (tipo, dishName, cantidad = 1) => ({ id: `${tipo}|${dishName}`, tipo, dishName, cantidad });

describe('orden de impresión', () => {

    it('los packs van primero y los personalizados de último', () => {
        const tipos = [
            TIPO_PERSONALIZADO,
            TIPO_INDIVIDUAL,
            TIPO_ETIQUETA.desayuno,
            'Bajo Calorías Cena',
            TIPO_ETIQUETA.bajoCalorias,
            TIPO_ETIQUETA.regular
        ];
        const ordenados = [...tipos].sort((a, b) => ordenDeTipo(a) - ordenDeTipo(b));

        expect(ordenados).toEqual([
            TIPO_ETIQUETA.regular,
            TIPO_ETIQUETA.bajoCalorias,
            'Bajo Calorías Cena',
            TIPO_ETIQUETA.desayuno,
            TIPO_INDIVIDUAL,
            TIPO_PERSONALIZADO
        ]);
    });

    it('las cenas van después de TODOS los packs, no junto a su familia', () => {
        expect(ordenDeTipo('Bajo Calorías Cena')).toBeGreaterThan(ordenDeTipo(TIPO_ETIQUETA.casaditos));
    });

    it('dentro de los packs se respeta el orden de las familias', () => {
        expect(ordenDeTipo(TIPO_ETIQUETA.regular)).toBeLessThan(ordenDeTipo(TIPO_ETIQUETA.fullPack));
        expect(ordenDeTipo(TIPO_ETIQUETA.fullPack)).toBeLessThan(ordenDeTipo(TIPO_ETIQUETA.bajoCalorias));
    });

    it('un tipo desconocido no se cuela antes de los packs conocidos', () => {
        expect(ordenDeTipo('Algo Raro')).toBeGreaterThan(ordenDeTipo(TIPO_ETIQUETA.familiarDeluxe));
        expect(ordenDeTipo('Algo Raro')).toBeLessThan(ordenDeTipo(TIPO_ETIQUETA.desayuno));
    });
});

describe('etiquetas divisorias', () => {

    it('sin pedirlas, no aparecen: una reimpresión no lleva separador', () => {
        const labels = expandGroupsToLabels([grupo('Full Pack', 'Pollo', 3)], '2026-08-29');
        expect(labels).toHaveLength(3);
        expect(labels.some(l => l.divider)).toBe(false);
    });

    it('pone una sola etiqueta al empezar cada bloque', () => {
        const labels = expandGroupsToLabels([
            grupo('Regular', 'Pollo', 2),
            grupo('Regular', 'Res', 1),
            grupo('Full Pack', 'Cerdo', 2)
        ], '2026-08-29', { conDivisores: true });

        const divisores = labels.filter(l => l.divider);
        expect(divisores).toHaveLength(2);
        expect(divisores.map(d => d.type)).toEqual(['Regular', 'Full Pack']);
        // 5 envases + 2 separadores
        expect(labels).toHaveLength(7);
    });

    it('el divisor va ANTES de las etiquetas de su bloque', () => {
        const labels = expandGroupsToLabels([
            grupo('Regular', 'Pollo', 1),
            grupo('Full Pack', 'Cerdo', 1)
        ], '2026-08-29', { conDivisores: true });

        expect(labels[0]).toMatchObject({ divider: true, type: 'Regular' });
        expect(labels[1].divider).toBeFalsy();
        expect(labels[1].protein).toBe('Pollo');
        expect(labels[2]).toMatchObject({ divider: true, type: 'Full Pack' });
        expect(labels[3].divider).toBeFalsy();
        expect(labels[3].protein).toBe('Cerdo');
    });

    it('el divisor no lleva plato ni vencimiento: no es un envase', () => {
        const [divisor] = expandGroupsToLabels(
            [grupo('Bajo Calorías', 'Pollo', 1)], '2026-08-29', { conDivisores: true }
        );
        expect(divisor.divider).toBe(true);
        expect(divisor.protein).toBe('');
        expect(divisor.expirationDate).toBe('');
    });

    it('los envases siguen llevando su vencimiento', () => {
        const labels = expandGroupsToLabels(
            [grupo('Bajo Calorías', 'Pollo', 2)], '2026-08-29', { conDivisores: true }
        );
        labels.filter(l => !l.divider).forEach(l => {
            expect(l.expirationDate).toBe('29 agosto');
            expect(l.protein).toBe('Pollo');
        });
    });

    it('dos bloques seguidos del mismo tipo comparten un solo divisor', () => {
        const labels = expandGroupsToLabels([
            grupo('Regular', 'Pollo', 1),
            grupo('Regular', 'Res', 1),
            grupo('Regular', 'Cerdo', 1)
        ], '2026-08-29', { conDivisores: true });

        expect(labels.filter(l => l.divider)).toHaveLength(1);
        expect(labels).toHaveLength(4);
    });
});
