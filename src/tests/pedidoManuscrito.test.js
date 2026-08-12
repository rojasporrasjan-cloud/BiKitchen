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

/**
 * PLANTILLA OFICIAL para que la administración mande los pedidos.
 *
 * Si estos dos tests pasan, un pedido escrito con esa plantilla entra completo
 * y sin tener que corregir nada a mano. Si alguien cambia el parser y rompe
 * alguno, la plantilla dejó de servir y hay que avisarle a la administración.
 */
describe('Plantilla oficial', () => {
    it('un pedido de una entrega entra sin tocar nada', () => {
        const p = parseOrderBlock(`Cliente: Paola Vacca
Teléfono: 8888-1111
Correo: paola.vacca@gmail.com
Lugar: Heredia, Belén
Dirección: 200m norte de la iglesia, casa verde

1× Pack 3 Proteínas (500g)
Proteínas: Carne mechada, Pollo al pesto, Pollo mediterráneo
Precio 25.850

Envíos 3000
TOTAL: 28.850

Pago: SINPE

Entregas
Miércoles 12 de agosto

Notas: Sin cebolla`, HOY);

        expect(p.warnings).toEqual([]);
        expect(p.cliente).toBe('Paola Vacca');
        expect(p.telefono).toBe('8888-1111');
        expect(p.correo).toBe('paola.vacca@gmail.com');
        expect(p.zona).toBe('Heredia, Belén');
        expect(p.direccion).toBe('200m norte de la iglesia, casa verde');
        expect(p.metodoPago).toBe('SINPE');
        expect(p.observaciones).toBe('Sin cebolla');
        expect(p.costoEnvio).toBe(3000);
        expect(p.total).toBe(28850);
        expect(p.fechasEntrega).toEqual(['2026-08-12']);
        expect(p.items[0].proteinas).toHaveLength(3);

        const pedido = buildPedidoFromImport(p);
        expect(validatePedidoForFirestore(pedido)).toEqual([]);

        const [hoja] = mapPedidosFromLegacy([{ id: 'x', ...pedido }]);
        expect(hoja.platos).toHaveLength(3);
        hoja.platos.forEach(pl => expect(pl.proteina.gramosPorPorcion).toBe(500));
    });

    it('un pack mensual con individuales entra completo y con sus 4 fechas', () => {
        const p = parseOrderBlock(`Cliente: Ana Mora
Teléfono: 8777-2222
Correo: ana.mora@gmail.com
Lugar: Escazú
Dirección: Condominio Vistas, casa 12

1× Pack 5 Comidas (250g)
Proteínas: Pollo al pesto, Res en salsa, Cerdo BBQ, Pollo teriyaki, Carne mechada
Precio 100.000

3× Tortas maduro con queso
Precio 9.000

Envíos 3000
TOTAL: 112.000

Pago: Transferencia

Entregas
Miércoles 12 de agosto
Miércoles 19 de agosto
Miércoles 26 de agosto
Miércoles 2 de septiembre

Notas: Alérgica al maní`, HOY);

        expect(p.warnings).toEqual([]);
        expect(p.fechasEntrega).toEqual([
            '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02'
        ]);
        expect(p.items).toHaveLength(2);
        expect(p.items[1].cantidad).toBe(3);

        const pedido = buildPedidoFromImport(p);
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
        expect(pedido.items[0].plan).toBe('monthly');

        // 5 proteínas del pack + el individual, sin fusionarse
        const [hoja] = mapPedidosFromLegacy([{ id: 'x', ...pedido }]);
        expect(hoja.platos).toHaveLength(6);
        expect(hoja.platos.map(pl => pl.numero)).toEqual([1, 2, 3, 4, 5, 6]);
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
