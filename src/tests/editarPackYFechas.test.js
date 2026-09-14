/**
 * Cambiar el NOMBRE del pack y las FECHAS desde la hoja.
 *
 * Los dos casos vienen de la reunión con Gina del 11 de setiembre de 2026 y de
 * lo que apareció al revisar la hoja del 12:
 *
 *   Patrick    su pack dice "(250g)" y él es de 500. El gramaje sale del
 *              NOMBRE, así que sin poder renombrarlo no había forma de
 *              arreglarlo.
 *   Mayela     es totalmente personalizada y tiene que ir en hoja aparte. Eso
 *   Catherine  pasa solo si el nombre empieza con PERSONALIZADO.
 *   Randall    esta semana entrega miércoles, las otras entregas siguen igual.
 *   Giancarlo  se pasa a miércoles para siempre.
 */

import { describe, it, expect } from 'vitest';
import { cambiosDelNombreDelPack, cambiosDelPedido } from '../utils/guardarPedidoDeLaHoja';
import { getDefaultGrams, esPersonalizado, mapPackNameToMenuKey } from '../utils/packClassification';

describe('cambiosDelNombreDelPack', () => {

    it('cambia el nombre en `plan`, que es de donde lo lee la hoja', () => {
        const pedido = { plan: 'Pack 5 Proteínas (250g)' };
        expect(cambiosDelNombreDelPack(pedido, 'Pack 5 Proteínas (500g)'))
            .toEqual({ plan: 'Pack 5 Proteínas (500g)' });
    });

    it('no manda un PATCH si no cambió nada', () => {
        const pedido = { plan: 'Pack Regular' };
        expect(cambiosDelNombreDelPack(pedido, 'Pack Regular')).toBeNull();
        expect(cambiosDelNombreDelPack(pedido, '  Pack Regular  ')).toBeNull();
    });

    it('NO deja borrar el nombre', () => {
        // Sin nombre el pedido se queda sin familia y sin gramaje: la hoja no
        // sabría ni dónde ponerlo ni cuánto cocinarle
        const pedido = { plan: 'Pack Regular' };
        expect(cambiosDelNombreDelPack(pedido, '')).toBeNull();
        expect(cambiosDelNombreDelPack(pedido, '   ')).toBeNull();
    });
});

describe('lo que el nombre nuevo arregla de verdad', () => {

    it('Patrick: renombrar a 500g cambia lo que se cocina', () => {
        expect(getDefaultGrams('Pack 5 Proteínas (250g)')).toBe(250);
        expect(getDefaultGrams('Pack 5 Proteínas (500g)')).toBe(500);
    });

    it('Mayela y Catherine: el prefijo las manda a su propia hoja', () => {
        expect(esPersonalizado('Pack Sin Carbos')).toBe(false);
        expect(esPersonalizado('PERSONALIZADO — Mayela (Sin Carbos, 90 g)')).toBe(true);
    });

    it('un personalizado conserva su familia para saber dónde imprimirlo', () => {
        // El nombre tiene que decir las dos cosas
        const nombre = 'PERSONALIZADO — Mayela (Sin Carbos, 90 g)';
        expect(esPersonalizado(nombre)).toBe(true);
        expect(mapPackNameToMenuKey(nombre)).toBe('sinCarbos');
        expect(getDefaultGrams(nombre)).toBe(90);
    });
});

describe('cambiosDelPedido junta todo en un solo PATCH', () => {

    const pedido = {
        id: 'ORD-1',
        plan: 'Pack 5 Proteínas (250g)',
        observaciones: 'sin cerdo',
        fechas_entrega: ['2026-09-14', '2026-09-21'],
        fecha_entrega: '2026-09-14',
        items: [{ nombre: 'Pack 5 Proteínas (250g)' }]
    };

    it('el nombre del pack', () => {
        const c = cambiosDelPedido(pedido, {
            observaciones: 'sin cerdo',
            plan: 'Pack 5 Proteínas (500g)'
        });
        expect(c).toEqual({ plan: 'Pack 5 Proteínas (500g)' });
    });

    it('mover SOLO esta entrega deja las otras quietas', () => {
        // El caso de Randall
        const c = cambiosDelPedido(pedido, {
            observaciones: 'sin cerdo',
            fechas: { fechaActual: '2026-09-14', fechaNueva: '2026-09-16' }
        });
        expect(c.fechas_entrega).toEqual(['2026-09-16', '2026-09-21']);
        expect(c.fecha_entrega).toBe('2026-09-16');
    });

    it('mover TODAS corre el calendario entero', () => {
        // El caso de Giancarlo
        const c = cambiosDelPedido(pedido, {
            observaciones: 'sin cerdo',
            fechas: { fechaActual: '2026-09-14', fechaNueva: '2026-09-16', todas: true }
        });
        expect(c.fechas_entrega).toEqual(['2026-09-16', '2026-09-23']);
    });

    it('el nombre y la fecha a la vez, en un solo PATCH', () => {
        const c = cambiosDelPedido(pedido, {
            observaciones: 'sin cerdo',
            plan: 'PERSONALIZADO — Patrick (500 g)',
            fechas: { fechaActual: '2026-09-14', fechaNueva: '2026-09-16' }
        });
        expect(c.plan).toBe('PERSONALIZADO — Patrick (500 g)');
        expect(c.fechas_entrega).toEqual(['2026-09-16', '2026-09-21']);
    });

    it('sin tocar nada, no se escribe nada', () => {
        // Un PATCH vacío gasta cuota y ensucia la fecha de modificación
        expect(cambiosDelPedido(pedido, {
            observaciones: 'sin cerdo',
            plan: 'Pack 5 Proteínas (250g)',
            fechas: { fechaActual: '2026-09-14', fechaNueva: '2026-09-14' }
        })).toBeNull();
    });
});
