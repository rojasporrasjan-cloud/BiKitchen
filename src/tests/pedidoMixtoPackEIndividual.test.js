/**
 * Un pedido que lleva un PACK y además un producto suelto.
 *
 * Priscilla Montoya compra siempre su pack quincenal y, aparte, tortas de maduro.
 * Las dos cosas van en el MISMO pedido. Si la hoja solo mira el pack, las tortas
 * no se empacan y el cliente se queda sin algo que pagó.
 */

import { describe, it, expect } from 'vitest';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils';

const pedidoMixto = {
    id: 'priscilla',
    cliente: 'Priscilla Montoya',
    plan: '🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías (Promoción Mensual)',
    zona_envio: 'Desamparados',
    status: 'confirmed',
    fecha_entrega: '2026-08-29',
    fechas_entrega: ['2026-08-22', '2026-08-29'],
    items: [
        {
            nombre: '🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías (Promoción Mensual)',
            cantidad: 1, precio: 87890, total: 87890
        },
        {
            nombre: 'Tortas maduro con queso',
            cantidad: 1, precio: 14250, total: 14250,
            category: 'individuales', categoryLabel: 'Pasteles', desc: '8 porciones'
        }
    ],
    subtotal: 102140,
    total: 108140
};

describe('un pedido con pack y producto suelto', () => {

    it('los dos productos sobreviven a la normalización', () => {
        const [normalizado] = mapPedidosFromLegacy([pedidoMixto]);
        const nombres = (normalizado.items || []).map(i => i.nombre);

        expect(nombres).toHaveLength(2);
        expect(nombres.some(n => /Tortas maduro/.test(n))).toBe(true);
    });

    it('las tortas llegan como un plato propio, no solo el pack', () => {
        // Es la condición que necesita la hoja de empaque para poder mostrarlas:
        // si el plato no existe acá, no hay forma de recuperarlo más adelante.
        const normalizados = mapPedidosFromLegacy([pedidoMixto]);
        const hoja = buildPackagingSheetData(normalizados, {}, null);
        const priscilla = hoja.clientes.find(c => /Priscilla/.test(c.cliente || ''));

        expect(priscilla).toBeDefined();

        const nombresDePlatos = (priscilla.platos || [])
            .map(p => p?.proteina?.nombre || p?.nombre || '');

        expect(nombresDePlatos).toContain('Tortas maduro con queso');
        expect(nombresDePlatos.some(n => /PACK DOS SEMANAS/.test(n))).toBe(true);
    });
});
