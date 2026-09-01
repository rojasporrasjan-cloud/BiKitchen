import { describe, it, expect } from 'vitest';
import { parseQuantityAndUnit } from '../utils/granelKitchen';

describe('Excel & UI Format Quantity Integration', () => {
    const formatQty = (nameStr, count, gramsVal) => {
        const parsed = parseQuantityAndUnit(nameStr, '', count, gramsVal);
        if (parsed.unit === 'g' && parsed.portionGrams) {
            const tazas = Math.round(parsed.totalQty / parsed.portionGrams);
            if (tazas > 1) {
                return `${parsed.totalQty}g (${tazas} porciones de ${parsed.portionGrams}g)`;
            }
            return `${parsed.totalQty}g (${parsed.portionGrams}g)`;
        }
        if (parsed.unit === 'g') {
            return `${parsed.totalQty}g`;
        }
        if (parsed.unit === 'taza(s)') {
            return `${parsed.totalQty} taza${parsed.totalQty > 1 ? 's' : ''}`;
        }
        if (parsed.unit === 'kg') {
            return `${parsed.totalQty} kg`;
        }
        return `${parsed.totalQty} unidad${parsed.totalQty > 1 ? 'es' : ''}`;
    };

    it('formats Luis Lopez Gallo Pinto as 4 tazas (not 4 porciones)', () => {
        const res = formatQty('tazas Gallo pinto (en dos tazas frijoles mas suaves)', 4, null);
        expect(res).toBe('4 tazas');
    });

    it('formats Luis Lopez Picadillo as 500g (2 porciones de 250g)', () => {
        const res = formatQty('picadillo vainica con zanahoria y carne molida', 2, null);
        expect(res).toBe('500g (2 porciones de 250g)');
    });

    it('formats Luis Lopez Enyucados as 500g (2 porciones de 250g)', () => {
        const res = formatQty('Enyucados con carne', 2, null);
        expect(res).toBe('500g (2 porciones de 250g)');
    });
});
