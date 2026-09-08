/**
 * El viernes Gina cocina el sábado COMPLETO y va adelantando del lunes solo lo
 * que ya está pagado: los mensuales y quincenales.
 *
 * `tanda=adelanto` no sirve para eso porque recorta la tanda entera, y dejaría
 * el sábado a medias. Por eso el adelanto se marca por fecha.
 */

import { describe, it, expect } from 'vitest';
import { pasaElAdelanto, pedidosDeLaTanda } from '../utils/tandasDeCocina';

const SABADO = '2026-09-05';
const LUNES = '2026-09-07';
const FECHAS = [SABADO, LUNES];
const SOLO_LUNES = new Set([LUNES]);

const calendario = (p) => p.fechasEntrega || [];

// Un mensual entrega cuatro veces; un quincenal dos. Un pedido de una sola
// entrega es "de esta semana" y no se puede adelantar.
const suelto = (fecha) => ({ id: 'suelto', fechasEntrega: [fecha] });
const quincenal = (a, b) => ({ id: 'quincenal', fechasEntrega: [a, b] });
const mensual = (...fs) => ({ id: 'mensual', fechasEntrega: fs });

describe('pasaElAdelanto', () => {

    const opts = { fechas: FECHAS, fechasDeAdelanto: SOLO_LUNES, calendario };

    it('el sábado entra completo, sea recurrente o no', () => {
        expect(pasaElAdelanto(suelto(SABADO), opts)).toBe(true);
        expect(pasaElAdelanto(quincenal(SABADO, '2026-09-19'), opts)).toBe(true);
    });

    it('del lunes solo entran los recurrentes', () => {
        expect(pasaElAdelanto(suelto(LUNES), opts)).toBe(false);
        expect(pasaElAdelanto(quincenal(LUNES, '2026-09-21'), opts)).toBe(true);
        expect(pasaElAdelanto(mensual(LUNES, '2026-09-14', '2026-09-21', '2026-09-28'), opts)).toBe(true);
    });

    it('si entrega sábado Y lunes, entra: el sábado manda', () => {
        expect(pasaElAdelanto(quincenal(SABADO, LUNES), opts)).toBe(true);
    });

    it('sin fechas de adelanto no filtra nada', () => {
        const sinAdelanto = { fechas: FECHAS, fechasDeAdelanto: null, calendario };
        expect(pasaElAdelanto(suelto(LUNES), sinAdelanto)).toBe(true);
        expect(pasaElAdelanto(suelto(LUNES), { fechas: FECHAS, fechasDeAdelanto: new Set(), calendario })).toBe(true);
    });

    it('un pedido de otra fecha no lo decide este filtro', () => {
        expect(pasaElAdelanto(suelto('2026-09-12'), opts)).toBe(true);
    });
});

describe('pedidosDeLaTanda con adelanto por fecha', () => {

    it('deja el sábado completo y del lunes solo los recurrentes', () => {
        const pedidos = [
            { id: 'sab-suelto', fechasEntrega: [SABADO] },
            { id: 'sab-mensual', fechasEntrega: [SABADO, '2026-09-19'] },
            { id: 'lun-suelto', fechasEntrega: [LUNES] },
            { id: 'lun-quincenal', fechasEntrega: [LUNES, '2026-09-21'] }
        ];

        const { nuevos } = pedidosDeLaTanda(pedidos, [], {
            fechas: FECHAS, fechasDeAdelanto: SOLO_LUNES, calendario
        });

        expect(nuevos.map(p => p.id)).toEqual(['sab-suelto', 'sab-mensual', 'lun-quincenal']);
    });

    it('lo ya mandado en otra tanda no se repite', () => {
        // La regla que sostiene todo: si se repite, se cocina dos veces
        const pedidos = [
            { id: 'sab-1', fechasEntrega: [SABADO] },
            { id: 'sab-2', fechasEntrega: [SABADO] }
        ];

        const { nuevos, repetidos } = pedidosDeLaTanda(pedidos, ['sab-1'], {
            fechas: FECHAS, fechasDeAdelanto: SOLO_LUNES, calendario
        });

        expect(nuevos.map(p => p.id)).toEqual(['sab-2']);
        expect(repetidos.map(p => p.id)).toEqual(['sab-1']);
    });

    it('sin adelanto se comporta igual que siempre', () => {
        const pedidos = [
            { id: 'a', fechasEntrega: [SABADO] },
            { id: 'b', fechasEntrega: [LUNES] }
        ];
        const { nuevos } = pedidosDeLaTanda(pedidos, [], { fechas: FECHAS, calendario });
        expect(nuevos).toHaveLength(2);
    });

    it('tanda=adelanto global sigue recortando todo', () => {
        // El de la noche del miércoles: mensuales y quincenales de las dos fechas
        const pedidos = [
            { id: 'sab-suelto', fechasEntrega: [SABADO] },
            { id: 'sab-mensual', fechasEntrega: [SABADO, '2026-09-19'] }
        ];
        const { nuevos } = pedidosDeLaTanda(pedidos, [], {
            soloRecurrentes: true, fechas: FECHAS, calendario
        });
        expect(nuevos.map(p => p.id)).toEqual(['sab-mensual']);
    });
});

/**
 * Del lunes se puede adelantar UNA sola familia.
 *
 * Los bajo calorías son los más del lunes y se pueden dejar hechos el viernes.
 * El resto no vale la pena adelantarlo: pasa demasiado tiempo guardado y le
 * carga el día a la cocina sin necesidad.
 */
describe('adelantar solo una familia de packs', () => {
    const SAB = '2026-09-05';
    const LUN = '2026-09-07';
    const fechas = [SAB, LUN];
    const fechasDeAdelanto = new Set([LUN]);
    const calendario = (p) => p.fechasEntrega;

    const esBajoCalorias = (p) => /bajo\s*(en\s*)?calor/i.test(p.plan || '');

    const bajoLunes = { plan: 'Pack Mensual Bajo Calorías', fechasEntrega: [LUN, '2026-09-14'] };
    const ketoLunes = { plan: 'Pack Keto Mensual', fechasEntrega: [LUN, '2026-09-14'] };
    const ketoSabado = { plan: 'Pack Keto Semanal', fechasEntrega: [SAB] };
    const sueltoLunes = { plan: 'Individuales', fechasEntrega: [LUN] };

    const pasa = (p) => pasaElAdelanto(p, {
        fechas, fechasDeAdelanto, calendario, familiaPermitida: esBajoCalorias
    });

    it('del día de adelanto pasa solo la familia elegida', () => {
        expect(pasa(bajoLunes)).toBe(true);
        expect(pasa(ketoLunes)).toBe(false);
    });

    it('el día completo no se toca: ahí entra todo', () => {
        expect(pasa(ketoSabado)).toBe(true);
    });

    it('el filtro no rescata a los que no son recurrentes', () => {
        // Un individual del lunes no se adelanta aunque fuera bajo calorías
        expect(pasa({ plan: 'Pack Bajo Calorías', fechasEntrega: [LUN] })).toBe(false);
        expect(pasa(sueltoLunes)).toBe(false);
    });

    it('sin filtro se comporta como antes: todos los recurrentes', () => {
        const sinFiltro = (p) => pasaElAdelanto(p, { fechas, fechasDeAdelanto, calendario });
        expect(sinFiltro(bajoLunes)).toBe(true);
        expect(sinFiltro(ketoLunes)).toBe(true);
        expect(sinFiltro(sueltoLunes)).toBe(false);
    });

    it('pedidosDeLaTanda lo respeta', () => {
        const { nuevos } = pedidosDeLaTanda(
            [bajoLunes, ketoLunes, ketoSabado, sueltoLunes], [],
            { fechas, fechasDeAdelanto, calendario, familiaPermitida: esBajoCalorias }
        );
        expect(nuevos).toHaveLength(2);           // el bajo calorías del lunes y el keto del sábado
        expect(nuevos).toContain(bajoLunes);
        expect(nuevos).toContain(ketoSabado);
    });
});
