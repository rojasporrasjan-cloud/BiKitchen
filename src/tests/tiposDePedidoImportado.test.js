import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import {
    buildPedidoFromImport,
    validatePedidoForFirestore,
    pareceIndividual,
    PLAN_INDIVIDUALES
} from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy, buildPackagingSheetData } from '../utils/logisticsUtils';
import { isIndividualPack, mapPackNameToMenuKey } from '../utils/packClassification';
import { getScheduleFromOrder } from '../utils/orderDates';

/**
 * Los 4 tipos de pedido que Gina mete por el importador, cada uno hasta las dos hojas.
 *
 * Lo que se está cuidando acá es la CLASIFICACIÓN, porque de eso depende cómo se
 * imprime cada pedido:
 *
 *   individual  → la hoja usa los platos escritos en el pedido, con su gramaje
 *   pack        → la hoja los busca en el Menú Semanal oficial
 *
 * Si un plato suelto se guarda como pack, la cocina ve el aviso rojo de
 * "Falta configurar el Menú Semanal" y el plato no sale. Al revés, si un pack se
 * guarda como individual, se imprime sin el menú de la semana.
 */

const HOY = new Date('2026-08-14T12:00:00');

/** El nombre bajo el que la hoja agrupa el pedido: eso es lo que clasifica. */
const nombreEnLaHoja = (pedido) => {
    const [mapeado] = mapPedidosFromLegacy([{ id: 'doc', ...pedido }]);
    const { clientes } = buildPackagingSheetData([mapeado], null, null);
    return clientes[0].plan || clientes[0].tipoMenu;
};

// ─────────────────────────────────────────────────────────────
// 1. Pack de proteínas
// ─────────────────────────────────────────────────────────────
describe('1. Pack de proteínas → individual, con su gramaje', () => {
    const parsed = parseOrderBlock(`Cliente: Andres Viquez
Teléfono: 8721-6592
Lugar: Guácima

Pack 5 proteinas de 500 g
pollo al pesto
tilapia al ajillo
pollo en salsa mediterránea
fajitas de cerdo a la naranja
fajitas de cerdo en salsa teriyaki

Precio 39.950
Envío: 3000
Total: 42.950
Entrega:
Lunes 17 agosto`, HOY);

    const pedido = buildPedidoFromImport(parsed);

    it('la hoja lo trata como platos sueltos, no busca Menú Semanal', () => {
        const nombre = nombreEnLaHoja(pedido);
        expect(isIndividualPack(nombre)).toBe(true);
    });

    it('salen los 5 platos, cada uno de 500 g', () => {
        const [hoja] = mapPedidosFromLegacy([{ id: 'doc', ...pedido }]);
        expect(hoja.platos).toHaveLength(5);
        expect(hoja.platos.map(p => p.proteina.nombre)).toEqual([
            'pollo al pesto',
            'tilapia al ajillo',
            'pollo en salsa mediterránea',
            'fajitas de cerdo a la naranja',
            'fajitas de cerdo en salsa teriyaki'
        ]);
        hoja.platos.forEach(p => expect(p.proteina.gramosPorPorcion).toBe(500));
    });

    it('Firestore lo acepta y cae en la fecha correcta', () => {
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
        expect(getScheduleFromOrder(pedido)).toContain('2026-08-17');
    });
});

// ─────────────────────────────────────────────────────────────
// 2. Individuales (platos sueltos)
// ─────────────────────────────────────────────────────────────
describe('2. Individuales → se guardan como individuales, NO como pack', () => {
    const parsed = parseOrderBlock(`Cliente: Laura Mora
Teléfono: 8888-1234
Lugar: Escazú

2 Fajitas de cerdo a la naranja (250g)
Precio 4.500

1 Pollo al pesto (250g)
Precio 2.500

Envío: 2500
Total: 14.000
Entrega: Miércoles 19 agosto`, HOY);

    const pedido = buildPedidoFromImport(parsed);

    it('el nombre del plato NO se usa como nombre de pack', () => {
        // Este era el bug: plan = "Fajitas de cerdo a la naranja (250g)"
        expect(pedido.plan).toBe(PLAN_INDIVIDUALES);
        expect(pedido.esIndividual).toBe(true);
    });

    it('la hoja no le busca Menú Semanal (no sale el aviso rojo)', () => {
        const nombre = nombreEnLaHoja(pedido);
        expect(isIndividualPack(nombre)).toBe(true);
        // El aviso rojo sale cuando NO es individual y no hay menú
        const saleAvisoRojo = !isIndividualPack(nombre) && mapPackNameToMenuKey(nombre) === null;
        expect(saleAvisoRojo).toBe(false);
    });

    it('cada plato conserva su nombre y su gramaje', () => {
        const [hoja] = mapPedidosFromLegacy([{ id: 'doc', ...pedido }]);
        const nombres = hoja.platos.map(p => p.proteina.nombre);
        expect(nombres.join(' | ')).toMatch(/Fajitas de cerdo a la naranja/i);
        expect(nombres.join(' | ')).toMatch(/Pollo al pesto/i);
        hoja.platos.forEach(p => expect(p.proteina.gramosPorPorcion).toBe(250));
    });

    it('los ítems quedan marcados como individuales', () => {
        pedido.items.forEach(i => expect(i.category).toBe('individuales'));
    });
});

// ─────────────────────────────────────────────────────────────
// 3. Pack normal (con Menú Semanal)
// ─────────────────────────────────────────────────────────────
describe('3. Pack normal → sigue buscando su Menú Semanal', () => {
    const parsed = parseOrderBlock(`Cliente: Marta Solano
Teléfono: 8765-4321
Lugar: Moravia

1 Pack Bajo Calorías Mensual
Precio 155.000

Envío: 0
Total: 155.000
Entrega:
Lunes 17 agosto
Lunes 24 agosto
Lunes 31 agosto
Lunes 7 setiembre`, HOY);

    const pedido = buildPedidoFromImport(parsed);

    it('NO se marca como individual', () => {
        expect(pedido.esIndividual).toBe(false);
        expect(pedido.plan).toMatch(/Bajo Calor/i);
        expect(isIndividualPack(nombreEnLaHoja(pedido))).toBe(false);
    });

    it('encuentra su menú de la semana', () => {
        expect(mapPackNameToMenuKey(nombreEnLaHoja(pedido))).toBe('bajoCalorias');
    });

    it('las 4 entregas salen en la hoja, no solo la primera', () => {
        const schedule = getScheduleFromOrder(pedido);
        expect(schedule).toHaveLength(4);
        expect(schedule).toContain('2026-09-07');
        expect(pedido.items[0].plan).toBe('monthly');
    });
});

// ─────────────────────────────────────────────────────────────
// 4. Promoción
// ─────────────────────────────────────────────────────────────
describe('4. Promo → se clasifica por el pack que trae dentro', () => {
    const parsed = parseOrderBlock(`Cliente: Kevin Rojas
Teléfono: 8700-0000
Lugar: Heredia

1 PROMO 2X1 - Pack Keto Quincenal
REGALIA DESAYUNOS
Precio 78.000

Envío: 2000
Total: 80.000
Entrega:
Miércoles 19 agosto
Miércoles 26 agosto`, HOY);

    const pedido = buildPedidoFromImport(parsed);

    it('no se confunde con un individual: adentro hay un pack', () => {
        expect(pedido.esIndividual).toBe(false);
        expect(isIndividualPack(nombreEnLaHoja(pedido))).toBe(false);
    });

    it('la promo no le tapa el menú al pack', () => {
        expect(mapPackNameToMenuKey(nombreEnLaHoja(pedido))).toBe('keto');
    });

    it('la regalía queda escrita en el ítem, no se pierde', () => {
        expect(pedido.items[0].nombre).toMatch(/REGALIA DESAYUNOS/i);
    });

    it('quincenal = 2 entregas', () => {
        expect(getScheduleFromOrder(pedido)).toHaveLength(2);
        expect(pedido.items[0].plan).toBe('biweekly');
    });
});

// ─────────────────────────────────────────────────────────────
// La regla de clasificación, sola
// ─────────────────────────────────────────────────────────────
describe('Cuándo decide que son platos sueltos', () => {
    it('sin la palabra "pack" → individual', () => {
        expect(pareceIndividual([{ nombre: 'Fajitas de cerdo (250g)' }])).toBe(true);
        expect(pareceIndividual([{ nombre: 'Pollo al pesto' }])).toBe(true);
    });

    it('con "pack" → no es individual', () => {
        expect(pareceIndividual([{ nombre: 'Pack Bajo Calorías Mensual' }])).toBe(false);
        expect(pareceIndividual([{ nombre: 'Pack 5 proteinas de 500 g' }])).toBe(false);
        expect(pareceIndividual([{ nombre: 'PROMO 2X1 - Pack Keto' }])).toBe(false);
    });

    it('si un ítem es pack, el pedido entero cuenta como pack', () => {
        expect(pareceIndividual([
            { nombre: 'Pollo al pesto' },
            { nombre: 'Pack Keto Semanal' }
        ])).toBe(false);
    });

    it('"packs" en plural también cuenta', () => {
        expect(pareceIndividual([{ nombre: '2 packs keto' }])).toBe(false);
    });

    it('se puede corregir a mano desde la vista previa', () => {
        const parsed = { cliente: 'X', telefono: '88888888', total: 5000, items: [{ nombre: 'Casadito especial', cantidad: 1, precio: 5000 }] };
        expect(buildPedidoFromImport(parsed).plan).toBe(PLAN_INDIVIDUALES);
        expect(buildPedidoFromImport(parsed, { esIndividual: false }).plan).toBe('Casadito especial');
    });
});
