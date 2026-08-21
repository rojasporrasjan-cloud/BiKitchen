import { describe, it, expect } from 'vitest';
import { parseQuantityAndUnit } from '../utils/granelKitchen';

/**
 * Pedidos REALES del sábado 22 de agosto de 2026.
 *
 * Estos casos existen porque la precedencia del gramaje se equivocó dos veces,
 * en direcciones opuestas, y las dos costaron comida:
 *
 *   1) Cuando el PLAN del cliente ganaba, alguien con plan "Pack 5 Proteínas
 *      (250g)" y un plato de 500 g recibía 250 g.
 *   2) Al corregir eso se puso el catálogo por encima de TODO, y entonces el
 *      pedido de Zujeily González —"2 de 250 Fajitas de lomo en salsa gravy"
 *      con catálogo de 250 g— se cocinaba como 250 g en vez de 500 g.
 *
 * La regla que deja bien a los dos: el NOMBRE del plato manda, el catálogo es el
 * respaldo, y el plan va de último.
 */

const total = (nombre, plan, cantidad, gramosCatalogo) =>
    parseQuantityAndUnit(nombre, plan, cantidad, gramosCatalogo).totalQty;

describe('Zujeily González — "pack de 5 proteinas de 250 g"', () => {
    // Su pedido trae los platos con la porción escrita en el nombre
    it('"2 de 250" son 500 g, no 250', () => {
        expect(total('2 de 250 Fajitas de lomo en salsa gravy', '', 1, 250)).toBe(500);
        expect(total('2 de 250 Fajitas de cerdo en salsa teriyaki', '', 1, 250)).toBe(500);
    });

    it('"1 de 250" sí son 250 g', () => {
        expect(total('1 de 250 Pulled pork', '', 1, 250)).toBe(250);
    });

    it('los 5 platos suman los 1.250 g que pagó', () => {
        const suyos = [
            ['2 de 250 Fajitas de lomo en salsa gravy', 2],
            ['2 de 250 Fajitas de cerdo en salsa teriyaki', 2],
            ['1 de 250 Pulled pork', 1]
        ];
        const gramos = suyos.reduce((s, [n]) => s + total(n, '', 1, 250), 0);
        const porciones = suyos.reduce((s, [, p]) => s + p, 0);
        expect(porciones).toBe(5);
        expect(gramos).toBe(1250);
    });
});

describe('El plan del cliente NO puede pisar el gramaje del plato', () => {
    it('plan de 250 g con plato de 500 g cocina 500', () => {
        expect(total('Fajitas de pollo en agridulce', 'Pack 5 Proteínas (250g)', 1, 500)).toBe(500);
    });

    it('el plan solo manda cuando no hay nada más', () => {
        expect(total('Cochinita pibil', '2 de 500', 1, null)).toBe(1000);
    });
});

describe('Los demás individuales del sábado 22', () => {
    it('Andres Loria — 5 proteínas de 500 g', () => {
        expect(total('Fajitas mixtas encebolladas', '', 1, 500)).toBe(500);
        expect(total('Cochinita pibil', '', 1, 500)).toBe(500);
    });

    it('Marcela Serrano — el gramaje escrito en el nombre', () => {
        expect(total('Pollo en salsa de espinaca 500g', '', 1, 0)).toBe(500);
    });

    it('Marcela Serrano — unidades escritas en el nombre', () => {
        const r = parseQuantityAndUnit('Barbudos 6 unidades', '', 1, 0);
        expect(r.totalQty).toBe(6);
        expect(r.unit).toBe('unidades');
    });

    it('Luis López — el gallo pinto va en tazas, no en gramos', () => {
        const r = parseQuantityAndUnit('tazas Gallo pinto ( en dos tazas frijoles mas suaves', '', 4, 0);
        expect(r.unit).toBe('taza(s)');
        expect(r.totalQty).toBe(4);
    });

    it('Luis López — los picadillos con carne son 2 porciones de 250 g', () => {
        expect(total('picadillo vainica con zanahoria y carne molida', '', 2, 250)).toBe(500);
    });

    it('Kendal Solano y Jairo Monge — proteínas de 250 g', () => {
        expect(total('Fajitas de pollo en salsa chipotle', '', 1, 250)).toBe(250);
        expect(total('Carne molida en salsa criolla', '', 1, 250)).toBe(250);
    });
});

describe('Cuando el pedido no dice nada', () => {
    it('una proteína sin gramaje asume 250 g', () => {
        const r = parseQuantityAndUnit('Pollo asado', '', 1, null);
        expect(r.totalQty).toBe(250);
        expect(r.unit).toBe('g');
    });

    it('un acompañamiento sin gramaje asume 1 taza, no gramos', () => {
        const r = parseQuantityAndUnit('Arroz con vegetales', '', 1, null);
        expect(r.unit).toBe('taza(s)');
        expect(r.totalQty).toBe(1);
    });

    it('lo que no es ni proteína ni guarnición cuenta por unidad', () => {
        const r = parseQuantityAndUnit('Postre del día', '', 3, null);
        expect(r.unit).toBe('unidades');
        expect(r.totalQty).toBe(3);
    });
});

describe('La cantidad del pedido multiplica', () => {
    it('dos packs iguales duplican el gramaje', () => {
        expect(total('Fajitas mixtas encebolladas', '', 2, 500)).toBe(1000);
    });

    it('también cuando la porción viene del nombre', () => {
        expect(total('2 de 250 Pulled pork', '', 2, null)).toBe(1000);
    });
});
