import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';
import { isIndividualPack } from '../utils/packClassification';
import { getScheduleFromOrder } from '../utils/orderDates';

/**
 * Pack con una cantidad que NO es la estándar: 6 desayunos por semana en vez de 5.
 *
 * Este pedido real no se podía importar: no traía línea de "Precio" (el monto
 * venía solo como "Total:"), así que el parser cortaba ahí y devolvía CERO ítems.
 * Sin ítems no hay platos, y sin platos la hoja de cocina sale vacía.
 *
 * Y aunque se hubiera leído, la hoja arma los platos desde el Menú Semanal, que
 * tiene 5 desayunos: el sexto nunca habría salido. Acá los platos vienen escritos
 * en el pedido, así que la hoja tiene que usar ESOS y no el menú.
 */

const HOY = new Date('2026-08-10T12:00:00');

const PEDIDO_ANGIE = `Cliente: Angie Navarro
Zona de entrega:
teléfono: 88492466

◽Paquete mensual desayunos ( 6 por semana)
Gallo pinto con huevo

Total: 66.800 colones

Total 66.800

Entrega:
Miércoles 12 agosto
Miércoles 19 agosto
Miércoles 26 agosto
Miércoles 02 setiembre`;

describe('Paquete de desayunos con 6 por semana', () => {
    const p = parseOrderBlock(PEDIDO_ANGIE, HOY);

    it('lee el ítem aunque el monto solo venga como "Total:"', () => {
        expect(p.items).toHaveLength(1);
        expect(p.warnings).toEqual([]);
    });

    it('el "6 por semana" se convierte en 6 platos del mismo desayuno', () => {
        expect(p.items[0].proteinas).toEqual(Array(6).fill('Gallo pinto con huevo'));
    });

    it('lee el resto del pedido', () => {
        expect(p.cliente).toBe('Angie Navarro');
        expect(p.telefono).toBe('88492466');
        expect(p.total).toBe(66800);
        expect(p.fechasEntrega).toEqual([
            '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02'
        ]);
    });

    const pedido = buildPedidoFromImport(p);

    it('se puede crear en Firestore', () => {
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
    });

    it('las 4 semanas salen en la hoja, no solo la primera', () => {
        expect(getScheduleFromOrder(pedido)).toHaveLength(4);
        expect(pedido.items[0].plan).toBe('monthly');
    });

    it('NO le busca Menú Semanal: los platos vienen en el pedido', () => {
        // Si se clasificara como pack, la hoja buscaría los 5 desayunos del menú
        // oficial y el sexto se perdería.
        expect(pedido.esIndividual).toBe(true);
        expect(isIndividualPack(pedido.plan)).toBe(true);
    });

    it('la hoja de cocina recibe los 6 platos', () => {
        const [hoja] = mapPedidosFromLegacy([{ id: 'x', ...pedido }]);
        expect(hoja.platos).toHaveLength(6);
        hoja.platos.forEach(pl =>
            expect(pl.proteina.nombre).toBe('Gallo pinto con huevo')
        );
    });
});

describe('Otras formas de anunciar la cantidad', () => {
    const platosDe = (texto) => parseOrderBlock(
        `Cliente: X\nTeléfono: 88888888\n${texto}\nTotal: 10.000`, HOY
    ).items[0]?.proteinas || [];

    it('"5 comidas" con un solo plato lo repite 5 veces', () => {
        expect(platosDe('Pack 5 comidas semanal\nPollo asado')).toHaveLength(5);
    });

    it('"7 desayunos" repite 7 veces', () => {
        expect(platosDe('Paquete 7 desayunos\nTostadas francesas')).toHaveLength(7);
    });

    it('si lista varios platos, cada línea es un plato distinto', () => {
        expect(platosDe('Pack 3 proteínas de 500g\nPollo al pesto\nTilapia al ajillo\nCarne mechada'))
            .toEqual(['Pollo al pesto', 'Tilapia al ajillo', 'Carne mechada']);
    });
});

describe('No se rompe lo que ya funcionaba', () => {
    it('un pack sin cantidad anunciada sigue pegando la descripción al nombre', () => {
        const p = parseOrderBlock(`two pack bajo calorias Mensual
REGALIA DESAYUNOS
Precio 155.000`, HOY);
        expect(p.items).toHaveLength(1);
        expect(p.items[0].nombre).toContain('REGALIA DESAYUNOS');
        expect(p.items[0].proteinas).toEqual([]);
    });

    it('un pack que anuncia proteínas pero no las lista sigue avisando', () => {
        const p = parseOrderBlock(`□ 1 pack 3 proteínas de 500g
Precio 25.850`, HOY);
        expect(p.items[0].proteinas).toEqual([]);
        expect(p.warnings.join(' ')).toMatch(/dice 3 prote[íi]nas pero no dice cu[áa]les/i);
    });

    it('una línea suelta que no es ítem no se inventa un ítem', () => {
        const p = parseOrderBlock(`Cliente: X
Teléfono: 88888888
Gracias por su compra
Total: 5.000`, HOY);
        expect(p.items).toEqual([]);
    });
});
