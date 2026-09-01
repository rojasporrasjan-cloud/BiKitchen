import { describe, it, expect } from 'vitest';
import { construirLibroGina } from '../utils/excelHojaProduccion.js';
import { porcionesDelPack } from '../utils/packClassification.js';

/**
 * El Paquete Deluxe son bandejas para 4 personas: "es por kg o 4 tazas la
 * porcion" (Gina). Al dejar de imprimir los 150 g por persona —que ahi no
 * significan nada— el "Resumen por Menu" se quedaba multiplicando por cero y
 * escribia "0 g" al lado de cada plato: le decia a la cocina que no preparara
 * nada. Peor que el numero equivocado de antes.
 */
const bloqueFamiliar = {
    titulo: 'Menú #1 Paquete Deluxe',
    porciones: ['1 KG O 4 TAZAS POR PLATO'],
    llevaCarbo: false,
    llevaVegetal: false,
    porcionPlato: '1 kg o 4 tazas',
    totalPlatos: 2,
    platos: [{ numero: 1, proteina: { nombre: 'Estofado de carne de res(4 porciones)', gramosPorPorcion: null } }],
    clientes: [{ etiqueta: 'Rebeca Toval (2)', notas: '' }]
};

const libro = (bloque, titulo = 'Paquete Deluxe') => construirLibroGina({
    etiquetaDia: 'MIERCOLES 02 SETIEMBRE', entregas: [], individuales: [], desayunos: [],
    familias: [{ titulo, menu1: bloque, menu2: null }]
});

const celdas = (ws) => {
    const out = [];
    ws.eachRow(r => r.eachCell(c => out.push(String(c.value ?? ''))));
    return out;
};

describe('Resumen por Menú de un pack familiar', () => {

    it('NO escribe "0 g" al lado del plato', () => {
        const ws = libro(bloqueFamiliar).getWorksheet('Paquete Deluxe');
        expect(celdas(ws).some(v => /^0 g$/.test(v))).toBe(false);
    });

    it('dice la porcion tal como la nombra Gina, y cuantas bandejas', () => {
        const ws = libro(bloqueFamiliar).getWorksheet('Paquete Deluxe');
        expect(celdas(ws)).toContain('2 × 1 kg o 4 tazas');
    });

    it('un pack normal sigue sumando los gramos como siempre', () => {
        const normal = {
            titulo: 'Menú #1 Pack Bajo Calorías',
            porciones: ['120 GRAMOS DE PROTEINA'], llevaCarbo: true, llevaVegetal: true,
            totalPlatos: 3,
            platos: [{ numero: 1,
                proteina: { nombre: 'Pollo al ajillo', gramosPorPorcion: 120 },
                vegetal: { nombre: 'Vegetales mixtos', cantidadPorPorcion: 1 },
                carbo: { nombre: 'Arroz blanco', cantidadPorPorcion: 0.5 } }],
            clientes: []
        };
        const ws = libro(normal, 'Pack Bajo Calorías').getWorksheet('Pack Bajo Calorías');
        const v = celdas(ws);
        expect(v).toContain('360 g');     // 120 x 3
        expect(v).toContain('3 tazas');   // 1 x 3
        expect(v).toContain('1.5 tazas'); // 0,5 x 3
    });
});

describe('la porcion corta del familiar', () => {
    it('viene de la tabla de familias', () => {
        expect(porcionesDelPack('Paquete Deluxe').porcionCorta).toBe('1 kg o 4 tazas');
    });
});
