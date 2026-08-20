import { describe, it, expect } from 'vitest';
import {
    CATEGORIAS_CUPON, itemAplica, itemsQueAplican, montoQueAplica,
    descuentoConRestricciones, etiquetasDe, motivoNoAplica
} from '../utils/cuponRestricciones';

/** Cupón de bienvenida: 20% en los 4 tipos de pack acordados. */
const CUPON = {
    type: 'percentage',
    value: 20,
    aplicaA: ['semanales', 'familiares', 'proteinas500', 'individuales']
};

const item = (nombre, precio = 25000, cantidad = 1) => ({ nombre, precio, cantidad });

describe('Qué packs entran en el cupón', () => {
    it('los semanales', () => {
        expect(itemAplica(item('Pack Keto Semanal'), CUPON.aplicaA)).toBe(true);
        expect(itemAplica(item('5 Comidas a la Semana - Pack Regular'), CUPON.aplicaA)).toBe(true);
    });

    it('los familiares', () => {
        expect(itemAplica(item('Pack Familiar Premium'), CUPON.aplicaA)).toBe(true);
        expect(itemAplica(item('Pack Familiar Deluxe'), CUPON.aplicaA)).toBe(true);
    });

    it('el de proteínas de 500 g', () => {
        expect(itemAplica(item('Pack 5 Proteínas (500g)'), CUPON.aplicaA)).toBe(true);
        expect(itemAplica(item('Pack 3 proteinas de 500 g'), CUPON.aplicaA)).toBe(true);
    });

    it('el de proteínas de 250 g NO entra', () => {
        expect(itemAplica(item('Pack 5 Proteínas (250g)'), CUPON.aplicaA)).toBe(false);
        expect(itemAplica(item('Pack 3 proteína de 250 g'), CUPON.aplicaA)).toBe(false);
    });

    it('los individuales', () => {
        expect(itemAplica(item('Individuales'), CUPON.aplicaA)).toBe(true);
        expect(itemAplica(item('Torta de huevo (Individual 4 tazas)'), CUPON.aplicaA)).toBe(true);
    });

    it('un pack mensual suelto NO entra', () => {
        expect(itemAplica(item('Pack Keto Mensual'), CUPON.aplicaA)).toBe(false);
    });

    it('mira también el plan y la categoría, no solo el nombre', () => {
        expect(itemAplica({ nombre: 'Pack Keto', planLabel: 'Semanal' }, CUPON.aplicaA)).toBe(true);
        expect(itemAplica({ nombre: 'Gallo pinto', categoryLabel: 'Individuales' }, CUPON.aplicaA)).toBe(true);
    });

    it('sin restricciones aplica a todo', () => {
        expect(itemAplica(item('Lo que sea'), [])).toBe(true);
    });
});

describe('El descuento sale solo de lo que califica', () => {
    it('un carrito mixto descuenta únicamente el pack que aplica', () => {
        const carrito = [item('Pack Keto Semanal', 25000), item('Pack Keto Mensual', 80000)];
        const r = descuentoConRestricciones(CUPON, carrito);
        expect(r.montoBase).toBe(25000);       // no los 105.000 del carrito
        expect(r.descuento).toBe(5000);        // 20% de 25.000
        expect(r.itemsAplicables).toBe(1);
    });

    it('respeta la cantidad', () => {
        const r = descuentoConRestricciones(CUPON, [item('Pack Familiar', 30000, 2)]);
        expect(r.montoBase).toBe(60000);
        expect(r.descuento).toBe(12000);
    });

    it('si nada califica, no hay descuento', () => {
        const r = descuentoConRestricciones(CUPON, [item('Pack Keto Mensual', 80000)]);
        expect(r.descuento).toBe(0);
        expect(r.itemsAplicables).toBe(0);
    });

    it('un descuento fijo nunca se pasa del monto que califica', () => {
        const fijo = { type: 'fixed', value: 50000, aplicaA: ['semanales'] };
        const r = descuentoConRestricciones(fijo, [item('Pack Semanal', 25000)]);
        expect(r.descuento).toBe(25000);
    });

    it('respeta el tope de descuento', () => {
        const conTope = { ...CUPON, maxDiscount: 4000 };
        const r = descuentoConRestricciones(conTope, [item('Pack Semanal', 25000)]);
        expect(r.descuento).toBe(4000);
    });

    it('un carrito vacío no revienta', () => {
        expect(descuentoConRestricciones(CUPON, []).descuento).toBe(0);
    });
});

describe('Qué se le dice al cliente', () => {
    it('lista los packs que aplican', () => {
        expect(etiquetasDe(CUPON.aplicaA)).toEqual([
            'Packs semanales', 'Packs familiares', 'Pack de proteínas 500 g', 'Packs individuales'
        ]);
    });

    it('explica por qué no aplica', () => {
        const msg = motivoNoAplica(CUPON, [item('Pack Keto Mensual')]);
        expect(msg).toMatch(/solo aplica a/i);
        expect(msg).toMatch(/Packs semanales/);
    });

    it('no dice nada si sí aplica', () => {
        expect(motivoNoAplica(CUPON, [item('Pack Keto Semanal')])).toBeNull();
    });

    it('un cupón sin restricciones nunca se queja', () => {
        expect(motivoNoAplica({ type: 'percentage', value: 10 }, [item('X')])).toBeNull();
    });
});

describe('Las categorías están completas', () => {
    it('son las cuatro acordadas', () => {
        expect(CATEGORIAS_CUPON.map(c => c.id)).toEqual(
            ['semanales', 'familiares', 'proteinas500', 'individuales']
        );
    });

    it('cada una tiene etiqueta legible', () => {
        CATEGORIAS_CUPON.forEach(c => expect(c.label.length).toBeGreaterThan(3));
    });
});

describe('Suma de los que aplican', () => {
    it('cuenta solo los que califican', () => {
        const carrito = [item('Pack Semanal', 25000), item('Pack Familiar', 30000), item('Otra cosa', 9000)];
        expect(montoQueAplica(carrito, CUPON.aplicaA)).toBe(55000);
        expect(itemsQueAplican(carrito, CUPON.aplicaA)).toHaveLength(2);
    });
});
