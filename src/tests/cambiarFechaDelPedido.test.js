/**
 * Mover una entrega desde la hoja.
 *
 * Los dos casos vienen de la reunión con Gina del 11 de setiembre:
 *
 *   Randall Cerdas   "esta semana se entrega miércoles solo esta, las otras
 *                     siguen igual"          -> mover UNA
 *   Giancarlo        "va para los miércoles no para lunes"
 *                                            -> mover TODAS
 *
 * Confundirlas rompe el pedido sin que se note: mover las cuatro entregas de un
 * mensual cuando solo había que mover una le cambia el plan al cliente.
 */

import { describe, it, expect } from 'vitest';
import {
    calendarioMovido,
    cambiosDeFecha,
    calendarioGuardado,
    esFechaValida,
    diasEntre
} from '../utils/cambiarFechaDelPedido';

const LUNES = '2026-09-07';
const MIERCOLES = '2026-09-09';

// Un mensual de lunes: cuatro entregas, una por semana
const MENSUAL_DE_LUNES = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];

describe('esFechaValida', () => {
    it('acepta el formato que guarda Firestore', () => {
        expect(esFechaValida('2026-09-07')).toBe(true);
    });

    it('rechaza cualquier otra cosa', () => {
        expect(esFechaValida('07/09/2026')).toBe(false);
        expect(esFechaValida('')).toBe(false);
        expect(esFechaValida(null)).toBe(false);
        expect(esFechaValida('2026-13-45')).toBe(false);
    });
});

describe('diasEntre', () => {
    it('cuenta los días de por medio', () => {
        expect(diasEntre(LUNES, MIERCOLES)).toBe(2);
        expect(diasEntre(MIERCOLES, LUNES)).toBe(-2);
        expect(diasEntre(LUNES, LUNES)).toBe(0);
    });

    it('no se corre con el cambio de mes', () => {
        expect(diasEntre('2026-09-28', '2026-10-01')).toBe(3);
    });
});

describe('calendarioMovido — SOLO ESTA entrega', () => {

    it('mueve la del día y deja las otras intactas', () => {
        // El caso de Randall
        const nuevo = calendarioMovido(MENSUAL_DE_LUNES, {
            fechaActual: LUNES, fechaNueva: MIERCOLES
        });

        expect(nuevo).toEqual(['2026-09-09', '2026-09-14', '2026-09-21', '2026-09-28']);
    });

    it('deja el calendario ordenado', () => {
        const nuevo = calendarioMovido(MENSUAL_DE_LUNES, {
            fechaActual: '2026-09-28', fechaNueva: '2026-09-01'
        });
        expect(nuevo).toEqual(['2026-09-01', '2026-09-07', '2026-09-14', '2026-09-21']);
    });

    it('no duplica si la fecha nueva ya estaba en el calendario', () => {
        const nuevo = calendarioMovido(MENSUAL_DE_LUNES, {
            fechaActual: LUNES, fechaNueva: '2026-09-14'
        });
        expect(nuevo).toEqual(['2026-09-14', '2026-09-21', '2026-09-28']);
    });
});

describe('calendarioMovido — TODAS las entregas', () => {

    it('corre el calendario entero manteniendo la separación', () => {
        // El caso de Giancarlo: deja de ser de lunes y pasa a ser de miércoles,
        // pero sigue siendo una entrega por semana
        const nuevo = calendarioMovido(MENSUAL_DE_LUNES, {
            fechaActual: LUNES, fechaNueva: MIERCOLES, todas: true
        });

        expect(nuevo).toEqual(['2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30']);
    });

    it('funciona hacia atrás también', () => {
        const nuevo = calendarioMovido(['2026-09-09', '2026-09-16'], {
            fechaActual: MIERCOLES, fechaNueva: LUNES, todas: true
        });
        expect(nuevo).toEqual(['2026-09-07', '2026-09-14']);
    });

    it('cruza el cambio de mes sin perderse', () => {
        const nuevo = calendarioMovido(['2026-09-28'], {
            fechaActual: '2026-09-28', fechaNueva: '2026-10-01', todas: true
        });
        expect(nuevo).toEqual(['2026-10-01']);
    });
});

describe('calendarioMovido — lo que NO debe hacer', () => {

    it('una fecha inválida no toca nada', () => {
        expect(calendarioMovido(MENSUAL_DE_LUNES, { fechaActual: LUNES, fechaNueva: 'mañana' }))
            .toEqual(MENSUAL_DE_LUNES);
        expect(calendarioMovido(MENSUAL_DE_LUNES, {}))
            .toEqual(MENSUAL_DE_LUNES);
    });

    it('mover a la misma fecha no cambia nada', () => {
        expect(calendarioMovido(MENSUAL_DE_LUNES, { fechaActual: LUNES, fechaNueva: LUNES }))
            .toEqual(MENSUAL_DE_LUNES);
    });

    it('un calendario vacío no rompe', () => {
        expect(calendarioMovido([], { fechaActual: LUNES, fechaNueva: MIERCOLES }))
            .toEqual([MIERCOLES]);
        expect(calendarioMovido(null, { fechaActual: LUNES, fechaNueva: MIERCOLES }))
            .toEqual([MIERCOLES]);
    });
});

describe('cambiosDeFecha', () => {

    // Un pedido como lo guarda Firestore
    const pedido = (fechas) => ({
        id: 'ORD-1',
        cliente: 'Randall Cerdas',
        fechas_entrega: fechas,
        fecha_entrega: fechas[0],
        plan: 'monthly',
        items: [{ nombre: 'Pack Bajo Calorías', plan: 'monthly', cantidad: 1 }]
    });

    it('escribe el calendario completo y la primera fecha', () => {
        const cambios = cambiosDeFecha(pedido(MENSUAL_DE_LUNES), {
            fechaActual: LUNES, fechaNueva: MIERCOLES
        });

        expect(cambios.fechas_entrega).toEqual(['2026-09-09', '2026-09-14', '2026-09-21', '2026-09-28']);
        // La consulta de la hoja filtra por `fecha_entrega`: si no se actualiza,
        // el pedido se puede caer de la búsqueda
        expect(cambios.fecha_entrega).toBe('2026-09-09');
    });

    it('no manda un PATCH cuando no hay nada que cambiar', () => {
        // Una escritura vacía gasta cuota y ensucia la fecha de modificación
        expect(cambiosDeFecha(pedido(MENSUAL_DE_LUNES), {
            fechaActual: LUNES, fechaNueva: LUNES
        })).toBeNull();

        expect(cambiosDeFecha(pedido(MENSUAL_DE_LUNES), {
            fechaActual: LUNES, fechaNueva: 'no es fecha'
        })).toBeNull();
    });

    it('mover todas conserva las cuatro entregas del mensual', () => {
        const cambios = cambiosDeFecha(pedido(MENSUAL_DE_LUNES), {
            fechaActual: LUNES, fechaNueva: MIERCOLES, todas: true
        });

        expect(cambios.fechas_entrega).toHaveLength(4);
        expect(cambios.fechas_entrega[0]).toBe('2026-09-09');
    });

    it('un pedido de una sola entrega se mueve entero igual', () => {
        const cambios = cambiosDeFecha(
            { id: 'x', fechas_entrega: ['2026-09-05'], fecha_entrega: '2026-09-05' },
            { fechaActual: '2026-09-05', fechaNueva: '2026-09-07' }
        );

        expect(cambios.fechas_entrega).toEqual(['2026-09-07']);
        expect(cambios.fecha_entrega).toBe('2026-09-07');
    });

    it('NO inventa entregas que el pedido no tiene guardadas', () => {
        // Un pedido marcado "mensual" con UNA sola fecha guardada: la lectura
        // normal le deduce cuatro sumando semanas. Escribir esa deducción
        // convertiría una suposición en comida que nadie pidió.
        const mensualIncompleto = {
            id: 'ORD-2', plan: 'monthly',
            items: [{ nombre: 'Pack Bajo Calorías', plan: 'monthly' }],
            fechas_entrega: ['2026-09-07'], fecha_entrega: '2026-09-07'
        };

        const cambios = cambiosDeFecha(mensualIncompleto, {
            fechaActual: '2026-09-07', fechaNueva: '2026-09-09'
        });

        expect(cambios.fechas_entrega).toEqual(['2026-09-09']);
    });
});

describe('calendarioGuardado', () => {
    it('usa el arreglo guardado cuando existe', () => {
        expect(calendarioGuardado({ fechas_entrega: MENSUAL_DE_LUNES })).toEqual(MENSUAL_DE_LUNES);
    });

    it('cae a la fecha suelta cuando no hay arreglo', () => {
        expect(calendarioGuardado({ fecha_entrega: LUNES })).toEqual([LUNES]);
    });

    it('no deduce entregas del plan', () => {
        // Aunque diga mensual, si solo hay una fecha guardada, es una
        const soloUna = { plan: 'monthly', fechas_entrega: [LUNES], fecha_entrega: LUNES };
        expect(calendarioGuardado(soloUna)).toEqual([LUNES]);
    });

    it('un pedido sin fechas no rompe', () => {
        expect(calendarioGuardado({})).toEqual([]);
        expect(calendarioGuardado(null)).toEqual([]);
    });
});
