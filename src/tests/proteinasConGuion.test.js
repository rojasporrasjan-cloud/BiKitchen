import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText.js';

/**
 * Gina escribe las proteinas de un pack de proteinas de dos formas:
 *
 *   Pack de 3 proteinas de 250 g        Pack de Proteinas 3 de 250g
 *   Pollo mechado en salsa criolla      -Pollo a la toscana
 *   Carne mechada de res en salsa       -Pollo caribeno
 *   Pollo en salsa de curry y coco      -Pollo en salsa BBQ
 *
 * La segunda —con guion— no se separaba: las tres proteinas quedaban pegadas
 * dentro del NOMBRE del item y la hoja imprimia una sola linea de "750 g (3
 * porciones)" en vez de una por proteina. Quien empaca no sabia cuales eran.
 *
 * Le paso a Jose Alexander Zuniga y a Nuria Rojas, los dos con entrega el
 * miercoles 2 de setiembre de 2026.
 */
const texto = `Cliente: José Alexander Zúñiga
Teléfono: 71101316
Lugar: Desamparados, San Rafael arriba

Pack de Proteínas 3 de 250g

-Pollo a la toscana
-Pollo caribeño
-Pollo en salsa BBQ
Precio: ¢13,500

Envío: ¢3000

Total: ¢16,500

Entrega:
Miércoles 2 septiembre`;

describe('proteinas escritas con guion', () => {

    it('separa las tres proteinas en vez de pegarlas al nombre', () => {
        const r = parseOrderBlock(texto, new Date('2026-08-31T12:00:00'));
        const item = r.items[0];
        expect(item.proteinas).toEqual([
            'Pollo a la toscana',
            'Pollo caribeño',
            'Pollo en salsa BBQ'
        ]);
    });

    it('el nombre del item queda limpio, sin las proteinas pegadas', () => {
        const r = parseOrderBlock(texto, new Date('2026-08-31T12:00:00'));
        expect(r.items[0].nombre).not.toMatch(/Pollo a la toscana/);
        expect(r.items[0].nombre).toMatch(/Pack de Prote[íi]nas 3 de 250 ?g/i);
    });

    it('sigue leyendo el resto del pedido', () => {
        const r = parseOrderBlock(texto, new Date('2026-08-31T12:00:00'));
        expect(r.cliente).toBe('José Alexander Zúñiga');
        expect(r.telefono).toBe('71101316');
        expect(r.total).toBe(16500);
        expect(r.fechasEntrega).toContain('2026-09-02');
    });

    it('el formato SIN guion sigue funcionando igual', () => {
        const sinGuion = `Cliente: Hazel Cruz Rodríguez
Teléfono: 8418-5572
Lugar: Tres Rios

Pack de 3 proteínas de 250 g
Pollo mechado en salsa criolla
Carne mechada de res en salsa
Pollo en salsa de curry y coco

Precio 13.500
Envío: 3000
Total: 16.500

Entrega:
Miércoles 02 setiembre`;
        const r = parseOrderBlock(sinGuion, new Date('2026-08-31T12:00:00'));
        expect(r.items[0].proteinas).toEqual([
            'Pollo mechado en salsa criolla',
            'Carne mechada de res en salsa',
            'Pollo en salsa de curry y coco'
        ]);
    });
});
