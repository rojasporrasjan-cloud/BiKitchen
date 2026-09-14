import { describe, it, expect } from 'vitest';
import {
    pedidosDelDia, empacadosDelViernesPorDefecto, descuentoDelDia, diaDeLaTanda,
    fechasDelCiclo, esDiaDelCiclo
} from '../utils/planDelCiclo';

/**
 * El ciclo del sábado 19 y el lunes 21 de setiembre de 2026, con un pedido de
 * cada tipo que importa.
 */
const SAB = '2026-09-19';
const LUN = '2026-09-21';

const p = (id, plan, familia, fechas) => ({ id, plan, familia, fechas });
const PEDIDOS = [
    p('sab-bajo', 'Pack Bajo Calorías', 'bajoCalorias', [SAB]),
    p('sab-keto', 'Pack Keto', 'keto', [SAB]),
    p('lun-bajo-mensual', 'Pack Mensual Bajo Calorías', 'bajoCalorias', ['2026-09-14', LUN, '2026-09-28', '2026-10-05']),
    p('lun-bajo-semanal', 'Pack Bajo Calorías', 'bajoCalorias', [LUN]),
    p('lun-casadito-mensual', 'Pack Casaditos Mensual', 'casaditos', ['2026-09-14', LUN, '2026-09-28', '2026-10-05']),
    p('lun-individual', 'Individuales', null, [LUN]),
    p('lun-familiar', 'Pack Familiar Deluxe', 'familiarDeluxe', [LUN]),
    p('lun-personalizado', 'Personalizado Bajo Calorías — Ana', 'bajoCalorias', ['2026-09-14', LUN])
];
const base = {
    pedidos: PEDIDOS,
    fechas: [LUN, SAB],
    calendario: (x) => x.fechas,
    familiaDe: (x) => x.familia,
    esRecurrente: (x) => x.fechas.length > 1,
    claveDe: (x) => x.id
};
const ids = (l) => l.map(x => x.id).sort();

describe('el ciclo', () => {
    it('ordena las fechas: sábado y lunes', () => {
        expect(fechasDelCiclo([LUN, SAB])).toEqual({ sabado: SAB, lunes: LUN });
    });
    it('solo jueves, viernes y sábado son días del ciclo', () => {
        expect(esDiaDelCiclo('viernes')).toBe(true);
        expect(esDiaDelCiclo('martes')).toBe(false);
    });
});

describe('JUEVES: solo cocina', () => {
    const { cocina } = pedidosDelDia({ ...base, dia: 'jueves' });

    it('el sábado completo y los mensuales/quincenales del lunes', () => {
        expect(ids(cocina)).toEqual(['lun-bajo-mensual', 'lun-casadito-mensual', 'lun-personalizado', 'sab-bajo']);
    });

    it('sin keto ni familiares: Gina los hace el viernes', () => {
        expect(ids(cocina)).not.toContain('sab-keto');
        expect(ids(cocina)).not.toContain('lun-familiar');
    });

    it('los semanales del lunes no se adelantan', () => {
        expect(ids(cocina)).not.toContain('lun-bajo-semanal');
        expect(ids(cocina)).not.toContain('lun-individual');
    });
});

describe('VIERNES: el sábado completo + bajo calorías del lunes', () => {
    const { cocina, empaque } = pedidosDelDia({ ...base, dia: 'viernes' });

    it('trae el sábado completo, keto incluido', () => {
        expect(ids(cocina)).toContain('sab-keto');
        expect(ids(cocina)).toContain('sab-bajo');
    });

    it('del lunes solo los bajo calorías, mensuales y semanales', () => {
        expect(ids(cocina)).toEqual(['lun-bajo-mensual', 'lun-bajo-semanal', 'sab-bajo', 'sab-keto']);
    });

    it('un personalizado no se adelanta aunque sea bajo calorías', () => {
        expect(ids(cocina)).not.toContain('lun-personalizado');
    });

    it('cocina y empaque son la misma lista', () => {
        expect(ids(empaque)).toEqual(ids(cocina));
    });
});

describe('SÁBADO: todo el lunes, menos lo del viernes', () => {
    it('sin nada marcado, todo el lunes (semanales, individuales, familiares)', () => {
        const { cocina } = pedidosDelDia({ ...base, dia: 'sabado', empacados: [] });
        expect(ids(cocina)).toEqual(['lun-bajo-mensual', 'lun-bajo-semanal', 'lun-casadito-mensual', 'lun-familiar', 'lun-individual', 'lun-personalizado']);
    });

    it('nada del sábado: eso ya se entregó', () => {
        const { cocina } = pedidosDelDia({ ...base, dia: 'sabado', empacados: [] });
        expect(ids(cocina)).not.toContain('sab-bajo');
    });

    it('saca los que se empacaron el viernes, de la cocina y del empaque', () => {
        const empacados = empacadosDelViernesPorDefecto(base);
        const { cocina, empaque } = pedidosDelDia({ ...base, dia: 'sabado', empacados });
        expect(ids(cocina)).toEqual(['lun-casadito-mensual', 'lun-familiar', 'lun-individual', 'lun-personalizado']);
        expect(ids(empaque)).toEqual(ids(cocina));
    });

    /** "puede ser que se empaquen más del lunes" — Jan. */
    it('si el viernes se empacó uno más, se marca y también sale', () => {
        const empacados = [...empacadosDelViernesPorDefecto(base), 'lun-casadito-mensual'];
        const { cocina } = pedidosDelDia({ ...base, dia: 'sabado', empacados });
        expect(ids(cocina)).not.toContain('lun-casadito-mensual');
    });

    it('delLunes trae a todos, para poder marcar o desmarcar', () => {
        const { delLunes } = pedidosDelDia({ ...base, dia: 'sabado', empacados: ['lun-bajo-mensual'] });
        expect(ids(delLunes)).toContain('lun-bajo-mensual');
    });
});

describe('lo empacado el viernes, por defecto', () => {
    it('son los bajo calorías del lunes, sin el personalizado', () => {
        expect(empacadosDelViernesPorDefecto(base).sort()).toEqual(['lun-bajo-mensual', 'lun-bajo-semanal']);
    });
});

describe('qué se descuenta cada día', () => {
    const TANDAS = [
        { dia: 'jueves', cocinado: { 'pollo al pesto|g': 9000, 'arroz blanco|taza(s)': 70 } },
        { dia: 'viernes', cocinado: { 'pollo al pesto|g': 1500 } }
    ];

    it('jueves: nada', () => {
        expect(descuentoDelDia({ dia: 'jueves', tandas: TANDAS })).toEqual({ cocinado: {}, usarSobrantes: false, origen: 'nada' });
    });

    it('viernes: lo cocinado el jueves, y NO lo del mismo viernes', () => {
        const d = descuentoDelDia({ dia: 'viernes', tandas: TANDAS });
        expect(d.cocinado).toEqual({ 'pollo al pesto|g': 9000, 'arroz blanco|taza(s)': 70 });
        expect(d.usarSobrantes).toBe(false);
    });

    /** Marcar la hoja del jueves Y cargar el Excel de Gina descontaba el jueves dos veces. */
    it('viernes con el Excel de Gina: manda el Excel y la hoja NO se suma', () => {
        const d = descuentoDelDia({ dia: 'viernes', tandas: TANDAS, excelDeGina: { 'pollo al pesto|g': 10000 } });
        expect(d.cocinado).toEqual({ 'pollo al pesto|g': 10000 });
        expect(d.origen).toBe('excel');
    });

    it('viernes sin nada anotado del jueves: lo dice', () => {
        expect(descuentoDelDia({ dia: 'viernes', tandas: [] }).origen).toBe('nada');
    });

    /**
     * EL BUG DEL SÁBADO. Pollo al pesto: el ciclo pide 10 kg (4 sábado, 6
     * lunes). Jueves 6, viernes 2: van 8. El viernes se empaca el sábado (4) y
     * 3 del lunes: queda 1 kg y Gina lo reporta. Al lunes le faltan 3 y hay 1:
     * hay que cocinar 2. La hoja vieja decía 0.
     */
    it('sábado: solo lo que sobró, nunca lo del jueves y el viernes', () => {
        const d = descuentoDelDia({ dia: 'sabado', tandas: TANDAS });
        expect(d.cocinado).toEqual({});
        expect(d.usarSobrantes).toBe(true);

        const pideElLunesQueFalta = 6 - 3;      // lo que no se empacó el viernes
        const sobro = 1;
        expect(Math.max(0, pideElLunesQueFalta - sobro)).toBe(2);
    });
});

describe('de qué día es una hoja ya mandada', () => {
    it('las nuevas lo dicen', () => {
        expect(diaDeLaTanda({ dia: 'viernes', enviada: '2026-09-17T20:00:00Z' })).toBe('viernes');
    });

    it('las viejas: por el día en Costa Rica en que se mandó', () => {
        // jueves 17, 9 p.m. en Costa Rica = viernes 18, 3 a.m. UTC
        expect(diaDeLaTanda({ enviada: '2026-09-18T03:00:00Z' })).toBe('jueves');
        expect(diaDeLaTanda({ enviada: '2026-09-18T20:00:00Z' })).toBe('viernes');
    });

    it('sin fecha no inventa', () => {
        expect(diaDeLaTanda({})).toBeNull();
    });
});
