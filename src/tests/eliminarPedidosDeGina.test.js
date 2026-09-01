import { describe, it, expect } from 'vitest';
import { tieneEntregaPendiente } from '../data/masterGinaLoader';

/**
 * "Eliminar Pedidos de Gina" borra todo lo que tenga source 'excel-master-gina'.
 *
 * El problema: entre esos hay pedidos VIVOS. El 31 de agosto de 2026 el boton
 * habria borrado 18 pedidos, y uno era el de Sonia Oreamuno con entrega el
 * miercoles 2 — habria desaparecido de la hoja sin que nadie se enterara hasta
 * que faltara la comida.
 *
 * Un pedido con entrega de hoy en adelante NO se borra, punto.
 */
const HOY = new Date('2026-08-31T12:00:00');

describe('tieneEntregaPendiente', () => {

    it('protege el pedido de Sonia Oreamuno del miercoles 2', () => {
        expect(tieneEntregaPendiente({
            cliente: 'Sonia Oreamuno',
            fecha_entrega: '2026-09-02',
            fechas_entrega: ['2026-09-02'],
            items: [{ nombre: '5 Comidas a la Semana - Pack Regular' }]
        }, HOY)).toBe(true);
    });

    it('protege el pedido que se entrega HOY', () => {
        expect(tieneEntregaPendiente({ fecha_entrega: '2026-08-31', fechas_entrega: ['2026-08-31'] }, HOY)).toBe(true);
    });

    it('deja borrar lo que ya se entrego', () => {
        expect(tieneEntregaPendiente({ fecha_entrega: '2026-08-19', fechas_entrega: ['2026-08-19'] }, HOY)).toBe(false);
    });

    it('protege un pack mensual aunque su PRIMERA entrega ya paso', () => {
        expect(tieneEntregaPendiente({
            fecha_entrega: '2026-08-10',
            fechas_entrega: ['2026-08-10', '2026-08-17', '2026-08-24', '2026-09-07']
        }, HOY)).toBe(true);
    });

    it('un pedido sin fechas no se considera pendiente', () => {
        expect(tieneEntregaPendiente({}, HOY)).toBe(false);
        expect(tieneEntregaPendiente(null, HOY)).toBe(false);
    });
});
