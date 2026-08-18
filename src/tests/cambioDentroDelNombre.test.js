import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';

/**
 * Pedidos reales del miércoles 19 de agosto de 2026.
 *
 * El de Glenda traía el cambio escrito DENTRO del nombre del pack. Se guardaba
 * entero como nombre y la columna de Especificaciones de la hoja salía vacía:
 * cocina preparaba el plato del menú sin enterarse del cambio.
 */

const HOY = new Date('2026-08-16T12:00:00');

const GLENDA = `Cliente: Glenda Artavia
Teléfono: Tibas
Lugar: 8345-2491

1 pack vegetariano cambiar tortas de espinaca por pollo en salsa hongos

Precio 22.280

Envío: 3000

Total: 25.280

Entrega:
Miércoles 19 agosto`;

const MARIANA = `Cliente: Mariana Salas Rodríguez
Zona de entrega: Rohrmoser

ENVIAR 2DO MENU DE LA SEMANA PASADA Y DESAYUNOS NO SE ENVIARON EL LUNE

◽pack dos semanas con desayuno gratis
Pack bajo el calorías
Cambiar chayote por crema de vegetales
Precio 87,890

Envío: 6000

Total: ₡ 93,890

Entrega:
Lunes 17 agosto
miercoles 19 agosto entrega despues de medio dia
Lunes 24 agosto`;

describe('Glenda Artavia', () => {
    const p = parseOrderBlock(GLENDA, HOY);

    it('el cambio llega a observaciones, que es lo que lee cocina', () => {
        expect(p.observaciones).toMatch(/cambiar tortas de espinaca por pollo en salsa hongos/i);
    });

    it('sigue siendo un Pack Vegetariano, no un plato suelto', () => {
        expect(p.items[0].nombre).toMatch(/pack vegetariano/i);
    });

    it('aguanta que Teléfono y Lugar vengan invertidos', () => {
        expect(p.telefono).toBe('8345-2491');
        expect(p.zona).toBe('Tibas');
    });

    it('lee el resto', () => {
        expect(p.total).toBe(25280);
        expect(p.costoEnvio).toBe(3000);
        expect(p.fechasEntrega).toEqual(['2026-08-19']);
        expect(p.warnings).toEqual([]);
    });
});

describe('Mariana Salas', () => {
    const p = parseOrderBlock(MARIANA, HOY);

    it('las tres entregas, incluida la del miércoles', () => {
        expect(p.fechasEntrega).toEqual(['2026-08-17', '2026-08-19', '2026-08-24']);
    });

    it('la reposición y el cambio quedan en observaciones', () => {
        expect(p.observaciones).toMatch(/ENVIAR 2DO MENU/i);
        expect(p.observaciones).toMatch(/crema de vegetales/i);
    });

    it('el cambio no se duplica por venir en línea aparte', () => {
        const veces = (p.observaciones.match(/crema de vegetales/gi) || []).length;
        expect(veces).toBe(1);
    });
});

describe('No se inventan cambios donde no los hay', () => {
    const conNombre = (nombre) => parseOrderBlock(
        `Cliente: X\nTeléfono: 88888888\n1 ${nombre}\nPrecio 20.000\nEntrega: Miércoles 19 agosto`, HOY
    ).observaciones;

    it('"Pack Sin Carbos" no genera nota: "sin" es parte del nombre', () => {
        expect(conNombre('Pack Sin Carbos')).toBeFalsy();
    });

    it('un pack normal tampoco', () => {
        expect(conNombre('Pack Keto Mensual')).toBeFalsy();
    });

    it('hace falta el "por" para que cuente como cambio', () => {
        expect(conNombre('Pack Regular cambiar algo')).toBeFalsy();
    });
});
