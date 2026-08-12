import { describe, it, expect } from 'vitest';
import { parseOrderBlock, parseFechaEspanol } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';

/**
 * Pedidos escritos A MANO por la administración.
 *
 * No los genera el sistema, así que no siguen ninguna plantilla: sin dos puntos,
 * con casillas □, montos sin ₡, fechas en español y sin teléfono ni correo.
 * Este es el formato real que llega por WhatsApp para meter a mano.
 */

const MANUSCRITO = `Cliente: Paola Vacca
Lugar:  Heredia, Belén

□ 1 pack 3 proteínas de 500g
Precio 25.850

Envíos 3000

TOTAL: 28.850

Entregas
Miércoles 12 de agosto`;

const HOY = new Date('2026-08-12T09:00:00');

describe('Pedido escrito a mano', () => {
    const p = parseOrderBlock(MANUSCRITO, HOY);

    it('lee el cliente y el lugar', () => {
        expect(p.cliente).toBe('Paola Vacca');
        expect(p.zona).toBe('Heredia, Belén');
    });

    it('lee los montos aunque no lleven ₡ ni dos puntos', () => {
        expect(p.total).toBe(28850);
        expect(p.costoEnvio).toBe(3000); // "Envíos 3000"
    });

    it('lee el ítem sin × y su precio de la línea de abajo', () => {
        expect(p.items).toHaveLength(1);
        expect(p.items[0].cantidad).toBe(1);
        expect(p.items[0].nombre).toBe('pack 3 proteínas de 500g');
        expect(p.items[0].precio).toBe(25850); // "Precio 25.850"
    });

    it('entiende la fecha en español debajo del encabezado', () => {
        expect(p.fechasEntrega).toEqual(['2026-08-12']);
    });

    it('no confunde la línea de la fecha con un ítem', () => {
        // "Miércoles 12 de agosto" empieza con número tras la palabra:
        // si se colara como ítem, aparecería un plato fantasma
        expect(p.items.map(i => i.nombre)).not.toContain('de agosto');
        expect(p.items).toHaveLength(1);
    });

    it('avisa que faltan teléfono y correo', () => {
        expect(p.telefono).toBeNull();
        expect(p.correo).toBeNull();
        expect(validatePedidoForFirestore(buildPedidoFromImport(p)).length).toBeGreaterThan(0);
    });

    it('avisa que el pack anuncia 3 proteínas pero no dice cuáles', () => {
        expect(p.warnings.join(' ')).toMatch(/dice 3 prote[íi]nas pero no dice cu[áa]les/i);
    });

    it('completando los datos queda listo para guardar y para la cocina', () => {
        const completo = buildPedidoFromImport({
            ...p,
            telefono: '88881111',
            correo: 'paola.vacca@gmail.com',
            items: [{
                ...p.items[0],
                proteinas: ['Carne mechada', 'Pollo al pesto', 'Pollo mediterráneo']
            }]
        });

        expect(validatePedidoForFirestore(completo)).toEqual([]);
        expect(completo.fecha_entrega).toBe('2026-08-12');
        expect(completo.zona_envio).toBe('Heredia, Belén');

        const [hoja] = mapPedidosFromLegacy([{ id: 'x', ...completo }]);
        expect(hoja.platos).toHaveLength(3);
        hoja.platos.forEach(plato => {
            // El "de 500g" del nombre es de donde sale la porción
            expect(plato.proteina.gramosPorPorcion).toBe(500);
        });
        expect(hoja.platos.map(pl => pl.proteina.nombre)).toEqual([
            'Carne mechada', 'Pollo al pesto', 'Pollo mediterráneo'
        ]);
    });
});

describe('parseFechaEspanol', () => {
    it('entiende las fechas como las escribe la administración', () => {
        expect(parseFechaEspanol('Miércoles 12 de agosto', HOY)).toBe('2026-08-12');
        expect(parseFechaEspanol('12 de agosto de 2026', HOY)).toBe('2026-08-12');
        expect(parseFechaEspanol('Sábado 5 de septiembre', HOY)).toBe('2026-09-05');
        expect(parseFechaEspanol('3 de setiembre', HOY)).toBe('2026-09-03'); // variante tica
        expect(parseFechaEspanol('12/08/2026', HOY)).toBe('2026-08-12');
        expect(parseFechaEspanol('2026-08-12', HOY)).toBe('2026-08-12');
    });

    it('cuando no hay año y la fecha ya pasó hace rato, asume el siguiente', () => {
        // Escribiendo en diciembre, "5 de enero" es del año que viene
        const diciembre = new Date('2026-12-20T09:00:00');
        expect(parseFechaEspanol('5 de enero', diciembre)).toBe('2027-01-05');
    });

    it('una fecha de hace pocos días se queda en el año actual', () => {
        expect(parseFechaEspanol('8 de agosto', HOY)).toBe('2026-08-08');
    });

    it('devuelve null con lo que no es fecha', () => {
        expect(parseFechaEspanol('la otra semana', HOY)).toBeNull();
        expect(parseFechaEspanol('', HOY)).toBeNull();
        expect(parseFechaEspanol(null, HOY)).toBeNull();
        expect(parseFechaEspanol('45 de agosto', HOY)).toBeNull();
    });
});

describe('Varias entregas escritas a mano', () => {
    it('lee las 4 fechas de un pack mensual y lo marca como mensual', () => {
        const mensual = parseOrderBlock(`Cliente: Ana Mora
Lugar: Escazú

□ 1 pack mensual
Precio 100.000

TOTAL: 100.000

Entregas
Miércoles 12 de agosto
Miércoles 19 de agosto
Miércoles 26 de agosto
Miércoles 2 de septiembre`, HOY);

        expect(mensual.fechasEntrega).toEqual([
            '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02'
        ]);

        const pedido = buildPedidoFromImport(mensual);
        expect(pedido.items[0].plan).toBe('monthly');
    });
});
