import { describe, it, expect } from 'vitest';
import {
    esRecurrente, pedidosDeLaTanda, canceladosDespuesDeEnviar, acumularEnviados, claveDePedido
} from '../utils/tandasDeCocina.js';

/**
 * Gina empieza a cocinar el jueves y los pedidos siguen entrando. La hoja se
 * manda por partes y cada una lleva SOLO lo que no se mando antes: si una tanda
 * repite un pedido de la anterior, se cocina dos veces.
 */
const cal = (p) => p.fechas;
const ped = (num, fechas) => ({ numeroOrden: num, fechas });

describe('quien entra en el adelanto del miercoles', () => {
    it('los mensuales (4 entregas) y los quincenales (2) si', () => {
        expect(esRecurrente(ped('#A', ['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26']), cal)).toBe(true);
        expect(esRecurrente(ped('#B', ['2026-09-05', '2026-09-12']), cal)).toBe(true);
    });

    it('los de una sola entrega no: pueden cambiar hasta el viernes', () => {
        expect(esRecurrente(ped('#C', ['2026-09-05']), cal)).toBe(false);
        expect(esRecurrente(ped('#D', []), cal)).toBe(false);
    });
});

describe('cada tanda lleva solo lo nuevo', () => {
    const todos = [
        ped('#MENSUAL', ['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26']),
        ped('#QUINCENAL', ['2026-09-05', '2026-09-12']),
        ped('#SEMANAL', ['2026-09-05'])
    ];

    it('el miercoles solo salen los recurrentes', () => {
        const { nuevos } = pedidosDeLaTanda(todos, [], { soloRecurrentes: true, calendario: cal });
        expect(nuevos.map(p => p.numeroOrden)).toEqual(['#MENSUAL', '#QUINCENAL']);
    });

    it('el viernes NO repite lo que ya se mando el miercoles', () => {
        const { nuevos, repetidos } = pedidosDeLaTanda(todos, ['#MENSUAL', '#QUINCENAL'], { calendario: cal });
        expect(nuevos.map(p => p.numeroOrden)).toEqual(['#SEMANAL']);
        expect(repetidos.map(p => p.numeroOrden)).toEqual(['#MENSUAL', '#QUINCENAL']);
    });

    it('un pedido que entra despues del miercoles si sale el viernes', () => {
        const conNuevo = [...todos, ped('#TARDIO', ['2026-09-05'])];
        const { nuevos } = pedidosDeLaTanda(conNuevo, ['#MENSUAL', '#QUINCENAL'], { calendario: cal });
        expect(nuevos.map(p => p.numeroOrden)).toEqual(['#SEMANAL', '#TARDIO']);
    });

    it('si ya se mando todo, la hoja del sabado sale vacia', () => {
        const { nuevos } = pedidosDeLaTanda(todos, ['#MENSUAL', '#QUINCENAL', '#SEMANAL'], { calendario: cal });
        expect(nuevos).toEqual([]);
    });

    it('el filtro de recurrentes NO se aplica en las tandas siguientes', () => {
        // El viernes y el sabado va todo lo que falte, recurrente o no.
        const { nuevos } = pedidosDeLaTanda(todos, ['#MENSUAL'], { calendario: cal });
        expect(nuevos.map(p => p.numeroOrden)).toEqual(['#QUINCENAL', '#SEMANAL']);
    });
});

describe('lo que se cancelo despues de mandar la hoja', () => {
    it('avisa cual era, para no empacarlo', () => {
        // No se puede deshacer lo cocinado, pero Gina tiene que enterarse.
        const vigentes = [ped('#MENSUAL', ['2026-09-05'])];
        expect(canceladosDespuesDeEnviar(['#MENSUAL', '#CANCELADO'], vigentes)).toEqual(['#CANCELADO']);
    });

    it('sin cancelaciones no avisa nada', () => {
        expect(canceladosDespuesDeEnviar(['#A'], [ped('#A', [])])).toEqual([]);
    });
});

describe('juntar lo mandado en varias tandas', () => {
    it('suma las claves sin repetirlas', () => {
        expect(acumularEnviados([
            { pedidos: ['#A', '#B'] },
            { pedidos: ['#B', '#C'] }
        ])).toEqual(['#A', '#B', '#C']);
    });

    it('aguanta tandas vacias o mal formadas', () => {
        expect(acumularEnviados([null, { pedidos: [] }, {}])).toEqual([]);
        expect(acumularEnviados(null)).toEqual([]);
    });
});

describe('como se identifica un pedido', () => {
    it('usa el numero de orden, venga como venga', () => {
        expect(claveDePedido({ numeroOrden: '#A' })).toBe('#A');
        expect(claveDePedido({ rawPedido: { numeroOrden: '#B' } })).toBe('#B');
        expect(claveDePedido({ id: 'abc' })).toBe('abc');
    });
});
