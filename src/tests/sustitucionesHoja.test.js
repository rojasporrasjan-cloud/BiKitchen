import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildKitchenSheetData } from '../utils/logisticsUtils';

/**
 * Los cambios de proteína tienen que LLEGAR A LA COCINA.
 *
 * Se guardaban en el pedido y se veían en el correo y en el detalle del admin,
 * pero la hoja de producción no los leía: el cocinero preparaba la proteína
 * original y el cliente recibía algo que no pidió.
 */

const platosDe = (pedido) => mapPedidosFromLegacy([{ id: 'x', ...pedido }])[0].platos;

describe('Cambios por plato (packs con menú semanal)', () => {
    const pedido = {
        cliente: 'Ana Mora',
        fecha_entrega: '2026-08-17',
        items: [{
            nombre: 'Pack 3 Proteínas (250g)',
            cantidad: 1,
            proteinas: ['Res en salsa', 'Pollo al pesto', 'Cerdo BBQ'],
            customizations: {
                proteinChanges: [{ dishNumber: 2, dishName: 'Pollo al pesto', newValue: 'Pescado' }]
            }
        }]
    };

    it('cambia solo el plato que el cliente pidió cambiar', () => {
        const platos = platosDe(pedido);
        expect(platos[0].proteina.nombre).toBe('Res en salsa');
        expect(platos[1].proteina.nombre).toBe('Pollo al pesto → Pescado');
        expect(platos[2].proteina.nombre).toBe('Cerdo BBQ');
    });

    it('deja ver de dónde salió el cambio, no solo el resultado', () => {
        // Si solo dijera "Pescado", nadie sabría que hubo una sustitución
        const platos = platosDe(pedido);
        expect(platos[1].proteina.nombre).toContain('Pollo al pesto');
        expect(platos[1].proteina.nombre).toContain('Pescado');
    });

    it('la porción cambiada queda separada en los totales', () => {
        const [normalizado] = mapPedidosFromLegacy([{ id: 'x', ...pedido }]);
        const hoja = buildKitchenSheetData([normalizado], {});
        const nombres = Object.values(Object.values(hoja.porMenu)[0].platos)
            .map(p => p.proteina.nombre);
        expect(nombres).toContain('Pollo al pesto → Pescado');
    });
});

describe('Cambios por ítem (packs familiares e individuales)', () => {
    it('el pack familiar muestra el cambio de proteína', () => {
        const platos = platosDe({
            cliente: 'Luis Mora',
            fecha_entrega: '2026-08-17',
            items: [{
                nombre: 'Pack Familiar Premium',
                cantidad: 1,
                customizations: { protein: 'Pollo al pesto' }
            }]
        });
        expect(platos[0].proteina.nombre).toBe('Pack Familiar Premium → Pollo al pesto');
    });

    it('también cambia vegetal y carbohidrato', () => {
        const platos = platosDe({
            cliente: 'Luis Mora',
            fecha_entrega: '2026-08-17',
            items: [{
                nombre: 'Pack Familiar Deluxe',
                cantidad: 1,
                carbo: '1 taza',
                ensalada: '80g',
                customizations: { vegetal: 'Brócoli', carbo: 'Arroz integral' }
            }]
        });
        expect(platos[0].vegetal.nombre).toBe('Vegetales → Brócoli');
        expect(platos[0].carbo.nombre).toBe('Carbohidrato → Arroz integral');
    });
});

describe('Sin sustituciones no cambia nada', () => {
    it('un pedido normal se ve igual que siempre', () => {
        const platos = platosDe({
            cliente: 'Marta Solano',
            fecha_entrega: '2026-08-17',
            items: [{ nombre: 'Pack 3 Proteínas (250g)', proteinas: ['Res', 'Pollo', 'Cerdo'] }]
        });
        expect(platos.map(p => p.proteina.nombre)).toEqual(['Res', 'Pollo', 'Cerdo']);
    });

    it('customizations vacío o ausente no rompe nada', () => {
        expect(() => platosDe({ items: [{ nombre: 'X', customizations: {} }] })).not.toThrow();
        expect(() => platosDe({ items: [{ nombre: 'X' }] })).not.toThrow();
        expect(platosDe({ items: [{ nombre: 'X', customizations: {} }] })[0].proteina.nombre).toBe('X');
    });

    it('un cambio al mismo ingrediente no ensucia el nombre', () => {
        const platos = platosDe({
            items: [{ nombre: 'Pollo', proteinas: ['Pollo'], customizations: { protein: 'Pollo' } }]
        });
        expect(platos[0].proteina.nombre).toBe('Pollo');
    });
});
