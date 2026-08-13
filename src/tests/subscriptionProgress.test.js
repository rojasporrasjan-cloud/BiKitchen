import { describe, it, expect } from 'vitest';
import { getSubscriptionProgress, isSubscription, getPlanLabel } from '../utils/subscriptionProgress';

/** Pack mensual con sus 4 fechas ya guardadas, como lo escribe el checkout. */
const packMensual = {
    plan: 'monthly',
    fecha_entrega: '2026-08-05',
    fechas_entrega: ['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26'],
    items: [{ nombre: 'Pack 5 Comidas', plan: 'monthly' }]
};

const el = (iso) => new Date(`${iso}T12:00:00`);

describe('getSubscriptionProgress', () => {
    it('antes de la primera entrega va en la semana 1', () => {
        const p = getSubscriptionProgress(packMensual, el('2026-08-03'));
        expect(p.total).toBe(4);
        expect(p.completadas).toBe(0);
        expect(p.semanaActual).toBe(1);
        expect(p.etiqueta).toBe('Semana 1 de 4');
        expect(p.proxima).toBe('2026-08-05');
    });

    it('el día de una entrega, esa entrega TODAVÍA no cuenta como hecha', () => {
        const p = getSubscriptionProgress(packMensual, el('2026-08-12'));
        expect(p.completadas).toBe(1);
        expect(p.semanaActual).toBe(2);
        expect(p.proxima).toBe('2026-08-12');
        expect(p.esHoy).toBe(true);
    });

    it('entre la segunda y la tercera va en la semana 3', () => {
        const p = getSubscriptionProgress(packMensual, el('2026-08-15'));
        expect(p.completadas).toBe(2);
        expect(p.semanaActual).toBe(3);
        expect(p.etiqueta).toBe('Semana 3 de 4');
        expect(p.proxima).toBe('2026-08-19');
        expect(p.esHoy).toBe(false);
    });

    it('en la última entrega va en la semana 4 y todavía no está completo', () => {
        const p = getSubscriptionProgress(packMensual, el('2026-08-26'));
        expect(p.semanaActual).toBe(4);
        expect(p.finalizado).toBe(false);
        expect(p.esHoy).toBe(true);
    });

    it('después de la última queda completado', () => {
        const p = getSubscriptionProgress(packMensual, el('2026-08-27'));
        expect(p.completadas).toBe(4);
        expect(p.finalizado).toBe(true);
        expect(p.proxima).toBeNull();
        expect(p.etiqueta).toBe('Completado (4 de 4)');
    });

    it('funciona con packs quincenales de 2 entregas', () => {
        const quincenal = {
            plan: 'biweekly',
            fecha_entrega: '2026-08-05',
            fechas_entrega: ['2026-08-05', '2026-08-12'],
            items: [{ nombre: 'Pack 2 semanas', plan: 'biweekly' }]
        };
        const p = getSubscriptionProgress(quincenal, el('2026-08-08'));
        expect(p.total).toBe(2);
        expect(p.etiqueta).toBe('Semana 2 de 2');
    });

    it('calcula las 4 fechas cuando solo viene la primera', () => {
        const soloBase = {
            plan: 'monthly',
            fecha_entrega: '2026-08-05',
            items: [{ nombre: 'Pack mensual', plan: 'monthly' }]
        };
        const p = getSubscriptionProgress(soloBase, el('2026-08-03'));
        expect(p.total).toBe(4);
        expect(p.fechas).toEqual(['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26']);
    });

    it('ordena las fechas aunque vengan desordenadas', () => {
        const desordenado = {
            plan: 'monthly',
            fecha_entrega: '2026-08-05',
            fechas_entrega: ['2026-08-19', '2026-08-05', '2026-08-26', '2026-08-12'],
            items: [{ nombre: 'Pack', plan: 'monthly' }]
        };
        const p = getSubscriptionProgress(desordenado, el('2026-08-15'));
        expect(p.fechas).toEqual(['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26']);
        expect(p.semanaActual).toBe(3);
    });

    it('un pack sin etiqueta de plan ya NO queda desincronizado', () => {
        // Esto marcaba en rojo de verdad: dos packs quincenales cuyas semanas 2
        // la cocina no veía. Se arregló en getScheduleFromOrder, que ahora le cree
        // a las fechas guardadas. La alerta se queda como red de seguridad.
        const sinEtiquetaDePlan = {
            fecha_entrega: '2026-08-05',
            fechas_entrega: ['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26'],
            items: [{ nombre: 'Pack sin etiqueta de plan' }]
        };
        const p = getSubscriptionProgress(sinEtiquetaDePlan, el('2026-08-15'));
        expect(p.total).toBe(4);
        expect(p.semanaActual).toBe(3);
        expect(p.entregasQueVeLaCocina).toBe(4);
        expect(p.cocinaDesincronizada).toBe(false);
    });

    it('un pack bien etiquetado no marca desincronización', () => {
        const p = getSubscriptionProgress(packMensual, el('2026-08-15'));
        expect(p.cocinaDesincronizada).toBe(false);
    });

    it('no revienta con pedidos vacíos o sin fechas', () => {
        expect(() => getSubscriptionProgress(null)).not.toThrow();
        expect(getSubscriptionProgress({}).total).toBe(0);
        expect(getSubscriptionProgress({}).etiqueta).toBe('Sin fechas');
    });
});

describe('isSubscription', () => {
    it('reconoce un pack multi-entrega', () => {
        expect(isSubscription(packMensual)).toBe(true);
    });

    it('un pedido de una sola entrega NO es suscripción', () => {
        expect(isSubscription({
            fecha_entrega: '2026-08-05',
            items: [{ nombre: 'Almuerzo individual' }]
        })).toBe(false);
    });

    it('no revienta con basura', () => {
        expect(isSubscription(null)).toBe(false);
        expect(isSubscription({})).toBe(false);
    });
});

describe('getPlanLabel', () => {
    it('nombra el plan según las entregas', () => {
        expect(getPlanLabel(4)).toBe('Pack mensual');
        expect(getPlanLabel(2)).toBe('Pack quincenal');
        expect(getPlanLabel(3)).toBe('Pack de 3 entregas');
    });
});
