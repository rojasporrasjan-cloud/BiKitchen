import { describe, it, expect } from 'vitest';
import { tituloDeTanda, avisoDeTandasSaltadas } from './tandasDeEmpaque';

describe('tituloDeTanda', () => {
    it('arma el titulo del menu de almuerzos', () => {
        expect(tituloDeTanda({ numero: 1, paso: 'a', menu: 1, familia: 'PACK BAJO EN CALORÍAS', packs: 43 }))
            .toBe('TANDA 1a — PACK BAJO EN CALORÍAS · MENÚ 1 · 43 packs');
    });

    it('marca las cenas', () => {
        expect(tituloDeTanda({ numero: 1, paso: 'b', menu: 2, familia: 'PACK BAJO EN CALORÍAS', packs: 43 }))
            .toBe('TANDA 1b — PACK BAJO EN CALORÍAS · MENÚ 2 (cenas) · 43 packs');
    });

    it('un solo pack va en singular', () => {
        expect(tituloDeTanda({ numero: 8, paso: 'a', menu: 1, familia: 'Paquete Deluxe', packs: 1 }))
            .toBe('TANDA 8a — Paquete Deluxe · MENÚ 1 · 1 pack');
    });

    it('sin familia es el bloque del final', () => {
        expect(tituloDeTanda({ familia: null })).toBe('AL FINAL — lo que no pertenece a ningún pack');
        expect(tituloDeTanda({})).toBe('AL FINAL — lo que no pertenece a ningún pack');
        expect(tituloDeTanda(null)).toBe('AL FINAL — lo que no pertenece a ningún pack');
    });
});

describe('avisoDeTandasSaltadas', () => {
    it('sin huecos no dice nada', () => {
        expect(avisoDeTandasSaltadas({ saltadas: [] })).toBe('');
        expect(avisoDeTandasSaltadas({})).toBe('');
        expect(avisoDeTandasSaltadas(null)).toBe('');
    });

    it('explica por que falta una tanda', () => {
        const r = avisoDeTandasSaltadas({ saltadas: [{ numero: 4, nombre: 'PACK REGULAR' }] });
        expect(r).toContain('No hay tanda 4');
        expect(r).toContain('PACK REGULAR');
        expect(r).toContain('ya salieron arriba');
    });

    it('junta varias', () => {
        const r = avisoDeTandasSaltadas({ saltadas: [
            { numero: 2, nombre: 'SIN CARBOS' }, { numero: 4, nombre: 'REGULAR' }
        ] });
        expect(r).toContain('No hay tanda 2 ni 4');
        expect(r).toContain('SIN CARBOS y REGULAR');
    });
});
