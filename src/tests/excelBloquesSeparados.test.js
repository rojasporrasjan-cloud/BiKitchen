import { describe, it, expect } from 'vitest';
import { construirLibroGina } from '../utils/excelHojaProduccion';

/**
 * El Excel de Gina también parte los packs en tres bloques.
 *
 * En pantalla ya salían separados —el menú tal cual, los que cambiaron un
 * ingrediente agrupados por el cambio, y los de menú propio— pero el archivo
 * seguía mandando todos los clientes en una sola lista y quien empacaba tenía
 * que cruzar cada nota con su fila.
 *
 * "Los excel como los que usa Gina... eso de que se separen los packs bien y
 * los personalizados, con eso es con lo que tenemos que ponerle más énfasis"
 * — Jan, 7 de setiembre de 2026.
 */

const PLATOS = [
    { numero: 1, proteina: { nombre: 'Pollo al pesto', gramosPorPorcion: 100 }, vegetal: { nombre: 'Vegetales mixtos', cantidadPorPorcion: 1 }, carbo: { nombre: 'Arroz blanco', cantidadPorPorcion: 0.5 } },
    { numero: 2, proteina: { nombre: 'Carne mechada', gramosPorPorcion: 100 }, vegetal: { nombre: 'Chayote', cantidadPorPorcion: 1 }, carbo: { nombre: 'Puré de papa', cantidadPorPorcion: 0.5 } }
];

const bloqueBase = (extra = {}) => ({
    titulo: 'Menú #1 Bajo Calorías',
    porciones: ['100 GRAMOS DE PROTEINA'],
    platos: PLATOS,
    llevaCarbo: true,
    llevaVegetal: true,
    totalPlatos: 3,
    clientes: [{ etiqueta: 'Ana Solís (1), Escazú', notas: '' }],
    ...extra
});

const textosDe = (datos) => {
    const wb = construirLibroGina(datos);
    const out = [];
    wb.eachSheet(ws => ws.eachRow(row => row.eachCell(c => {
        if (c.value !== null && c.value !== undefined) out.push(String(c.value));
    })));
    return out;
};

const datosCon = (bloque) => ({
    etiquetaDia: 'SABADO 12 SETIEMBRE',
    entregas: [],
    familias: [{ titulo: 'Bajo Calorías', menu1: bloque, menu2: null }]
});

describe('Excel de Gina: packs y personalizados separados', () => {
    it('los que llevan el mismo cambio salen en UN bloque con su cuadro de platos', () => {
        const textos = textosDe(datosCon(bloqueBase({
            gruposDeCambio: [{
                texto: 'Cambiar arroz blanco por puré de papa',
                total: 5,
                clientes: [{ etiqueta: 'Beto Mora (1), Heredia' }, { etiqueta: 'Cata Ruiz (1), Belén' }],
                platos: [{ numero: 1, proteina: 'Pollo al pesto', vegetal: 'Vegetales mixtos', carbo: 'Puré de papa', original: 'Arroz blanco', cambiada: 'carbo' }]
            }]
        })));

        expect(textos.join(' ')).toMatch(/CON CAMBIO — 5 packs/);
        expect(textos.join(' ')).toMatch(/Cambiar arroz blanco por pur/i);
        expect(textos.join(' ')).toMatch(/Beto Mora/);
        expect(textos.join(' ')).toMatch(/Cata Ruiz/);
    });

    it('el de menú propio sale en su propio bloque', () => {
        const textos = textosDe(datosCon(bloqueBase({
            personalizados: [{
                etiqueta: 'Marianela Alfaro (1), Alajuela',
                notas: 'Two Pack',
                texto: '3 vegetales y 1 carbo por plato, en vez de 2 vegetales y 3 carbos',
                platos: [{ numero: 1, proteina: 'Pollo al pesto', vegetal: 'Vegetales mixtos', carbo: 'Arroz blanco', original: '' }]
            }]
        })));

        expect(textos.join(' ')).toMatch(/MENÚ PROPIO — Marianela Alfaro/);
        expect(textos.join(' ')).toMatch(/3 vegetales y 1 carbo/);
    });

    it('sin cambios ni personalizados el archivo queda como antes', () => {
        const textos = textosDe(datosCon(bloqueBase()));
        expect(textos.join(' ')).not.toMatch(/CON CAMBIO/);
        expect(textos.join(' ')).not.toMatch(/MENÚ PROPIO/);
        expect(textos.join(' ')).toMatch(/Ana Solís/);
    });

    it('el cliente del menú normal sigue saliendo aunque haya bloques aparte', () => {
        const textos = textosDe(datosCon(bloqueBase({
            gruposDeCambio: [{
                texto: 'Cambiar chayote por brócoli', total: 1,
                clientes: [{ etiqueta: 'Beto Mora (1), Heredia' }],
                platos: [{ numero: 2, proteina: 'Carne mechada', vegetal: 'Brócoli', carbo: 'Puré de papa', original: 'Chayote', cambiada: 'vegetal' }]
            }]
        })));
        expect(textos.join(' ')).toMatch(/Ana Solís/);
        expect(textos.join(' ')).toMatch(/Beto Mora/);
    });
}, 20000);
