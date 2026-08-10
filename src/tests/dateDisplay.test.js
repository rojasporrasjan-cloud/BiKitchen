import { describe, it, expect } from 'vitest';
import { formatFechaCorta, diasHasta, textoRelativo } from '../utils/dateDisplay';

const el = (iso) => new Date(`${iso}T12:00:00`);

describe('formatFechaCorta', () => {
    it('muestra día, número y mes en español', () => {
        // 2026-08-19 cae miércoles
        expect(formatFechaCorta('2026-08-19')).toBe('mié 19 ago');
        expect(formatFechaCorta('2026-01-01')).toBe('jue 1 ene');
        expect(formatFechaCorta('2026-12-25')).toBe('vie 25 dic');
    });

    it('no revienta con basura', () => {
        expect(formatFechaCorta(null)).toBe('—');
        expect(formatFechaCorta('')).toBe('—');
        expect(formatFechaCorta('no es fecha')).toBe('no es fecha');
    });
});

describe('diasHasta', () => {
    const hoy = el('2026-08-16');

    it('cuenta los días hacia adelante', () => {
        expect(diasHasta('2026-08-16', hoy)).toBe(0);
        expect(diasHasta('2026-08-17', hoy)).toBe(1);
        expect(diasHasta('2026-08-19', hoy)).toBe(3);
    });

    it('cuenta los días hacia atrás en negativo', () => {
        expect(diasHasta('2026-08-15', hoy)).toBe(-1);
        expect(diasHasta('2026-08-09', hoy)).toBe(-7);
    });

    it('cruza fin de mes sin equivocarse', () => {
        expect(diasHasta('2026-09-02', el('2026-08-26'))).toBe(7);
        expect(diasHasta('2026-03-01', el('2026-02-27'))).toBe(2);
    });

    it('no importa la hora del día de referencia', () => {
        expect(diasHasta('2026-08-19', new Date('2026-08-16T23:59:00'))).toBe(3);
        expect(diasHasta('2026-08-19', new Date('2026-08-16T00:01:00'))).toBe(3);
    });

    it('devuelve null si la fecha no sirve', () => {
        expect(diasHasta(null, hoy)).toBeNull();
        expect(diasHasta('cualquier cosa', hoy)).toBeNull();
    });
});

describe('textoRelativo', () => {
    it('traduce los días a lenguaje normal', () => {
        expect(textoRelativo(0)).toBe('hoy');
        expect(textoRelativo(1)).toBe('mañana');
        expect(textoRelativo(3)).toBe('en 3 días');
        expect(textoRelativo(-1)).toBe('era ayer');
        expect(textoRelativo(-5)).toBe('hace 5 días');
    });

    it('devuelve vacío si no hay dato', () => {
        expect(textoRelativo(null)).toBe('');
        expect(textoRelativo(undefined)).toBe('');
    });
});
