import { describe, it, expect } from 'vitest';
import { consultasParaFechas, laConsultaLoTrae, fechasEntre, DIAS_HACIA_ATRAS } from '../utils/consultaPorFechas';
import { getScheduleFromOrder } from '../utils/orderDates';

/**
 * Lo que NO puede pasar al cargar menos: que un cliente que la hoja vieja traía
 * no llegue. Se prueba contra `getScheduleFromOrder`, que es el calendario que
 * usa la cocina, con todas las formas en que un pedido guarda sus fechas.
 */

const SAB = '2026-09-19';
const LUN = '2026-09-21';

const CASOS = {
    'semanal del sábado': { fecha_entrega: SAB, fechas_entrega: [SAB], items: [{ nombre: 'Pack Bajo Calorías' }] },
    'semanal sin arreglo de fechas': { fecha_entrega: LUN, items: [{ nombre: 'Individuales' }] },
    'mensual con las 4 guardadas, semana 3': {
        fecha_entrega: '2026-09-07', fechas_entrega: ['2026-09-07', '2026-09-14', LUN, '2026-09-28'],
        items: [{ nombre: 'Pack Mensual', plan: 'monthly' }]
    },
    'mensual con 4 guardadas, empezó hace 6 semanas y tiene un salto': {
        fecha_entrega: '2026-08-10', fechas_entrega: ['2026-08-10', '2026-08-17', '2026-09-14', LUN],
        items: [{ nombre: 'Pack Mensual', plan: 'monthly' }]
    },
    /** La trampa: una sola fecha guardada y el calendario calcula las otras tres. */
    'mensual con UNA fecha guardada: el 21 es calculado': {
        fecha_entrega: '2026-08-31', fechas_entrega: ['2026-08-31'],
        items: [{ nombre: 'Pack Mensual Bajo en Calorías', plan: 'monthly' }]
    },
    'quincenal con una guardada: la segunda calculada': {
        fecha_entrega: '2026-09-14', fechas_entrega: ['2026-09-14'],
        items: [{ nombre: 'Pack Quincenal', plan: 'biweekly' }]
    },
    'dos semanas': {
        fecha_entrega: '2026-09-12', fechas_entrega: ['2026-09-12', SAB],
        items: [{ nombre: 'PACK DOS SEMANAS CON DESAYUNOS GRATIS' }]
    },
    'pedido de otra semana (no va)': { fecha_entrega: '2026-09-28', fechas_entrega: ['2026-09-28'], items: [] },
    'mensual que ya terminó (no va)': {
        fecha_entrega: '2026-08-10', fechas_entrega: ['2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31'],
        items: [{ plan: 'monthly' }]
    }
};

describe('las consultas no pierden a nadie', () => {
    Object.entries(CASOS).forEach(([nombre, pedido]) => {
        it(nombre, () => {
            const vaEnLaHoja = getScheduleFromOrder(pedido).some(f => [SAB, LUN].includes(f));
            if (vaEnLaHoja) expect(laConsultaLoTrae(pedido, [SAB, LUN])).toBe(true);
        });
    });

    /**
     * Barrido: un mensual que empieza cualquier día de los últimos 60, con
     * 1, 2, 3 o 4 fechas guardadas. Si su calendario cae en la hoja, la
     * consulta tiene que traerlo.
     */
    it('barrido de mensuales y quincenales con fechas guardadas incompletas', () => {
        const perdidos = [];
        for (let atras = 0; atras <= 60; atras++) {
            const base = new Date(Date.UTC(2026, 8, 21 - atras)).toISOString().slice(0, 10);
            for (const plan of ['monthly', 'biweekly']) {
                for (let guardadas = 1; guardadas <= 4; guardadas++) {
                    const fechas = fechasEntre(base, '2026-12-31').filter((_, i) => i % 7 === 0).slice(0, guardadas);
                    const pedido = { fecha_entrega: base, fechas_entrega: fechas, items: [{ plan }] };
                    const va = getScheduleFromOrder(pedido).some(f => [SAB, LUN].includes(f));
                    if (va && !laConsultaLoTrae(pedido, [SAB, LUN])) perdidos.push(`${plan} ${base} (${guardadas})`);
                }
            }
        }
        expect(perdidos).toEqual([]);
    });

    it('lo que no va no se trae de más', () => {
        expect(laConsultaLoTrae(CASOS['pedido de otra semana (no va)'], [SAB, LUN])).toBe(false);
    });
});

describe('las consultas', () => {
    it('rango: desde cuatro semanas antes de la primera hasta la última', () => {
        expect(consultasParaFechas([LUN, SAB])).toEqual({ grupos: [[SAB, LUN]], desde: '2026-08-22', hasta: LUN });
        expect(DIAS_HACIA_ATRAS).toBe(28);
    });

    it('más de 30 fechas se parten en varias consultas', () => {
        const plan = consultasParaFechas(fechasEntre('2026-09-01', '2026-10-15'));
        expect(plan.grupos.map(g => g.length)).toEqual([30, 15]);
    });

    it('sin fechas válidas no hay consulta', () => {
        expect(consultasParaFechas(['', 'hoy'])).toBeNull();
    });
});
