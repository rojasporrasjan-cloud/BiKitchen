import { describe, it, expect } from 'vitest';
import { listarSustituciones } from '../utils/productionHelpers';
import { revisarHoja } from '../utils/revisarHoja';

/**
 * Las sustituciones SI se guardan (customizations.proteinChanges), pero la hoja
 * de cocina cocina el menu oficial: a granel se cuenta el plato ORIGINAL y no
 * el sustituto. Quien cocina tiene que enterarse antes de imprimir.
 *
 * Caso real: Bryan Ocampo, pack Casaditos "sin res ni cerdo", cambia el Lomo
 * fingido y las Fajitas de cerdo por pollo.
 */
const bryan = {
    cliente: 'Bryan Ocampo G',
    plan: 'Pack Casaditos',
    observaciones: 'Sin res ni cerdo',
    items: [{
        nombre: 'Pack Casaditos',
        customizations: {
            proteinChanges: [
                { dishNumber: 2, dishName: 'Lomo fingido en salsa gravy', newValue: 'Filet de pollo encebollado' },
                { dishNumber: 3, dishName: 'Fajitas de cerdo en salsa strogonoff', newValue: 'Pollo al ajillo' }
            ],
            vegeChanges: [], carboChanges: []
        }
    }]
};

describe('listarSustituciones', () => {
    it('encuentra los cambios de proteina', () => {
        const subs = listarSustituciones(bryan);
        expect(subs).toHaveLength(2);
        expect(subs[0]).toMatchObject({ plato: 2, de: 'Lomo fingido en salsa gravy', a: 'Filet de pollo encebollado' });
        expect(subs[1]).toMatchObject({ plato: 3, a: 'Pollo al ajillo' });
    });

    it('lee tambien vegetales y carbos', () => {
        const subs = listarSustituciones({ items: [{ customizations: {
            vegeChanges: [{ dishNumber: 1, dishName: 'Ensalada', newValue: 'Brocoli' }],
            carboChanges: [{ dishNumber: 4, dishName: 'Arroz', newValue: 'Puré' }]
        } }] });
        expect(subs.map(s => s.tipo)).toEqual(['vegetal', 'carbo']);
    });

    it('lee el formato viejo dishChanges', () => {
        const subs = listarSustituciones({ items: [{ customizations: {
            dishChanges: [{ dishNumber: 5, dishName: 'Pollo', newProtein: 'Tilapia' }]
        } }] });
        expect(subs[0].a).toBe('Tilapia');
    });

    it('un pedido sin cambios devuelve lista vacia', () => {
        expect(listarSustituciones({ items: [{ nombre: 'Pack Regular' }] })).toEqual([]);
        expect(listarSustituciones(null)).toEqual([]);
    });
});

describe('revisarHoja avisa de las sustituciones', () => {
    it('marca el pedido de Bryan antes de imprimir', () => {
        const { problemas } = revisarHoja([{ ...bryan, rawPedido: bryan, platos: [] }], {}, '2026-09-02');
        const aviso = problemas.find(p => /Cambia platos/i.test(p.que));
        expect(aviso).toBeDefined();
        expect(aviso.cliente).toBe('Bryan Ocampo G');
        expect(aviso.que).toMatch(/Filet de pollo encebollado/);
        expect(aviso.que).toMatch(/sumado al sustituto/);
    });

    it('no molesta a un pedido sin sustituciones', () => {
        const { problemas } = revisarHoja(
            [{ cliente: 'Kendall Barboza', plan: 'Pack Regular', platos: [], items: [] }], {}, '2026-09-02');
        expect(problemas.filter(p => /Cambia platos|Cambia vegetales/i.test(p.que))).toHaveLength(0);
    });
});
