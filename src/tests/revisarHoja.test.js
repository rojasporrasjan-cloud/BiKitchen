import { describe, it, expect } from 'vitest';
import { revisarHoja } from '../utils/revisarHoja';

/**
 * La revisión que corre antes de imprimir.
 *
 * Existe porque la hoja no avisa cuando algo sale mal: imprime una tabla vacía
 * y en cocina nadie se entera hasta que falta comida.
 */

const MENUS = {
    keto: [{ numero: 1, proteina: 'Pollo al curry', vegetal: 'Brócoli', carbo: '—' }],
    desayuno: [{ numero: 1, proteina: 'Gallo pinto con huevo', vegetal: 'Queso', carbo: 'Tortilla' }],
    vegetariano: []
};

const pedido = (over = {}) => ({
    cliente: 'Andrés Víquez',
    telefono: '8721-6592',
    plan: 'Pack Keto Mensual',
    platos: [{ numero: 1, proteina: { nombre: 'Pollo al curry' } }],
    rawPedido: { zona_envio: 'Guácima', fechas_entrega: ['2026-08-19'], items: [{ plan: null }] },
    ...over
});

const problemasDe = (p) => revisarHoja([p], MENUS, '2026-08-19').problemas.map((x) => x.que);

describe('Un pedido completo no genera avisos', () => {
    it('sale limpio', () => {
        const r = revisarHoja([pedido()], MENUS, '2026-08-19');
        expect(r.problemas).toEqual([]);
        expect(r.graves).toBe(0);
    });
});

describe('Packs que saldrían vacíos', () => {
    it('avisa cuando el pack no corresponde a ningún menú', () => {
        const avisos = problemasDe(pedido({ plan: 'Pack Inventado' }));
        expect(avisos.join(' ')).toMatch(/no corresponde a ning[úu]n Men[úu] Semanal/i);
    });

    it('avisa cuando el menú existe pero está sin cargar', () => {
        const avisos = problemasDe(pedido({ plan: 'Pack Vegetariano' }));
        expect(avisos.join(' ')).toMatch(/est[áa] vac[íi]o/i);
    });

    it('un pack con su menú cargado no avisa', () => {
        expect(problemasDe(pedido({ plan: 'Pack Desayunos Mensual' }))).toEqual([]);
    });
});

describe('Individuales sin platos', () => {
    it('avisa cuando no dice qué platos son', () => {
        const avisos = problemasDe(pedido({ plan: 'Individuales', platos: [] }));
        expect(avisos.join(' ')).toMatch(/no dice cu[áa]les/i);
    });

    it('con sus platos escritos no avisa', () => {
        expect(problemasDe(pedido({
            plan: 'Individuales',
            platos: [{ proteina: { nombre: 'Gallo pinto' } }]
        }))).toEqual([]);
    });
});

describe('Fechas que se están adivinando', () => {
    it('avisa cuando es multi-entrega pero no tiene las fechas guardadas', () => {
        // Es mensual pero solo trae la primera fecha: las otras 3 se calculan
        const avisos = problemasDe(pedido({
            rawPedido: {
                zona_envio: 'Guácima',
                fecha_entrega: '2026-08-19',
                fechas_entrega: ['2026-08-19'],
                items: [{ nombre: 'Pack Keto Mensual', plan: 'monthly' }]
            }
        }));
        expect(avisos.join(' ')).toMatch(/la hoja las est[áa] calculando/i);
    });

    it('con las 4 fechas guardadas no avisa', () => {
        expect(problemasDe(pedido({
            rawPedido: {
                zona_envio: 'Guácima',
                fecha_entrega: '2026-08-19',
                fechas_entrega: ['2026-08-19', '2026-08-26', '2026-09-02', '2026-09-09'],
                items: [{ nombre: 'Pack Keto Mensual', plan: 'monthly' }]
            }
        }))).toEqual([]);
    });

    it('las fechas guardadas mandan aunque al ítem le falte la marca', () => {
        // Esto se arregló en getScheduleFromOrder: la hoja ve las 4 igual
        expect(problemasDe(pedido({
            rawPedido: {
                zona_envio: 'Guácima',
                fecha_entrega: '2026-08-19',
                fechas_entrega: ['2026-08-19', '2026-08-26', '2026-09-02', '2026-09-09'],
                items: [{ nombre: 'Pack Keto', plan: null }]
            }
        }))).toEqual([]);
    });

    it('un pedido de entrega única no avisa', () => {
        expect(problemasDe(pedido())).toEqual([]);
    });
});

describe('Datos que necesita el repartidor', () => {
    it('avisa si falta el teléfono, pero no impide cocinar', () => {
        const r = revisarHoja([pedido({ telefono: '' })], MENUS, '2026-08-19');
        expect(r.problemas[0].gravedad).toBe('media');
        expect(r.graves).toBe(0);
    });

    it('avisa si falta la zona', () => {
        const avisos = problemasDe(pedido({ rawPedido: { zona_envio: 'No especificada', fechas_entrega: ['2026-08-19'], items: [] } }));
        expect(avisos.join(' ')).toMatch(/zona de entrega/i);
    });
});

describe('Resumen para contar contra el Excel', () => {
    it('cuenta packs, individuales, desayunos y platos', () => {
        const r = revisarHoja([
            pedido(),
            pedido({ plan: 'Pack Desayunos Mensual' }),
            pedido({ plan: 'Individuales', platos: [{ proteina: { nombre: 'x' } }, { proteina: { nombre: 'y' } }] })
        ], MENUS, '2026-08-19');

        expect(r.resumen.total).toBe(3);
        expect(r.resumen.packs).toBe(2);
        expect(r.resumen.individuales).toBe(1);
        expect(r.resumen.desayunos).toBe(1);
        expect(r.resumen.platos).toBe(4);
    });

    it('sin pedidos no revienta', () => {
        const r = revisarHoja([], MENUS, '2026-08-19');
        expect(r.resumen.total).toBe(0);
        expect(r.problemas).toEqual([]);
    });
});
