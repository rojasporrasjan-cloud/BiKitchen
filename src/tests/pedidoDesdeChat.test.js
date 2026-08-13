import { describe, it, expect } from 'vitest';
import { parseOrderBlock, parseFechaEspanol, limpiarPrefijosDeChat } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';
import { getScheduleFromOrder } from '../utils/orderDates';

/**
 * Pedidos pegados DIRECTO del chat de WhatsApp.
 *
 * Son mensajes reales, con todo lo que traen: sellos de hora, el pedido partido
 * en dos mensajes, ítems sin número, fechas sin "de" y notas sueltas sin etiqueta.
 */

const HOY = new Date('2026-08-12T09:00:00');

// Los dos mensajes de un mismo pedido, copiados del chat tal cual
const PEGADO_DEL_CHAT = `[10:50 p. m., 12/8/2026] Gina: two pack bajo calorias Mensual
REGALIA DESAYUNOS
Precio 155.000

Envío: ₡7000

Total: ₡162.000

Entrega:
Sábado 15 agosto
Sábado 22 agosto
Sábado 29 agosto
Sábado 05 setiembre
[10:54 p. m., 12/8/2026] Gina: Cliente: Maycol Ávila
Lugar: Belén

Solo chayote y zanahoria`;

describe('Pedido pegado del chat', () => {
    const p = parseOrderBlock(PEGADO_DEL_CHAT, HOY);

    it('lee el cliente aunque venga detrás del sello de hora', () => {
        expect(p.cliente).toBe('Maycol Ávila');
        expect(p.zona).toBe('Belén');
    });

    it('junta los dos mensajes en un solo pedido', () => {
        expect(p.items).toHaveLength(1);
        expect(p.total).toBe(162000);
        expect(p.costoEnvio).toBe(7000);
    });

    it('lee el ítem aunque no arranque con número', () => {
        expect(p.items[0].nombre).toContain('two pack bajo calorias');
        expect(p.items[0].nombre).toContain('REGALIA DESAYUNOS');
        expect(p.items[0].precio).toBe(155000);
        expect(p.items[0].cantidad).toBe(1);
    });

    it('lee las 4 fechas aunque no lleven "de"', () => {
        expect(p.fechasEntrega).toEqual([
            '2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05'
        ]);
    });

    it('rescata la restricción de comida que viene suelta', () => {
        // Perder esto es de los errores más caros: nadie se entera hasta que el
        // cliente recibe algo que no come.
        expect(p.observaciones).toBe('Solo chayote y zanahoria');
    });

    it('solo reclama el teléfono, que es lo único que de verdad falta', () => {
        expect(p.warnings.join(' ')).toMatch(/tel[ée]fono/i);
        expect(p.warnings.join(' ')).not.toMatch(/[íi]tem/i);
        expect(p.warnings.join(' ')).not.toMatch(/fecha de entrega/i);
    });

    it('con el teléfono agregado a mano queda listo para la cocina', () => {
        const pedido = buildPedidoFromImport({ ...p, telefono: '8888-3333' });
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
        expect(pedido.observaciones).toBe('Solo chayote y zanahoria');
        expect(pedido.items[0].plan).toBe('monthly');
        expect(getScheduleFromOrder(pedido)).toEqual([
            '2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05'
        ]);
    });
});

describe('El sello de hora del chat no puede pasar por fecha de entrega', () => {
    it('no toma la fecha del sello como entrega', () => {
        // Este era el error mudo: el pedido se creaba bien pero programado para
        // el día en que se escribió el mensaje.
        const p = parseOrderBlock(
            `Entrega:\n[10:54 p. m., 30/9/2026] Gina: algo más`,
            HOY
        );
        expect(p.fechasEntrega).toEqual([]);
    });

    it('quita el sello y el nombre de quien escribe', () => {
        expect(limpiarPrefijosDeChat('[10:50 p. m., 12/8/2026] Gina: hola'))
            .toBe('hola');
        expect(limpiarPrefijosDeChat('12/8/2026, 10:50 p. m. - Gina: hola'))
            .toBe('hola');
    });

    it('NO se come una etiqueta que sí importa', () => {
        // "Cliente:" parece "Nombre: " de un chat, pero es un dato del pedido
        expect(limpiarPrefijosDeChat('[10:54 p. m., 12/8/2026] Cliente: Maycol'))
            .toBe('Cliente: Maycol');
    });

    it('deja intactas las líneas normales', () => {
        expect(limpiarPrefijosDeChat('Precio 155.000')).toBe('Precio 155.000');
        expect(limpiarPrefijosDeChat('Total: ₡162.000')).toBe('Total: ₡162.000');
    });
});

describe('Fechas sin "de"', () => {
    it('entiende "15 agosto" igual que "15 de agosto"', () => {
        expect(parseFechaEspanol('Sábado 15 agosto', HOY)).toBe('2026-08-15');
        expect(parseFechaEspanol('Sábado 05 setiembre', HOY)).toBe('2026-09-05');
        expect(parseFechaEspanol('15 de agosto', HOY)).toBe('2026-08-15');
    });

    it('no confunde un ítem con una fecha', () => {
        // "1 pack bajo calorías": número + palabra, pero la palabra no es un mes
        expect(parseFechaEspanol('1 pack bajo calorías', HOY)).toBeNull();
        expect(parseFechaEspanol('3 proteínas de 500g', HOY)).toBeNull();
    });
});

describe('Notas sueltas', () => {
    it('no inventa notas cuando el pedido viene completo y ordenado', () => {
        const p = parseOrderBlock(`Cliente: Ana Mora
Teléfono: 8888-1111
Lugar: Escazú

1 Pack 3 Proteínas (250g)
Proteínas: Pollo, Res, Cerdo
Precio 25.000

Total: ₡28.000

Entrega:
Sábado 15 de agosto`, HOY);

        expect(p.observaciones).toBeNull();
        expect(p.items).toHaveLength(1);
    });

    it('la etiqueta explícita gana sobre el rescate', () => {
        const p = parseOrderBlock(`Cliente: Ana Mora
Notas: Sin sal
Alguna línea suelta`, HOY);
        expect(p.observaciones).toBe('Sin sal');
    });
});
