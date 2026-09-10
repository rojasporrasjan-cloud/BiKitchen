import { describe, it, expect } from 'vitest';
import { parseFechaEspanol, parseOrderBlock } from '../utils/parseOrderText';

const HOY = new Date('2026-09-10T12:00:00');
const SETIEMBRE = 8; // los meses van de 0 a 11

/**
 * Un ítem que arranca con número no es una fecha de entrega.
 *
 * Dentro del bloque de entregas se acepta un día sin mes ("Miércoles 26" hereda
 * setiembre de la línea de arriba). Eso tomaba CUALQUIER renglón que empezara
 * con un número: la regalía de Giancarlo Longui, escrita como
 * "3 Individuales — Pollo encebollado 250 g", le agregaba una entrega el 3 de
 * setiembre que nadie pidió.
 */
describe('fechas fantasma', () => {
    it('un item que empieza con numero NO es una fecha', () => {
        expect(parseFechaEspanol('3 Individuales — Pollo encebollado 250 g', HOY, SETIEMBRE)).toBeNull();
        expect(parseFechaEspanol('1 Pack Bajo Calorias mensual', HOY, SETIEMBRE)).toBeNull();
        expect(parseFechaEspanol('5 almuerzos', HOY, SETIEMBRE)).toBeNull();
        expect(parseFechaEspanol('2 x Pack Regular', HOY, SETIEMBRE)).toBeNull();
    });

    it('las fechas de verdad se siguen leyendo igual', () => {
        expect(parseFechaEspanol('Miércoles 26', HOY, 7)).toBe('2026-08-26');
        expect(parseFechaEspanol('26', HOY, 7)).toBe('2026-08-26');
        expect(parseFechaEspanol('Lunes 14 setiembre', HOY)).toBe('2026-09-14');
        expect(parseFechaEspanol('Lunes 31 agosto', HOY)).toBe('2026-08-31');
        expect(parseFechaEspanol('14 de setiembre', HOY)).toBe('2026-09-14');
        expect(parseFechaEspanol('2026-09-14', HOY)).toBe('2026-09-14');
        expect(parseFechaEspanol('14/9/2026', HOY)).toBe('2026-09-14');
    });

    it('sin mes del bloque, un dia suelto no alcanza', () => {
        expect(parseFechaEspanol('26', HOY)).toBeNull();
    });

    it('el pedido de la regalia de Giancarlo queda con UNA sola entrega', () => {
        const texto = [
            'Cliente: Giancarlo Longui',
            'Telefono: 8736 4315',
            'Zona: Sabana Sur',
            'Total: 0',
            'Entrega: 14/9/2026',
            '1 Individuales — Pollo encebollado 250 g',
            '1 Individuales — Pollo mediterraneo 250 g',
            '1 Individuales — Cerdo en salsa BBQ 250 g'
        ].join('\n');
        const p = parseOrderBlock(texto, HOY);
        expect(p.fechasEntrega).toEqual(['2026-09-14']);
        expect(p.items).toHaveLength(3);
    });

    it('un pack mensual con sus cuatro entregas escritas sigue trayendo las cuatro', () => {
        const texto = [
            'Cliente: Giancarlo Longui',
            'Telefono: 8736 4315',
            'Lugar: Sabana Sur',
            'Entregas',
            'Lunes 31 agosto',
            'Lunes 07 setiembre',
            'Lunes 14 setiembre',
            'Lunes 21 setiembre'
        ].join('\n');
        const p = parseOrderBlock(texto, HOY);
        expect(p.fechasEntrega).toEqual([
            '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'
        ]);
    });
});
