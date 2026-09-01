import { describe, it, expect } from 'vitest';
import { porcionesDelPack, avisoDeFamilia, getDefaultGrams } from '../utils/packClassification.js';

/**
 * Correcciones de Gina al sacar la hoja del miercoles 2 de setiembre de 2026.
 * El vegetal y la harina eran 1 y 0,5 fijos para TODAS las familias.
 */
describe('cuanto lleva cada plato', () => {

    it('Keto lleva 1,5 taza de vegetal, no 1', () => {
        expect(porcionesDelPack('Pack Semanal Keto').vegetal).toBe(1.5);
    });

    it('Keto no lleva harina', () => {
        expect(porcionesDelPack('Pack Semanal Keto').carbo).toBe(0);
    });

    it('Casaditos: 1,5 de harina y 0,5 de vegetal — estaba al reves', () => {
        const p = porcionesDelPack('Pack Casaditos');
        expect(p.carbo).toBe(1.5);
        expect(p.vegetal).toBe(0.5);
        expect(p.proteina).toBe(100);
    });

    it('Bajo Calorias no se movio', () => {
        expect(porcionesDelPack('Pack Bajo Calorías')).toMatchObject({ proteina: 120, vegetal: 1, carbo: 0.5 });
    });

    it('Sin Carbos no lleva harina', () => {
        expect(porcionesDelPack('Pack Sin Carbos').carbo).toBe(0);
    });

    it('los familiares no se miden en gramos por persona', () => {
        const p = porcionesDelPack('Paquete Deluxe');
        expect(p.proteina).toBeNull();
        expect(p.textoPorcion).toBe('1 KG O 4 TAZAS POR PLATO');
    });

    it('acepta tanto el nombre del pack como la clave del menu', () => {
        expect(porcionesDelPack('casaditos').carbo).toBe(1.5);
        expect(porcionesDelPack('Pack Casaditos').carbo).toBe(1.5);
    });

    it('un pack desconocido cae al valor de siempre', () => {
        expect(porcionesDelPack('Pack Raro')).toMatchObject({ proteina: 150, vegetal: 1, carbo: 0.5 });
    });

    it('el gramaje escrito en el nombre sigue mandando', () => {
        // Los PERSONALIZADO dependen de esto.
        expect(getDefaultGrams('PERSONALIZADO — Sonia Oreamuno (100 g)')).toBe(100);
    });
});

describe('las familias que se cocinan aparte se avisan', () => {
    it('marca keto y vegetariano', () => {
        expect(avisoDeFamilia('Pack Semanal Keto')).toMatch(/KETO/);
        expect(avisoDeFamilia('Pack Vegetariano')).toMatch(/VEGETARIANO/);
    });
    it('las demas no llevan aviso', () => {
        expect(avisoDeFamilia('Pack Bajo Calorías')).toBe('');
        expect(avisoDeFamilia('Pack Casaditos')).toBe('');
    });
});

describe('el aviso llega al Excel', () => {
    it('el titulo del menu keto dice que se cocina aparte', async () => {
        const { construirLibroGina } = await import('../utils/excelHojaProduccion.js');
        const wb = construirLibroGina({
            etiquetaDia: 'MIERCOLES 02 SETIEMBRE', entregas: [], individuales: [], desayunos: [],
            familias: [{
                titulo: 'Pack Keto',
                menu1: {
                    titulo: 'Menú #1 Pack Keto',
                    aviso: 'KETO — SE COCINA APARTE',
                    porciones: ['200 GRAMOS DE PROTEINA', '1.5 TAZA(S) DE VEGETALES'],
                    llevaCarbo: false, llevaVegetal: true, totalPlatos: 1,
                    platos: [{ numero: 1,
                        proteina: { nombre: 'Filet de tilapia en mantequilla', gramosPorPorcion: 200 },
                        vegetal: { nombre: 'Zuchinnis a la parmesana', cantidadPorPorcion: 1.5 } }],
                    clientes: []
                },
                menu2: null
            }]
        });
        const ws = wb.getWorksheet('Pack Keto');
        expect(String(ws.getCell('A3').value)).toContain('SE COCINA APARTE');
    });

    it('un pack sin aviso conserva su titulo tal cual', async () => {
        const { construirLibroGina } = await import('../utils/excelHojaProduccion.js');
        const wb = construirLibroGina({
            etiquetaDia: 'X', entregas: [], individuales: [], desayunos: [],
            familias: [{ titulo: 'Pack Bajo Calorías',
                menu1: { titulo: 'Menú #1 Pack Bajo Calorías', porciones: ['120 GRAMOS DE PROTEINA'],
                         llevaCarbo: true, llevaVegetal: true, totalPlatos: 1, platos: [], clientes: [] },
                menu2: null }]
        });
        expect(String(wb.getWorksheet('Pack Bajo Calorías').getCell('A3').value)).toBe('Menú #1 Pack Bajo Calorías');
    });
});
