import { describe, it, expect } from 'vitest';
import {
    revisarPedidoNuevo, idParaPedidoNuevo, pedidoNuevo
} from '../utils/agregarPedidoDesdeLaHoja';

/**
 * Carlos H. Herrera no salio en la hoja del lunes 7 porque se cargo a las 3:51
 * de la manana del 8, con la entrega ya pasada. Gina lo habia pedido la noche
 * anterior y no habia forma de meterlo sin salir de la hoja.
 */

describe('lo minimo para poder meterlo', () => {
    it('basta el nombre y la cantidad', () => {
        expect(revisarPedidoNuevo({ cliente: 'Carlos H. Herrera', cantidad: 1 }))
            .toEqual({ sePuede: true, problema: null });
    });

    it('sin nombre no se puede', () => {
        expect(revisarPedidoNuevo({ cliente: '   ', cantidad: 1 }).problema)
            .toMatch(/nombre/i);
    });

    it('cero packs no es un pedido', () => {
        expect(revisarPedidoNuevo({ cliente: 'X', cantidad: 0 }).sePuede).toBe(false);
        expect(revisarPedidoNuevo({ cliente: 'X', cantidad: 'dos' }).sePuede).toBe(false);
    });

    it('el telefono NO es obligatorio: el cliente existe igual', () => {
        expect(revisarPedidoNuevo({ cliente: 'Hazel Jimenez', cantidad: 1 }).sePuede).toBe(true);
    });
});

describe('un id que se pueda leer', () => {
    it('lleva la fecha y el nombre', () => {
        expect(idParaPedidoNuevo('2026-09-09', 'Carlos H. Herrera')).toBe('ORD-20260909-CARLOSHHERRERA');
    });

    it('sin tildes ni signos', () => {
        // La n con tilde queda como n al quitarle la tilde, no desaparece
        expect(idParaPedidoNuevo('2026-09-09', 'José Zúñiga')).toBe('ORD-20260909-JOSEZUNIGA');
    });

    it('sin nombre no queda un id roto', () => {
        expect(idParaPedidoNuevo('2026-09-09', '')).toBe('ORD-20260909-SINNOMBRE');
    });
});

describe('el pedido que se guarda', () => {
    const base = {
        cliente: 'Carlos H. Herrera', plan: 'Pack Regular', zona: 'Ciudad Colón',
        telefono: '8360 3626', cantidad: 2, fecha: '2026-09-09',
        nota: 'Lo pidio Gina la noche anterior', quien: 'gina'
    };

    it('entra a cocinarse: confirmado y con la fecha de la hoja', () => {
        const p = pedidoNuevo(base);
        expect(p.status).toBe('confirmed');
        expect(p.fechas_entrega).toEqual(['2026-09-09']);
        expect(p.fecha_entrega).toBe('2026-09-09');
    });

    it('el telefono se guarda solo con digitos', () => {
        expect(pedidoNuevo(base).telefono).toBe('83603626');
        expect(pedidoNuevo({ ...base, telefono: '50688887777' }).telefono).toBe('88887777');
        expect(pedidoNuevo({ ...base, telefono: '' }).telefono).toBe('');
    });

    it('NO se deja fusionar', () => {
        // La hoja une pedidos parecidos del mismo cliente y se queda con uno.
        // Uno metido a mano porque FALTABA es justo el que desapareceria otra
        // vez, y esta vez sin que nadie lo note.
        expect(pedidoNuevo(base).noFusionar).toBe(true);
    });

    it('queda claro que se metio a mano', () => {
        const p = pedidoNuevo(base);
        expect(p.source).toBe('hoja-produccion');
        expect(p.fuente).toMatch(/a mano/i);
        expect(p.createdBy).toBe('gina');
    });

    it('la cantidad de packs viaja en el item', () => {
        const p = pedidoNuevo(base);
        expect(p.items[0].cantidad).toBe(2);
        expect(p.items[0].nombre).toBe('Pack Regular');
        expect(p.items[0].proteinas).toEqual([]);
    });

    it('sin cantidad asume uno', () => {
        expect(pedidoNuevo({ ...base, cantidad: undefined }).items[0].cantidad).toBe(1);
    });
});
